# Home Automation Hub - Backend Copilot Instructions

## 1. Scope & Architecture
- This repository/project contains the **Backend API & IoT Gateway** only.
- Frontend (React + Vite + Tailwind CSS) will reside in a separate project under the same solution and will consume this service via REST APIs and SignalR.
- The backend serves as a headless hub: ingesting hardware messages (MQTT), maintaining thread-safe in-memory state, handling remote commands, and streaming telemetry over WebSockets (SignalR).

## 2. Tech Stack & Hard Constraints
- **Runtime & Language:** .NET 10 (`net10.0`), C# 14
- **API Surface:** ASP.NET Core Minimal APIs only. **Do not create MVC Controllers.**
- **Hardware Communication:** MQTTnet (v4+)
- **Real-Time Streaming:** ASP.NET Core SignalR using strongly-typed hubs (`Hub<T>`)
- **State Store:** In-memory, thread-safe storage (`ConcurrentDictionary` via a Singleton service). No disk I/O or database overhead for real-time sensor streams.
- **Background Processing:** `BackgroundService` for long-running MQTT listeners and reconnection loops.
- **CORS:** Configured to allow local frontend origins (e.g., Vite dev server at `http://localhost:5173`) with credentials enabled for SignalR handshakes.

## 3. C# 14 & Coding Standards
- Use file-scoped namespaces throughout the solution (`namespace HomeAutomationHub.Core;`).
- Prefer primary constructors for classes and dependency injection.
- Use positional `record` types for state snapshots, payloads, and API contracts.
- Nullable reference types are strictly enabled (`<Nullable>enable</Nullable>`). Avoid null-forgiving operators (`!`); handle potential nulls explicitly.
- Always accept and propagate `CancellationToken` in asynchronous operations.

## 4. Inbound & Outbound Data Flow
1. **Inbound (Telemetry):**
   - MQTT Topic: `home/devices/{deviceId}/telemetry`
   - `MqttListenerService` updates `IDeviceStateStore`.
   - Broadcasts the updated state immediately via `IHubContext<HomeHub, IHomeClient>.Clients.All.DeviceStateChanged(state)`.

2. **Outbound (Commands):**
   - REST Endpoint: `POST /api/devices/{deviceId}/command`
   - Publishes JSON command payload to MQTT Topic: `home/devices/{deviceId}/set`.

## 5. Directory Structure
HomeAutomationHub/
├── Core/        # Domain records, interfaces, in-memory state store
├── Hubs/        # Strongly-typed SignalR hubs and client interfaces
├── Services/    # MQTT background service, external integrations
└── Program.cs   # DI registrations, middleware, Minimal API endpoints

## 6. Output Expectations
Keep code concise, clean, and production-ready.

Follow Single Responsibility Principle; do not combine models, hubs, or services into single monolithic files.