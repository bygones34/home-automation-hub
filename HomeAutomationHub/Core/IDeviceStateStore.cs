namespace HomeAutomationHub.Core;

using System.Collections.Generic;

public interface IDeviceStateStore
{
    void UpdateState(string deviceId, string deviceType, bool isActive, IReadOnlyDictionary<string, object> telemetry);

    bool UpdateRoom(string deviceId, string room);

    DeviceState? GetState(string deviceId);

    IReadOnlyCollection<DeviceState> GetAllStates();
}
