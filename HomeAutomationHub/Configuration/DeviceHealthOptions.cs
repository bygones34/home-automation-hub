namespace HomeAutomationHub.Configuration;

public sealed class DeviceHealthOptions
{
    public const string SectionName = "DeviceHealth";

    public int HeartbeatTimeoutSeconds { get; set; } = 120;
    public int ScanIntervalSeconds { get; set; } = 15;
}
