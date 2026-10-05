namespace HomeAutomationHub.Data.Entities;

using System;

public class TelemetryRecordEntity
{
    public long Id { get; set; }

    public string DeviceId { get; set; } = string.Empty;

    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    public double? Temperature { get; set; }

    public double? Humidity { get; set; }

    public double? Power { get; set; }

    public double? TargetTemperature { get; set; }

    public double? Brightness { get; set; }
}
