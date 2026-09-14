using HomeAutomationHub.Models;

namespace HomeAutomationHub.Services.RuleEngine
{
    public interface IRuleEngineService
    {
        IEnumerable<AutomationRule> GetRules();
        AutomationRule AddRule(AutomationRule rule);
        bool DeleteRule(string id);
        bool ToggleRule(string id, bool isEnabled);
        Task EvaluateTelemetryAsync(string deviceId, string rawTelemetry);
    }
}
