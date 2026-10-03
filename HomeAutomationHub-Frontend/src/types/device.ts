export interface DeviceState {
  deviceId: string;
  deviceType: string;
  isActive: boolean;
  telemetry: Record<string, any>;
  lastUpdatedUtc: string; // ISO 8601 string
  room?: string;
}
