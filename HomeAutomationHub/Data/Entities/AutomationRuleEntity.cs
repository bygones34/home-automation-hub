namespace HomeAutomationHub.Data.Entities;

using System;
using HomeAutomationHub.Models;

public class AutomationRuleEntity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;

    // Tetikleyici Koşul (Source)
    public string SourceDeviceId { get; set; } = string.Empty;
    public string TelemetryKey { get; set; } = "temperature";
    public ComparisonOperator Operator { get; set; } = ComparisonOperator.GreaterThan;
    public double ThresholdValue { get; set; }

    // Gerçekleşecek Eylem (Target)
    public string TargetDeviceId { get; set; } = string.Empty;
    public string TargetAction { get; set; } = "ON";

    public DateTime? LastTriggeredUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
