namespace HomeAutomationHub.Data.Entities;

using System;

public class DeviceEntity
{
    public string DeviceId { get; set; } = string.Empty;
    public string DeviceType { get; set; } = "switch";
    public string? Room { get; set; }
    public bool IsActive { get; set; }
    public string TelemetryJson { get; set; } = "{}";
    public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime FirstSeenUtc { get; set; } = DateTime.UtcNow;
}
