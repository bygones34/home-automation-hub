import { useState, useEffect, useCallback } from 'react';
import type { DeviceState } from '../types/device';
import { fetchDevices, sendDeviceCommand } from '../services/api';
import { connection } from '../services/signalr';
import { HubConnectionState } from '@microsoft/signalr';

export function useDevices() {
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  const loadDevices = useCallback(async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
    } catch (err: any) {
      setError(err.message || 'Cihazlar alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();

    connection.onreconnecting(() => setConnectionStatus('connecting'));
    connection.onreconnected(() => setConnectionStatus('connected'));
    connection.onclose(() => setConnectionStatus('disconnected'));

    const handleDeviceUpdate = (updatedDevice: DeviceState) => {
      setDevices(prev => {
        const index = prev.findIndex(d => d.deviceId === updatedDevice.deviceId);
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedDevice;
          return next;
        }
        return [...prev, updatedDevice];
      });
    };

    connection.on('DeviceStateChanged', handleDeviceUpdate);

    if (connection.state === HubConnectionState.Disconnected) {
      connection.start()
        .then(() => setConnectionStatus('connected'))
        .catch(() => setConnectionStatus('disconnected'));
    } else if (connection.state === HubConnectionState.Connected) {
      setConnectionStatus('connected');
    }

    return () => {
      connection.off('DeviceStateChanged', handleDeviceUpdate);
    };
  }, [loadDevices]);

  const toggleDevice = async (id: string, currentState: boolean) => {
    const nextState = !currentState;
    const nextStateStr = nextState ? 'ON' : 'OFF';

    // Optimistic UI: Hem isActive'i hem de telemetry içindeki raw string'i güncelle
    setDevices(prev => prev.map(d => {
      if (d.deviceId === id) {
        let updatedTelemetry = d.telemetry;
        
        if (typeof d.telemetry === 'object' && d.telemetry !== null) {
          const raw = (d.telemetry as any).raw;
          if (typeof raw === 'string') {
            // raw string içindeki state:ON veya state:OFF değerini anında değiştir
            const newRaw = raw.replace(/state\s*:\s*(ON|OFF)/i, `state:${nextStateStr}`);
            updatedTelemetry = { ...d.telemetry, raw: newRaw, state: nextStateStr };
          } else {
            updatedTelemetry = { ...d.telemetry, state: nextStateStr };
          }
        }

        return {
          ...d,
          isActive: nextState,
          telemetry: updatedTelemetry
        };
      }
      return d;
    }));

    try {
      await sendDeviceCommand(id, nextStateStr);
    } catch {
      // Hata durumunda eski haline geri al
      loadDevices();
    }
  };

  const updateDeviceSetting = async (id: string, updates: Record<string, any>) => {
    // Optimistic UI update
    setDevices(prev => prev.map(d => {
      if (d.deviceId === id) {
        const currentTelemetry = typeof d.telemetry === 'object' && d.telemetry !== null ? { ...d.telemetry } : {};

        // raw dizesi varsa içindeki değerleri de senkronize et
        if (typeof currentTelemetry.raw === 'string') {
          let rawStr = currentTelemetry.raw;
          for (const [key, val] of Object.entries(updates)) {
            const regex = new RegExp(`("${key}"|'${key}'|${key})\\s*:\\s*("[^"]*"|'[^']*'|[^,}]+)`, 'i');
            if (regex.test(rawStr)) {
              rawStr = rawStr.replace(regex, `"${key}":"${val}"`);
            } else {
              rawStr = rawStr.replace(/}$/, `,"${key}":"${val}"}`);
            }
          }
          currentTelemetry.raw = rawStr;
        }

        const updatedTelemetry = {
          ...currentTelemetry,
          ...updates,
        };
        const isActive = updates.state !== undefined ? updates.state === 'ON' || updates.state === true : d.isActive;
        return {
          ...d,
          isActive,
          telemetry: updatedTelemetry,
        };
      }
      return d;
    }));

    try {
      await sendDeviceCommand(id, JSON.stringify(updates));
    } catch {
      loadDevices();
    }
  };

  return {
    devices,
    loading,
    error,
    connectionStatus,
    toggleDevice,
    updateDeviceSetting,
  };
}