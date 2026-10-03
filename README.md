# Home Automation Hub 🏠⚡

A lightweight, real-time Home Automation and IoT management dashboard designed for sub-second telemetry tracking and bi-directional device control. Built with a monorepo architecture leveraging **.NET 10**, **SignalR**, **MQTT (Mosquitto)**, and **React**.

---

## 🚀 Key Features

* **Real-time Synchronization:** Sub-second state updates across all connected clients via ASP.NET Core SignalR websockets.
* **MQTT Telemetry Ingestion:** Background ingestion service consuming telemetry payloads from Eclipse Mosquitto broker topics.
* **Configurable Automation Rule Engine:** Visual rule builder evaluating live sensor telemetry (`GreaterThan`, `LessThan`, `Equals`) with hysteresis cooldown and automated actuator triggering.
* **Live Notifications & History Drawer:** Multi-toast stack with auto-dismiss timers and a slide-over notification history drawer tracking rule executions and system events.
* **Extended Device Controls:** Real-time brightness dimming sliders (1–100%), color temperature presets (warm, neutral, cool), and thermostat target steppers with climate modes (Heat, Cool, Eco).
* **Room & Zone Grouping:** Intelligent room categorization (Salon, Yatak Odası, Mutfak...), room filter pills, dual view modes, and room-level batch master switches (*"Tümünü Aç"* / *"Tümünü Kapat"*).
* **Optimistic UI Updates:** Instant toggle state responsiveness with graceful fallback handling on API communication errors.
* **Modern Dark UI:** Responsive dashboard styled with Tailwind CSS, Lucide icons, and soft rounded component aesthetics.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | .NET 10, ASP.NET Core Web API, SignalR Hub |
| **Messaging** | MQTT (Eclipse Mosquitto via Docker) |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **Icons & UI** | Lucide React |
| **Containerization**| Docker Compose |

---

## 📂 Project Structure

```text
HomeAutomationHub/
├── docker/                        # Mosquitto broker configuration & compose files
├── HomeAutomationHub/             # ASP.NET Core Web API & SignalR Hub
│   ├── Api/                       # Minimal API request models & contracts
│   ├── Core/                      # DeviceState records & in-memory state store
│   ├── Hubs/                      # SignalR real-time event distribution (HomeHub)
│   ├── Models/                    # Automation rule models & operator enums
│   └── Services/                  # MQTT subscriber service & rule engine
├── HomeAutomationHub-Frontend/    # React/Vite Dashboard application
│   ├── src/components/            # UI components (DeviceCard, RoomSection, RulesManager, etc.)
│   ├── src/hooks/                 # Custom state hooks (useDevices, useRules, useNotifications)
│   ├── src/services/              # REST API & WebSocket handlers
│   ├── src/types/                 # TypeScript interfaces (device, rule, notification)
│   └── src/utils/                 # Room categorization & heuristic helpers
└── HomeAutomationHub.slnx         # Solution file
```

---

## 🚦 Getting Started

### Prerequisites
* [.NET 10 SDK](https://dotnet.microsoft.com/)
* [Node.js (LTS)](https://nodejs.org/)
* [Docker Desktop](https://www.docker.com/)

### 1. Start MQTT Broker
```powershell
cd docker
docker compose up -d
```

### 2. Run Backend (.NET 10 API)
```powershell
cd ../HomeAutomationHub
dotnet run --launch-profile https
```
The API starts at `https://localhost:7198` (or `http://localhost:5235`).

### 3. Run Frontend (React + Vite)
```powershell
cd ../HomeAutomationHub-Frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing Device Telemetry

Publish mock sensor telemetry directly via the Mosquitto container:

```powershell
# Living Room Light
docker exec -i mqtt-broker mosquitto_pub -t "home/devices/living-room-light/telemetry" -m '{"state":"ON","temperature":24.5,"humidity":46}'

# Bedroom Climate Sensor
docker exec -i mqtt-broker mosquitto_pub -t "home/devices/bedroom-sensor/telemetry" -m '{"state":"ON","temperature":21.4,"humidity":55}'
```

---

## 🗺 Roadmap

* [x] Configurable automation rule engine with hysteresis cooldown & SignalR event push.
* [x] Live notification toast stack and slide-over event history drawer.
* [x] Extended device controls (brightness dimmers, color temperatures, thermostat setpoints & modes).
* [x] Device grouping by rooms, room filter pills, and zone-based batch master controls.
* [ ] Time-series analytics with interactive temperature & humidity history charts.
* [ ] Persistent storage (SQLite / EF Core) for devices and automation rules across restarts.
* [ ] Authentication and role-based access control.
