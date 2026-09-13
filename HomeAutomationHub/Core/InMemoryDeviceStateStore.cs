namespace HomeAutomationHub.Core;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

public sealed class InMemoryDeviceStateStore : IDeviceStateStore
{
    private readonly ConcurrentDictionary<string, DeviceState> _states = new();

    public void UpdateState(string deviceId, string deviceType, bool isActive, IReadOnlyDictionary<string, object> telemetry)
    {
        if (deviceId is null) throw new ArgumentNullException(nameof(deviceId));
        if (deviceType is null) throw new ArgumentNullException(nameof(deviceType));
        if (telemetry is null) throw new ArgumentNullException(nameof(telemetry));

        var state = new DeviceState(deviceId, deviceType, isActive, telemetry, DateTime.UtcNow);
        _states.AddOrUpdate(deviceId, state, (_, __) => state);
    }

    public DeviceState? GetState(string deviceId)
    {
        if (deviceId is null) throw new ArgumentNullException(nameof(deviceId));
        return _states.TryGetValue(deviceId, out var state) ? state : null;
    }

    public IReadOnlyCollection<DeviceState> GetAllStates()
    {
        // Return a snapshot to avoid exposing internal collection
        return _states.Values.ToList().AsReadOnly();
    }
}
