namespace HomeAutomationHub.Core;

using System;
using System.Collections.Generic;

public sealed record DeviceState(
    string DeviceId,
    string DeviceType,
    bool IsActive,
    IReadOnlyDictionary<string, object> Telemetry,
    DateTime LastUpdatedUtc);
