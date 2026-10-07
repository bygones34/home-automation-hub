namespace HomeAutomationHub.Configuration;

public sealed class MqttOptions
{
    public const string SectionName = "Mqtt";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 1883;
    public string ClientIdPrefix { get; set; } = "HubCore";
    public int ReconnectDelaySeconds { get; set; } = 5;
    public string TopicPrefix { get; set; } = "home/devices";
}
