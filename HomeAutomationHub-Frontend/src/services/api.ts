import type { DeviceState } from "../types/device";

const BASE = "http://localhost:5235";

export async function fetchDevices(): Promise<DeviceState[]> {
  const res = await fetch(`${BASE}/api/devices`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch devices: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as DeviceState[];
  return data;
}

export async function sendDeviceCommand(deviceId: string, command: string): Promise<boolean> {
  if (!deviceId) throw new Error("deviceId is required");

  const payload = { command };

  const res = await fetch(`${BASE}/api/devices/${encodeURIComponent(deviceId)}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  return res.ok;
}
