export type ComparisonOperator = 'GreaterThan' | 'LessThan' | 'Equals';

export interface AutomationRule {
  id: string;
  name: string;
  isEnabled: boolean;
  sourceDeviceId: string;
  telemetryKey: string;
  operator: ComparisonOperator;
  thresholdValue: number;
  targetDeviceId: string;
  targetAction: string;
  lastTriggeredUtc?: string | null;
}

export interface RuleTriggeredNotification {
  ruleId: string;
  ruleName: string;
  message: string;
  triggeredAt: string;
}
