# Home Automation Hub 🏠⚡

A lightweight, real-time Home Automation and IoT management dashboard designed for sub-second telemetry tracking and bi-directional device control. Built with a monorepo architecture leveraging **.NET 10**, **SignalR**, **MQTT (Mosquitto)**, and **React**.

---

## 🚀 Key Features

* **Real-time Synchronization:** Sub-second state updates across all connected clients via ASP.NET Core SignalR websockets.
* **MQTT Telemetry Ingestion:** Background ingestion service consuming telemetry payloads from Eclipse Mosquitto broker topics.
* **Dynamic Telemetry Badges:** Intelligent parsing of diverse telemetry payloads (temperature, humidity, device states) into structured micro-badges.
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
│   ├── Controllers/               # Device management endpoints
│   ├── Hubs/                      # SignalR real-time event distribution
│   └── Services/                  # MQTT subscriber & device state stores
├── HomeAutomationHub-Frontend/    # React/Vite Dashboard application
│   ├── src/components/            # UI components (DeviceCard, etc.)
│   ├── src/hooks/                 # Custom state & SignalR lifecycle hooks
│   └── src/services/              # REST API & WebSocket service handlers
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

* [ ] Time-series analytics with interactive temperature & humidity history charts.
* [ ] Configurable automation rule engine (e.g., *if temp > 24°C then toggle device*).
* [ ] Device grouping by rooms and zone-based batch controls.
* [ ] Authentication and role-based access control.
