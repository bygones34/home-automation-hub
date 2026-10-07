namespace HomeAutomationHub.Configuration;

public sealed class RuleEngineOptions
{
    public const string SectionName = "RuleEngine";

    public int DebounceSeconds { get; set; } = 10;
}
