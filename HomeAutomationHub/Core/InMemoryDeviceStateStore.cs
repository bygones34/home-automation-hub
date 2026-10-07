namespace HomeAutomationHub.Core;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using HomeAutomationHub.Data;
using HomeAutomationHub.Data.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

public sealed class InMemoryDeviceStateStore : IDeviceStateStore
{
    private readonly ConcurrentDictionary<string, DeviceState> _states = new();
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<InMemoryDeviceStateStore> _logger;

    public InMemoryDeviceStateStore(
        IServiceScopeFactory scopeFactory,
        ILogger<InMemoryDeviceStateStore> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        LoadPersistedDevices();
    }

    private void LoadPersistedDevices()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();
            
            // Veritabanının var olduğundan emin ol
            db.Database.EnsureCreated();

            var devices = db.Devices.ToList();
            foreach (var entity in devices)
            {
                var telemetry = DeserializeTelemetry(entity.TelemetryJson);
                var state = new DeviceState(
                    entity.DeviceId,
                    entity.DeviceType,
                    entity.IsActive,
                    telemetry,
                    entity.LastUpdatedUtc,
                    entity.Room,
                    entity.IsOnline);

                _states[entity.DeviceId] = state;
            }

            _logger.LogInformation("Kalıcı SQLite veritabanından {Count} adet cihaz hafızaya yüklendi.", _states.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kayıtlı cihazlar SQLite veritabanından yüklenirken hata oluştu.");
        }
    }

    private static IReadOnlyDictionary<string, object> DeserializeTelemetry(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<string, object>();
        }

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json, options);
            if (dict != null)
            {
                var result = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                foreach (var (k, v) in dict)
                {
                    if (v is JsonElement el)
                    {
                        switch (el.ValueKind)
                        {
                            case JsonValueKind.String:
                                result[k] = el.GetString()!;
                                break;
                            case JsonValueKind.Number:
                                if (el.TryGetInt64(out var l)) result[k] = l;
                                else if (el.TryGetDouble(out var d)) result[k] = d;
                                else result[k] = el.GetRawText();
                                break;
                            case JsonValueKind.True:
                            case JsonValueKind.False:
                                result[k] = el.GetBoolean();
                                break;
                            default:
                                result[k] = el.GetRawText();
                                break;
                        }
                    }
                    else
                    {
                        result[k] = v;
                    }
                }
                return result;
            }
        }
        catch
        {
            // fallback
        }

        return new Dictionary<string, object>();
    }

    public void UpdateState(string deviceId, string deviceType, bool isActive, IReadOnlyDictionary<string, object> telemetry, bool isOnline = true)
    {
        if (deviceId is null) throw new ArgumentNullException(nameof(deviceId));
        if (deviceType is null) throw new ArgumentNullException(nameof(deviceType));
        if (telemetry is null) throw new ArgumentNullException(nameof(telemetry));

        // Telemetriden veya mevcut durumdan oda bilgisini koru
        string? room = null;
        if (telemetry.TryGetValue("room", out var rObj) && rObj is string rStr && !string.IsNullOrWhiteSpace(rStr))
        {
            room = rStr;
        }
        else if (_states.TryGetValue(deviceId, out var existing))
        {
            room = existing.Room;
        }

        var state = new DeviceState(deviceId, deviceType, isActive, telemetry, DateTime.UtcNow, room, isOnline);
        _states.AddOrUpdate(deviceId, state, (_, __) => state);

        // Veritabanına asenkron yaz
        PersistDeviceStateAsync(deviceId, deviceType, isActive, telemetry, room, isOnline);
    }

    public bool SetOnlineStatus(string deviceId, bool isOnline)
    {
        if (string.IsNullOrWhiteSpace(deviceId)) return false;

        if (_states.TryGetValue(deviceId, out var existing))
        {
            if (existing.IsOnline == isOnline)
            {
                return false;
            }

            var updated = new DeviceState(
                existing.DeviceId,
                existing.DeviceType,
                existing.IsActive,
                existing.Telemetry,
                existing.LastUpdatedUtc,
                existing.Room,
                isOnline);

            _states[deviceId] = updated;
            PersistDeviceOnlineStatusAsync(deviceId, isOnline);
            return true;
        }

        return false;
    }

    public bool UpdateRoom(string deviceId, string room)
    {
        if (string.IsNullOrWhiteSpace(deviceId)) return false;

        if (_states.TryGetValue(deviceId, out var existing))
        {
            var updated = new DeviceState(
                existing.DeviceId,
                existing.DeviceType,
                existing.IsActive,
                existing.Telemetry,
                DateTime.UtcNow,
                room,
                existing.IsOnline);

            _states[deviceId] = updated;
            PersistDeviceRoomAsync(deviceId, room);
            return true;
        }

        // Cihaz henüz telemetri göndermediyse bile odayı kaydedip cihazı provizyonla
        var inferredType = deviceId.Contains("light", StringComparison.OrdinalIgnoreCase) ? "light"
            : deviceId.Contains("sensor", StringComparison.OrdinalIgnoreCase) ? "sensor" : "switch";

        var newState = new DeviceState(
            deviceId,
            inferredType,
            false,
            new Dictionary<string, object>(),
            DateTime.UtcNow,
            room,
            true);

        _states[deviceId] = newState;
        PersistDeviceStateAsync(deviceId, inferredType, false, newState.Telemetry, room, true);
        return true;
    }

    private void PersistDeviceStateAsync(string deviceId, string deviceType, bool isActive, IReadOnlyDictionary<string, object> telemetry, string? room, bool isOnline)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();

                var entity = await db.Devices.FindAsync(deviceId);
                var telJson = JsonSerializer.Serialize(telemetry);

                if (entity == null)
                {
                    db.Devices.Add(new DeviceEntity
                    {
                        DeviceId = deviceId,
                        DeviceType = deviceType,
                        Room = room,
                        IsActive = isActive,
                        IsOnline = isOnline,
                        TelemetryJson = telJson,
                        LastUpdatedUtc = DateTime.UtcNow,
                        FirstSeenUtc = DateTime.UtcNow
                    });
                }
                else
                {
                    entity.DeviceType = deviceType;
                    if (!string.IsNullOrEmpty(room)) entity.Room = room;
                    entity.IsActive = isActive;
                    entity.IsOnline = isOnline;
                    entity.TelemetryJson = telJson;
                    entity.LastUpdatedUtc = DateTime.UtcNow;
                }

                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cihaz durumu SQLite veritabanına kaydedilirken hata: {DeviceId}", deviceId);
            }
        });
    }

    private void PersistDeviceOnlineStatusAsync(string deviceId, bool isOnline)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();

                var entity = await db.Devices.FindAsync(deviceId);
                if (entity != null)
                {
                    entity.IsOnline = isOnline;
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cihaz çevrimdışı durumu SQLite veritabanına kaydedilirken hata: {DeviceId}", deviceId);
            }
        });
    }

    private void PersistDeviceRoomAsync(string deviceId, string room)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HomeAutomationDbContext>();

                var entity = await db.Devices.FindAsync(deviceId);
                if (entity != null)
                {
                    entity.Room = room;
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cihaz odası SQLite veritabanına kaydedilirken hata: {DeviceId}", deviceId);
            }
        });
    }

    public DeviceState? GetState(string deviceId)
    {
        if (deviceId is null) throw new ArgumentNullException(nameof(deviceId));
        return _states.TryGetValue(deviceId, out var state) ? state : null;
    }

    public IReadOnlyCollection<DeviceState> GetAllStates()
    {
        return _states.Values.ToList().AsReadOnly();
    }
}
