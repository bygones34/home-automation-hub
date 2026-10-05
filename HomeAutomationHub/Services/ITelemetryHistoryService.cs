namespace HomeAutomationHub.Services;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public sealed record TelemetryHistoryPoint(
    DateTime TimestampUtc,
    double? Temperature,
    double? Humidity,
    double? Power
);

public sealed record TelemetryHistorySummary(
    double? MinTemperature,
    double? MaxTemperature,
    double? AvgTemperature,
    double? MinHumidity,
    double? MaxHumidity,
    double? AvgHumidity,
    double? MinPower,
    double? MaxPower,
    double? AvgPower
);

public sealed record TelemetryHistoryResponse(
    string DeviceId,
    string Range,
    TelemetryHistorySummary Summary,
    IReadOnlyList<TelemetryHistoryPoint> DataPoints
);

public interface ITelemetryHistoryService
{
    Task RecordTelemetryAsync(string deviceId, IReadOnlyDictionary<string, object> telemetry, DateTime? timestampUtc = null);

    Task<TelemetryHistoryResponse> GetHistoryAsync(string deviceId, string? range = "24h");
}
