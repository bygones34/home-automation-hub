namespace HomeAutomationHub.Services;

using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HomeAutomationHub.Configuration;
using HomeAutomationHub.Core;
using HomeAutomationHub.Hubs;
using HomeAutomationHub.Services.RuleEngine;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Protocol;

public sealed class MqttListenerService(
    ILogger<MqttListenerService> logger,
    IDeviceStateStore deviceStateStore,
    IHubContext<HomeHub, IHomeClient> hubContext,
    IRuleEngineService ruleEngineService,
    ITelemetryHistoryService telemetryHistoryService,
    IOptions<MqttOptions> mqttOptions) : BackgroundService
{
    private readonly ILogger<MqttListenerService> _logger = logger;
    private readonly IDeviceStateStore _deviceStateStore = deviceStateStore;
    private readonly IHubContext<HomeHub, IHomeClient> _hubContext = hubContext;
    private readonly IRuleEngineService _ruleEngineService = ruleEngineService;
    private readonly ITelemetryHistoryService _telemetryHistoryService = telemetryHistoryService;
    private readonly IOptions<MqttOptions> _mqttOptions = mqttOptions;

    private readonly MqttFactory _factory = new();
    private IMqttClient? _client;

    public async Task PublishCommandAsync(string deviceId, string commandPayload, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(deviceId)) throw new ArgumentException("deviceId is required", nameof(deviceId));
        if (commandPayload is null) throw new ArgumentNullException(nameof(commandPayload));

        try
        {
            if (_client == null || !_client.IsConnected)
            {
                _logger.LogInformation("MQTT client not connected. Attempting connect before publish.");
                await EnsureConnectedAsync(cancellationToken).ConfigureAwait(false);
            }

            if (_client == null) throw new InvalidOperationException("MQTT client is not available");

            var topic = $"{_mqttOptions.Value.TopicPrefix}/{deviceId}/set";
            var message = new MqttApplicationMessageBuilder()
                .WithTopic(topic)
                .WithPayload(commandPayload)
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            await _client.PublishAsync(message, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish MQTT command to device {DeviceId}", deviceId);
            throw;
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_client == null || !_client.IsConnected)
                {
                    await EnsureConnectedAsync(stoppingToken).ConfigureAwait(false);
                }

                while (_client != null && _client.IsConnected && !stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken).ConfigureAwait(false);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MQTT listener encountered an error");
            }

            if (!stoppingToken.IsCancellationRequested)
            {
                var delay = _mqttOptions.Value.ReconnectDelaySeconds;
                _logger.LogInformation("MQTT client disconnected or failed. Reconnecting in {Delay}s...", delay);
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(delay), stoppingToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }

    private async Task EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        if (_client != null && _client.IsConnected) return;

        _client ??= _factory.CreateMqttClient();

        _client.ApplicationMessageReceivedAsync += async e =>
        {
            try
            {
                var topic = e.ApplicationMessage?.Topic ?? string.Empty;
                var payload = e.ApplicationMessage?.Payload == null ? string.Empty : Encoding.UTF8.GetString(e.ApplicationMessage.Payload);
                await RouteMessageAsync(topic, payload).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in MQTT message handler");
            }
        };

        var mqttConfig = _mqttOptions.Value;
        var clientId = $"{mqttConfig.ClientIdPrefix}-{Guid.NewGuid():N}";
        var options = new MqttClientOptionsBuilder()
            .WithClientId(clientId)
            .WithTcpServer(mqttConfig.Host, mqttConfig.Port)
            .WithCleanSession()
            .Build();

        try
        {
            _logger.LogInformation("Connecting MQTT client {ClientId} to {Host}:{Port}", clientId, mqttConfig.Host, mqttConfig.Port);
            await _client.ConnectAsync(options, cancellationToken).ConfigureAwait(false);

            _logger.LogInformation("Subscribing to topics {Prefix}/+/telemetry and {Prefix}/+/status", mqttConfig.TopicPrefix, mqttConfig.TopicPrefix);
            var telemetryFilter = new MqttTopicFilterBuilder().WithTopic($"{mqttConfig.TopicPrefix}/+/telemetry").WithAtLeastOnceQoS().Build();
            var statusFilter = new MqttTopicFilterBuilder().WithTopic($"{mqttConfig.TopicPrefix}/+/status").WithAtLeastOnceQoS().Build();
            await _client.SubscribeAsync(telemetryFilter, cancellationToken).ConfigureAwait(false);
            await _client.SubscribeAsync(statusFilter, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect or subscribe MQTT client");
            try
            {
                if (_client.IsConnected)
                {
                    await _client.DisconnectAsync().ConfigureAwait(false);
                }
            }
            catch
            {
                // ignore
            }
            throw;
        }
    }

    private async Task RouteMessageAsync(string topic, string payload)
    {
        if (string.IsNullOrWhiteSpace(topic)) return;

        var parts = topic.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 4 || !string.Equals(parts[0], "home", StringComparison.OrdinalIgnoreCase) || !string.Equals(parts[1], "devices", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Received message on unexpected topic {Topic}", topic);
            return;
        }

        var deviceId = parts[2];
        var action = parts[3];

        if (string.Equals(action, "status", StringComparison.OrdinalIgnoreCase) || string.Equals(action, "availability", StringComparison.OrdinalIgnoreCase))
        {
            await ProcessStatusMessageAsync(deviceId, payload).ConfigureAwait(false);
        }
        else if (string.Equals(action, "telemetry", StringComparison.OrdinalIgnoreCase))
        {
            await ProcessTelemetryAsync(topic, payload).ConfigureAwait(false);
        }
    }

    public async Task ProcessStatusMessageAsync(string deviceId, string payload)
    {
        var clean = (payload ?? string.Empty).Trim();
        bool isOnline = true;

        if (string.Equals(clean, "offline", StringComparison.OrdinalIgnoreCase) ||
            clean.Contains("\"offline\"", StringComparison.OrdinalIgnoreCase) ||
            clean.Contains("0") && clean.Length == 1)
        {
            isOnline = false;
        }

        var changed = _deviceStateStore.SetOnlineStatus(deviceId, isOnline);
        if (changed)
        {
            var updated = _deviceStateStore.GetState(deviceId);
            if (updated != null)
            {
                await _hubContext.Clients.All.DeviceStateChanged(updated).ConfigureAwait(false);
            }

            if (!isOnline)
            {
                await _hubContext.Clients.All.NotificationReceived(
                    "Cihaz Çevrimdışı",
                    $"{deviceId} cihazı MQTT durum bildirimi (LWT) ile çevrimdışı oldu.")
                    .ConfigureAwait(false);

                _logger.LogWarning("MQTT LWT ile cihaz çevrimdışı işaretlendi: {DeviceId}", deviceId);
            }
            else
            {
                await _hubContext.Clients.All.NotificationReceived(
                    "Cihaz Çevrimiçi",
                    $"{deviceId} cihazı sisteme yeniden bağlandı.")
                    .ConfigureAwait(false);

                _logger.LogInformation("MQTT durumu ile cihaz çevrimiçi işaretlendi: {DeviceId}", deviceId);
            }
        }
    }

    public async Task ProcessTelemetryAsync(string topic, string payload)
    {
        if (string.IsNullOrWhiteSpace(topic)) throw new ArgumentException("topic is required", nameof(topic));

        var parts = topic.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 4 || !string.Equals(parts[0], "home", StringComparison.OrdinalIgnoreCase) || !string.Equals(parts[1], "devices", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Received message on unexpected topic {Topic}", topic);
            return;
        }

        var deviceId = parts[2];

        Dictionary<string, object> telemetry;
        try
        {
            if (string.IsNullOrWhiteSpace(payload))
            {
                telemetry = new Dictionary<string, object>();
            }
            else
            {
                var root = JsonSerializer.Deserialize<JsonElement>(payload);
                if (root.ValueKind == JsonValueKind.Object)
                {
                    telemetry = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                    foreach (var prop in root.EnumerateObject())
                    {
                        switch (prop.Value.ValueKind)
                        {
                            case JsonValueKind.String:
                                telemetry[prop.Name] = prop.Value.GetString()!;
                                break;
                            case JsonValueKind.Number:
                                if (prop.Value.TryGetInt64(out var l)) telemetry[prop.Name] = l;
                                else if (prop.Value.TryGetDouble(out var d)) telemetry[prop.Name] = d;
                                else telemetry[prop.Name] = prop.Value.GetRawText();
                                break;
                            case JsonValueKind.True:
                            case JsonValueKind.False:
                                telemetry[prop.Name] = prop.Value.GetBoolean();
                                break;
                            default:
                                telemetry[prop.Name] = prop.Value.GetRawText();
                                break;
                        }
                    }
                }
                else
                {
                    telemetry = new Dictionary<string, object> { ["raw"] = payload };
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse telemetry payload for device {DeviceId}: {Payload}", deviceId, payload);
            telemetry = new Dictionary<string, object> { ["raw"] = payload };
        }

        var isActive = false;
        if (telemetry.TryGetValue("state", out var stateObj))
        {
            if (stateObj is string s)
            {
                isActive = string.Equals(s, "ON", StringComparison.OrdinalIgnoreCase);
            }
            else if (stateObj is JsonElement je && je.ValueKind == JsonValueKind.String)
            {
                isActive = string.Equals(je.GetString(), "ON", StringComparison.OrdinalIgnoreCase);
            }
            else if (stateObj is bool b)
            {
                isActive = b;
            }
        }

        var deviceType = "switch";
        if (telemetry.TryGetValue("type", out var typeObj))
        {
            if (typeObj is string ts && !string.IsNullOrWhiteSpace(ts)) deviceType = ts;
            else if (typeObj is JsonElement tje && tje.ValueKind == JsonValueKind.String)
            {
                var t = tje.GetString();
                if (!string.IsNullOrWhiteSpace(t)) deviceType = t!;
            }
        }

        var existing = _deviceStateStore.GetState(deviceId);
        bool wasOffline = existing != null && !existing.IsOnline;

        _deviceStateStore.UpdateState(deviceId, deviceType, isActive, telemetry, isOnline: true);

        var updated = _deviceStateStore.GetState(deviceId);
        if (updated != null)
        {
            await _hubContext.Clients.All.DeviceStateChanged(updated).ConfigureAwait(false);
        }

        if (wasOffline)
        {
            await _hubContext.Clients.All.NotificationReceived(
                "Cihaz Çevrimiçi",
                $"{deviceId} cihazından yeni telemetri alındı, yeniden çevrimiçi oldu.")
                .ConfigureAwait(false);

            _logger.LogInformation("Telemetri alımı ile cihaz yeniden çevrimiçi oldu: {DeviceId}", deviceId);
        }

        // Zaman serisi geçmiş kaydı tut
        try
        {
            await _telemetryHistoryService.RecordTelemetryAsync(deviceId, telemetry).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Zaman serisi telemetri kaydı tutulurken hata: {DeviceId}", deviceId);
        }

        // Kural motorunu tetikle
        try
        {
            await _ruleEngineService.EvaluateTelemetryAsync(deviceId, payload).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kural motoru çalışırken hata oluştu: {DeviceId}", deviceId);
        }
    }
}