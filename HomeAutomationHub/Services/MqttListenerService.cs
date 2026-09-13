namespace HomeAutomationHub.Services;

using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HomeAutomationHub.Core;
using HomeAutomationHub.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MQTTnet;
using MQTTnet.Client;
using MQTTnet.Protocol;

public sealed class MqttListenerService(ILogger<MqttListenerService> logger, IDeviceStateStore deviceStateStore, IHubContext<HomeHub, IHomeClient> hubContext) : BackgroundService
{
    private readonly ILogger<MqttListenerService> _logger = logger;
    private readonly IDeviceStateStore _deviceStateStore = deviceStateStore;
    private readonly IHubContext<HomeHub, IHomeClient> _hubContext = hubContext;

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

            var topic = $"home/devices/{deviceId}/set";
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
                // Ensure connected; if not connected, EnsureConnectedAsync will connect and subscribe
                if (_client == null || !_client.IsConnected)
                {
                    await EnsureConnectedAsync(stoppingToken).ConfigureAwait(false);
                }

                // While connected, pause briefly and continue to monitor connection state
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
                _logger.LogInformation("MQTT client disconnected or failed. Reconnecting in 5s...");
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken).ConfigureAwait(false);
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

        // Attach message handler to receive application messages
        // Prefer the async event if available in this MQTTnet build
        _client.ApplicationMessageReceivedAsync += async e =>
        {
            try
            {
                var topic = e.ApplicationMessage?.Topic ?? string.Empty;
                var payload = e.ApplicationMessage?.Payload == null ? string.Empty : Encoding.UTF8.GetString(e.ApplicationMessage.Payload);
                await ProcessTelemetryAsync(topic, payload).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in MQTT message handler");
            }
        };

        var clientId = $"HubCore-{Guid.NewGuid():N}";
        var options = new MqttClientOptionsBuilder()
            .WithClientId(clientId)
            .WithTcpServer("localhost", 1883)
            .WithCleanSession()
            .Build();

        try
        {
            _logger.LogInformation("Connecting MQTT client {ClientId} to localhost:1883", clientId);
            await _client.ConnectAsync(options, cancellationToken).ConfigureAwait(false);

            _logger.LogInformation("Subscribing to topic home/devices/+/telemetry");
            var topicFilter = new MqttTopicFilterBuilder().WithTopic("home/devices/+/telemetry").WithAtLeastOnceQoS().Build();
            await _client.SubscribeAsync(topicFilter, cancellationToken).ConfigureAwait(false);
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

    // The actual message handling is wired in EnsureConnectedAsync via UseApplicationMessageReceivedHandler.
    // HandleMessageAsync wrapper is not needed.

    // Public helper that can be invoked by an MQTT message handler once topic and
    // payload strings are available. This contains the parsing, state update and
    // broadcast logic.
    public async Task ProcessTelemetryAsync(string topic, string payload)
    {
        if (string.IsNullOrWhiteSpace(topic)) throw new ArgumentException("topic is required", nameof(topic));

        // Expect topic: home/devices/{deviceId}/telemetry
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

        // Determine isActive from telemetry 'state' property supporting multiple runtime types
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

        _deviceStateStore.UpdateState(deviceId, deviceType, isActive, telemetry);

        var updated = _deviceStateStore.GetState(deviceId);
        if (updated != null)
        {
            await _hubContext.Clients.All.DeviceStateChanged(updated).ConfigureAwait(false);
        }
    }
}
