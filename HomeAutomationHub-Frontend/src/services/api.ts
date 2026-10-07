import type { DeviceState } from "../types/device";
import type { AutomationRule } from "../types/rule";
import type { TelemetryHistoryResponse } from "../types/telemetry";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5235";

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

export async function fetchRules(): Promise<AutomationRule[]> {
  const res = await fetch(`${BASE}/api/rules`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch rules: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as AutomationRule[];
}

export async function createRule(
  rule: Omit<AutomationRule, "id" | "lastTriggeredUtc">
): Promise<AutomationRule> {
  const res = await fetch(`${BASE}/api/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(rule),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to create rule: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as AutomationRule;
}

export async function deleteRule(id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/rules/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });

  return res.ok;
}

export async function toggleRule(id: string, isEnabled: boolean): Promise<boolean> {
  const res = await fetch(`${BASE}/api/rules/${encodeURIComponent(id)}/toggle?isEnabled=${isEnabled}`, {
    method: "PATCH",
    credentials: "include",
  });

  return res.ok;
}

export async function updateDeviceRoom(deviceId: string, room: string): Promise<boolean> {
  if (!deviceId) throw new Error("deviceId is required");

  const res = await fetch(`${BASE}/api/devices/${encodeURIComponent(deviceId)}/room`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ room }),
    credentials: "include",
  });

  return res.ok;
}

export async function fetchTelemetryHistory(
  deviceId: string,
  range: string = "24h"
): Promise<TelemetryHistoryResponse> {
  if (!deviceId) throw new Error("deviceId is required");

  const res = await fetch(
    `${BASE}/api/devices/${encodeURIComponent(deviceId)}/telemetry/history?range=${encodeURIComponent(range)}`,
    {
      headers: { Accept: "application/json" },
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch telemetry history: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as TelemetryHistoryResponse;
}

