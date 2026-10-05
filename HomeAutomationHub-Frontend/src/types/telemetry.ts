export interface TelemetryHistoryPoint {
  timestampUtc: string;
  temperature: number | null;
  humidity: number | null;
  power: number | null;
}

export interface TelemetryHistorySummary {
  minTemperature: number | null;
  maxTemperature: number | null;
  avgTemperature: number | null;
  minHumidity: number | null;
  maxHumidity: number | null;
  avgHumidity: number | null;
  minPower: number | null;
  maxPower: number | null;
  avgPower: number | null;
}

export interface TelemetryHistoryResponse {
  deviceId: string;
  range: '1h' | '24h' | '7d' | string;
  summary: TelemetryHistorySummary;
  dataPoints: TelemetryHistoryPoint[];
}
