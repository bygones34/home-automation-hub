namespace HomeAutomationHub.Services.RuleEngine;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HomeAutomationHub.Configuration;
using HomeAutomationHub.Data;
using HomeAutomationHub.Data.Entities;
using HomeAutomationHub.Hubs;
using HomeAutomationHub.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

public class RuleEngineService : IRuleEngineService
{
    private readonly ConcurrentDictionary<string, AutomationRule> _rules = new();
    private readonly IHubContext<HomeHub, IHomeClient> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RuleEngineService> _logger;
    private readonly IOptions<RuleEngineOptions> _ruleOptions;

    public RuleEngineService(
        IHubContext<HomeHub, IHomeClient> hubContext,
        IServiceScopeFactory scopeFactory,
        ILogger<RuleEngineService> logger,
        IOptions<RuleEngineOptions> ruleOptions)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _ruleOptions = ruleOptions ?? throw new ArgumentNullException(nameof(ruleOptions));

        LoadPersistedRules();
    }

    private void LoadPersistedRules()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();

            db.Database.EnsureCreated();

            var savedRules = db.Rules.ToList();
            if (savedRules.Count > 0)
            {
                foreach (var entity in savedRules)
                {
                    _rules[entity.Id] = new AutomationRule
                    {
                        Id = entity.Id,
                        Name = entity.Name,
                        IsEnabled = entity.IsEnabled,
                        SourceDeviceId = entity.SourceDeviceId,
                        TelemetryKey = entity.TelemetryKey,
                        Operator = entity.Operator,
                        ThresholdValue = entity.ThresholdValue,
                        TargetDeviceId = entity.TargetDeviceId,
                        TargetAction = entity.TargetAction,
                        LastTriggeredUtc = entity.LastTriggeredUtc,
                    };
                }
                _logger.LogInformation("Kalıcı SQLite veritabanından {Count} adet otomasyon kuralı yüklendi.", _rules.Count);
            }
            else
            {
                // Varsayılan kuralı oluştur ve hem hafızaya hem veritabanına ekle
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

                db.Rules.Add(new AutomationRuleEntity
                {
                    Id = defaultRule.Id,
                    Name = defaultRule.Name,
                    IsEnabled = defaultRule.IsEnabled,
                    SourceDeviceId = defaultRule.SourceDeviceId,
                    TelemetryKey = defaultRule.TelemetryKey,
                    Operator = defaultRule.Operator,
                    ThresholdValue = defaultRule.ThresholdValue,
                    TargetDeviceId = defaultRule.TargetDeviceId,
                    TargetAction = defaultRule.TargetAction,
                    CreatedAtUtc = DateTime.UtcNow
                });
                db.SaveChanges();

                _logger.LogInformation("Varsayılan otomasyon kuralı SQLite veritabanına kaydedildi.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Otomasyon kuralları SQLite veritabanından yüklenirken hata oluştu.");
        }
    }

    public IEnumerable<AutomationRule> GetRules() => _rules.Values;

    public AutomationRule AddRule(AutomationRule rule)
    {
        if (string.IsNullOrEmpty(rule.Id)) rule.Id = Guid.NewGuid().ToString();
        _rules[rule.Id] = rule;

        // SQLite'a kaydet
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();

            var entity = db.Rules.Find(rule.Id);
            if (entity == null)
            {
                db.Rules.Add(new AutomationRuleEntity
                {
                    Id = rule.Id,
                    Name = rule.Name,
                    IsEnabled = rule.IsEnabled,
                    SourceDeviceId = rule.SourceDeviceId,
                    TelemetryKey = rule.TelemetryKey,
                    Operator = rule.Operator,
                    ThresholdValue = rule.ThresholdValue,
                    TargetDeviceId = rule.TargetDeviceId,
                    TargetAction = rule.TargetAction,
                    LastTriggeredUtc = rule.LastTriggeredUtc,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                entity.Name = rule.Name;
                entity.IsEnabled = rule.IsEnabled;
                entity.SourceDeviceId = rule.SourceDeviceId;
                entity.TelemetryKey = rule.TelemetryKey;
                entity.Operator = rule.Operator;
                entity.ThresholdValue = rule.ThresholdValue;
                entity.TargetDeviceId = rule.TargetDeviceId;
                entity.TargetAction = rule.TargetAction;
            }

            db.SaveChanges();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kural SQLite veritabanına eklenirken hata: {RuleId}", rule.Id);
        }

        return rule;
    }

    public bool DeleteRule(string id)
    {
        var removed = _rules.TryRemove(id, out _);

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();
            var entity = db.Rules.Find(id);
            if (entity != null)
            {
                db.Rules.Remove(entity);
                db.SaveChanges();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kural SQLite veritabanından silinirken hata: {RuleId}", id);
        }

        return removed;
    }

    public bool ToggleRule(string id, bool isEnabled)
    {
        if (_rules.TryGetValue(id, out var rule))
        {
            rule.IsEnabled = isEnabled;

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();
                var entity = db.Rules.Find(id);
                if (entity != null)
                {
                    entity.IsEnabled = isEnabled;
                    db.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kural durumu SQLite veritabanında güncellenirken hata: {RuleId}", id);
            }

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
                if (rule.LastTriggeredUtc.HasValue && (DateTime.UtcNow - rule.LastTriggeredUtc.Value).TotalSeconds < _ruleOptions.Value.DebounceSeconds)
                    continue;

                rule.LastTriggeredUtc = DateTime.UtcNow;
                _logger.LogInformation("Kural tetiklendi: {RuleName}. Hedef: {TargetDevice} -> {Action}",
                    rule.Name, rule.TargetDeviceId, rule.TargetAction);

                // Scope üzerinden MqttListenerService'e erişip hedef cihaza komut gönder
                using (var scope = _scopeFactory.CreateScope())
                {
                    var mqttService = scope.ServiceProvider.GetService<MqttListenerService>();
                    if (mqttService != null)
                    {
                        await mqttService.PublishCommandAsync(rule.TargetDeviceId, rule.TargetAction);
                    }
                }

                // SQLite'a tetiklenme zamanını asenkron yaz
                PersistRuleTriggeredUtcAsync(rule.Id, rule.LastTriggeredUtc.Value);

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

    private void PersistRuleTriggeredUtcAsync(string ruleId, DateTime triggeredAt)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();
                var entity = await db.Rules.FindAsync(ruleId);
                if (entity != null)
                {
                    entity.LastTriggeredUtc = triggeredAt;
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Kural tetiklenme zamanı SQLite'a kaydedilemedi: {RuleId}", ruleId);
            }
        });
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