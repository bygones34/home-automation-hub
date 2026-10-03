using System.Text.Json.Serialization;

namespace HomeAutomationHub.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum ComparisonOperator
    {
        GreaterThan,
        LessThan,
        Equals
    }
    public class AutomationRule
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsEnabled { get; set; } = true;

        // Tetikleyici Koşul (Source)
        public string SourceDeviceId { get; set; } = string.Empty;
        public string TelemetryKey { get; set; } = "temperature"; // örn: temperature, humidity
        public ComparisonOperator Operator { get; set; } = ComparisonOperator.GreaterThan;
        public double ThresholdValue { get; set; }

        // Gerçekleşecek Eylem (Target)
        public string TargetDeviceId { get; set; } = string.Empty;
        public string TargetAction { get; set; } = "ON"; // ON / OFF

        public DateTime? LastTriggeredUtc { get; set; }
    }
}
