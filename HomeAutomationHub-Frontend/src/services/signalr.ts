import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import type { DeviceState } from "../types/device";
import type { RuleTriggeredNotification } from "../types/rule";

const HUB_URL = "http://localhost:5235/hubs/home";

export const connection: HubConnection = new HubConnectionBuilder()
  .withUrl(HUB_URL)
  .withAutomaticReconnect()
  .configureLogging(LogLevel.Information)
  .build();

export async function startConnection(): Promise<void> {
  try {
    if (connection.state === HubConnectionState.Disconnected) {
      await connection.start();
      console.info("SignalR connected");
    }
  } catch (err) {
    console.error("SignalR start failed:", err);
    throw err;
  }
}

export async function ensureSignalRConnected(): Promise<void> {
  try {
    if (connection.state === HubConnectionState.Disconnected) {
      await connection.start();
    }
  } catch (err) {
    console.error("SignalR connection error:", err);
  }
}

export function subscribeDeviceStateChanged(handler: (state: DeviceState) => void): () => void {
  const wrapped = (state: DeviceState) => {
    try {
      handler(state);
    } catch (err) {
      console.error("DeviceStateChanged handler error:", err);
    }
  };

  connection.on("DeviceStateChanged", wrapped);
  return () => {
    try {
      connection.off("DeviceStateChanged", wrapped);
    } catch {
      // ignore
    }
  };
}

export function subscribeRuleTriggered(
  handler: (notification: RuleTriggeredNotification) => void
): () => void {
  const wrapped = (notification: RuleTriggeredNotification) => {
    try {
      handler(notification);
    } catch (err) {
      console.error("RuleTriggered handler error:", err);
    }
  };

  connection.on("RuleTriggered", wrapped);
  return () => {
    try {
      connection.off("RuleTriggered", wrapped);
    } catch {
      // ignore
    }
  };
}

export function subscribeNotificationReceived(
  handler: (title: string, message: string) => void
): () => void {
  const wrapped = (title: string, message: string) => {
    try {
      handler(title, message);
    } catch (err) {
      console.error("NotificationReceived handler error:", err);
    }
  };

  connection.on("NotificationReceived", wrapped);
  return () => {
    try {
      connection.off("NotificationReceived", wrapped);
    } catch {
      // ignore
    }
  };
}

let lifecycleHandlersRegistered = false;
export function registerLifecycleHandlers(
  onReconnecting: () => void,
  onReconnected: () => void,
  onClose: () => void
): void {
  if (lifecycleHandlersRegistered) return;
  try {
    connection.onreconnecting(() => onReconnecting());
    connection.onreconnected(() => onReconnected());
    connection.onclose(() => onClose());
    lifecycleHandlersRegistered = true;
  } catch (err) {
    console.warn("Failed to register lifecycle handlers", err);
  }
}

export function stopAndCleanup(): Promise<void> {
  connection.off("DeviceStateChanged");
  if (connection.state === HubConnectionState.Connected) {
    return connection.stop();
  }
  return Promise.resolve();
}
