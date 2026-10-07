namespace HomeAutomationHub.Core;

using System.Collections.Generic;

public interface IDeviceStateStore
{
    void UpdateState(string deviceId, string deviceType, bool isActive, IReadOnlyDictionary<string, object> telemetry, bool isOnline = true);

    bool UpdateRoom(string deviceId, string room);

    bool SetOnlineStatus(string deviceId, bool isOnline);

    DeviceState? GetState(string deviceId);

    IReadOnlyCollection<DeviceState> GetAllStates();
}
