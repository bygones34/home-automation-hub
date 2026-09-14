namespace HomeAutomationHub.Services.RuleEngine;

using System.Collections.Concurrent;
using HomeAutomationHub.Hubs;
using HomeAutomationHub.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

public class RuleEngineService : IRuleEngineService
{
    private readonly ConcurrentDictionary<string, AutomationRule> _rules = new();
    private readonly IHubContext<HomeHub, IHomeClient> _hubContext;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RuleEngineService> _logger;

    public RuleEngineService(
        IHubContext<HomeHub, IHomeClient> hubContext,
        IServiceProvider serviceProvider,
        ILogger<RuleEngineService> logger)
    {
        _hubContext = hubContext;
        _serviceProvider = serviceProvider;
        _logger = logger;

        var defaultRule = new AutomationRule
        {
            Id = "rule-temp-safety",
            Name = "Yatak Odası Sıcaklık Emniyeti",
            SourceDeviceId = "bedroom-sensor",
            TelemetryKey = "temperature",
            Operator = ComparisonOperator.GreaterThan,
            ThresholdValue = 22.0,
            TargetDeviceId = "living-room-light",
            TargetAction = "ON",
            IsEnabled = true
        };
        _rules.TryAdd(defaultRule.Id, defaultRule);
    }

    public IEnumerable<AutomationRule> GetRules() => _rules.Values;

    public AutomationRule AddRule(AutomationRule rule)
    {
        if (string.IsNullOrEmpty(rule.Id)) rule.Id = Guid.NewGuid().ToString();
        _rules[rule.Id] = rule;
        return rule;
    }

    public bool DeleteRule(string id) => _rules.TryRemove(id, out _);

    public bool ToggleRule(string id, bool isEnabled)
    {
        if (_rules.TryGetValue(id, out var rule))
        {
            rule.IsEnabled = isEnabled;
            return true;
        }
        return false;
    }

    public async Task EvaluateTelemetryAsync(string deviceId, string rawTelemetry)
    {
        var activeRules = _rules.Values.Where(r => r.IsEnabled && r.SourceDeviceId == deviceId).ToList();
        if (!activeRules.Any()) return;

        var values = ParseTelemetryValues(rawTelemetry);

        foreach (var rule in activeRules)
        {
            if (!values.TryGetValue(rule.TelemetryKey.ToLowerInvariant(), out var incomingVal))
                continue;

            bool isTriggered = rule.Operator switch
            {
                ComparisonOperator.GreaterThan => incomingVal > rule.ThresholdValue,
                ComparisonOperator.LessThan => incomingVal < rule.ThresholdValue,
                ComparisonOperator.Equals => Math.Abs(incomingVal - rule.ThresholdValue) < 0.01,
                _ => false
            };

            if (isTriggered)
            {
                if (rule.LastTriggeredUtc.HasValue && (DateTime.UtcNow - rule.LastTriggeredUtc.Value).TotalSeconds < 10)
                    continue;

                rule.LastTriggeredUtc = DateTime.UtcNow;
                _logger.LogInformation("Kural tetiklendi: {RuleName}. Hedef: {TargetDevice} -> {Action}",
                    rule.Name, rule.TargetDeviceId, rule.TargetAction);

                // Scope üzerinden MqttListenerService'e erişip hedef cihaza komut gönder
                using (var scope = _serviceProvider.CreateScope())
                {
                    var mqttService = scope.ServiceProvider.GetService<MqttListenerService>();
                    if (mqttService != null)
                    {
                        await mqttService.PublishCommandAsync(rule.TargetDeviceId, rule.TargetAction);
                    }
                }

                // Ön yüze SignalR bildirimi
                await _hubContext.Clients.All.RuleTriggered(new
                {
                    RuleId = rule.Id,
                    RuleName = rule.Name,
                    Message = $"{rule.Name} tetiklendi: {rule.TargetDeviceId} cihazı {rule.TargetAction} yapıldı.",
                    TriggeredAt = DateTime.UtcNow
                });
            }
        }
    }

    private static Dictionary<string, double> ParseTelemetryValues(string raw)
    {
        var dict = new Dictionary<string, double>();
        try
        {
            var cleaned = raw.Replace("{", "").Replace("}", "").Trim();
            foreach (var part in cleaned.Split(','))
            {
                var kv = part.Split(':');
                if (kv.Length == 2 && double.TryParse(kv[1].Trim().Trim('"', '\''), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var val))
                {
                    dict[kv[0].Trim().ToLowerInvariant().Trim('"', '\'')] = val;
                }
            }
        }
        catch { }
        return dict;
    }
}