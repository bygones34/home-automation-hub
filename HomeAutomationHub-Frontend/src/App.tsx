import "./App.css";
import { useDevices } from "./hooks/useDevices";
import DeviceCard from "./components/DeviceCard";

function App() {
  const { connectionStatus, devices, loading, error, toggleDevice } = useDevices();

  // Aktif cihaz sayısını hem isActive hem de telemetry state'ine bakarak hesapla
  const activeCount = devices.filter(d => {
    const raw = (d.telemetry as any)?.raw;
    const isTelemetryOn = typeof raw === 'string' && /state\s*:\s*ON/i.test(raw);
    return d.isActive || (d.telemetry as any)?.state === 'ON' || isTelemetryOn;
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Home Automation Hub</h1>
          <div className="text-sm text-slate-400">Real-time device status</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full inline-block ${
                connectionStatus === "connected"
                  ? "bg-emerald-400 animate-pulse"
                  : connectionStatus === "connecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-500"
              }`}
            />
            <div className="text-sm">
              {connectionStatus === "connected" ? "Bağlı" : connectionStatus === "connecting" ? "Bağlanıyor" : "Kesildi"}
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-slate-800 text-sm">Toplam: {devices.length}</div>
          <div className="px-3 py-1 rounded-full bg-slate-800 text-sm">Aktif: {activeCount}</div>
        </div>
      </header>

      {error && <div className="mb-4 text-red-400">{error}</div>}

      <main>
        {loading ? (
          <div className="text-center py-12">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl p-8 bg-slate-900/60 border border-slate-800/80 text-center">
            <div className="text-lg font-semibold mb-2">No devices found</div>
            <div className="text-sm text-slate-400">Connect devices to the MQTT broker to see them listed here.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((d) => (
              <DeviceCard key={d.deviceId} device={d} onToggle={toggleDevice} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
