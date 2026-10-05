import { useState } from "react";
import "./App.css";
import { useDevices } from "./hooks/useDevices";
import { useRules } from "./hooks/useRules";
import { useNotifications } from "./hooks/useNotifications";
import { updateDeviceRoom } from "./services/api";
import DeviceCard from "./components/DeviceCard";
import RoomSection from "./components/RoomSection";
import RulesManager from "./components/RulesManager";
import NotificationToastContainer from "./components/NotificationToastContainer";
import NotificationDrawer from "./components/NotificationDrawer";
import TelemetryHistoryModal from "./components/TelemetryHistoryModal";
import { resolveDeviceRoom, getRoomConfig } from "./utils/roomUtils";
import {
  LayoutGrid,
  Zap,
  Bell,
  ShieldAlert,
  Layers,
  Home,
} from "lucide-react";

function App() {
  const {
    connectionStatus,
    devices,
    loading: devicesLoading,
    error: devicesError,
    toggleDevice,
    updateDeviceSetting,
  } = useDevices();
  const {
    rules,
    loading: rulesLoading,
    error: rulesError,
    createRule,
    deleteRule,
    toggleRule,
  } = useRules();
  const {
    notifications,
    toasts,
    unreadCount,
    dismissToast,
    markAsRead,
    markAllAsRead,
    clearAll: clearAllNotifications,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'devices' | 'rules'>('devices');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [historyDeviceId, setHistoryDeviceId] = useState<string | null>(null);

  // Oda yönetimi state'leri
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');
  const [roomOverrides, setRoomOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('hah_room_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleAssignRoom = (deviceId: string, newRoom: string) => {
    setRoomOverrides((prev) => {
      const next = { ...prev, [deviceId]: newRoom };
      try {
        localStorage.setItem('hah_room_overrides', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    // Veritabanına da asenkron kaydet
    updateDeviceRoom(deviceId, newRoom).catch(() => {});
  };

  // Aktif cihaz sayısını hem isActive hem de telemetry state'ine bakarak hesapla
  const activeCount = devices.filter((d) => {
    const raw = (d.telemetry as any)?.raw;
    const isTelemetryOn = typeof raw === 'string' && /state\s*:\s*ON/i.test(raw);
    return d.isActive || (d.telemetry as any)?.state === 'ON' || isTelemetryOn;
  }).length;

  const activeRulesCount = rules.filter((r) => r.isEnabled).length;

  // Cihazları ve odalarını haritalama
  const devicesWithRooms = devices.map((d) => ({
    device: d,
    room: resolveDeviceRoom(d, roomOverrides),
  }));

  // Mevcut odalar listesi ve cihaz sayıları
  const roomCounts: Record<string, number> = {};
  devicesWithRooms.forEach(({ room }) => {
    roomCounts[room] = (roomCounts[room] || 0) + 1;
  });
  const presentRooms = Object.keys(roomCounts).sort();

  // Filtrelenmiş cihazlar
  const filteredDevicesWithRooms =
    selectedRoom === 'all'
      ? devicesWithRooms
      : devicesWithRooms.filter(({ room }) => room === selectedRoom);

  // Odaya göre gruplama
  const groupedRooms: Record<string, typeof devices> = {};
  filteredDevicesWithRooms.forEach(({ device, room }) => {
    if (!groupedRooms[room]) groupedRooms[room] = [];
    groupedRooms[room].push(device);
  });

  // Oda Düzeyinde Toplu Kontrol (Master Switch)
  const handleMasterRoomToggle = (roomName: string, targetState: boolean) => {
    const targetDevices = devices.filter(
      (d) => resolveDeviceRoom(d, roomOverrides) === roomName
    );

    targetDevices.forEach((d) => {
      const isCurrentlyOn = Boolean(
        d.isActive ||
          (d.telemetry as any)?.state === 'ON' ||
          (typeof (d.telemetry as any)?.raw === 'string' &&
            /state\s*:\s*ON/i.test((d.telemetry as any).raw))
      );

      if (isCurrentlyOn !== targetState) {
        toggleDevice(d.deviceId, isCurrentlyOn);
      }
    });
  };

  // Seçili geçmiş analiz cihazı
  const selectedHistoryDevice = devices.find((d) => d.deviceId === historyDeviceId);
  const selectedHistoryDeviceRoom = selectedHistoryDevice
    ? resolveDeviceRoom(selectedHistoryDevice, roomOverrides)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Üst Başlık & Sistem Durumu */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Home Automation Hub</h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              v1.2
            </span>
          </div>
          <div className="text-sm text-slate-400 mt-0.5">
            Gerçek zamanlı MQTT telemetri izleme ve oda bazlı otomasyon yönetim merkezi
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bağlantı Durumu */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full">
            <span
              className={`w-2.5 h-2.5 rounded-full inline-block ${
                connectionStatus === "connected"
                  ? "bg-emerald-400 animate-pulse"
                  : connectionStatus === "connecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-500"
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {connectionStatus === "connected" ? "Bağlı" : connectionStatus === "connecting" ? "Bağlanıyor" : "Kesildi"}
            </span>
          </div>

          {/* Cihaz Özeti */}
          <div className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            Cihazlar: <span className="font-semibold text-slate-100">{devices.length}</span> ({activeCount} Aktif)
          </div>

          {/* Kural Özeti */}
          <div className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            Kurallar: <span className="font-semibold text-slate-100">{rules.length}</span> ({activeRulesCount} Aktif)
          </div>

          {/* Bildirim Çanı Butonu */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="relative p-2 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Bildirim Geçmişi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Ana Navigasyon Sekmeleri */}
      <nav className="flex items-center gap-2 mb-6 border-b border-slate-800/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
            activeTab === 'devices'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Cihazlar &amp; Odalar</span>
          <span className="ml-1 text-xs bg-slate-950/60 px-2 py-0.5 rounded-full text-slate-300 font-mono">
            {devices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-slate-800 text-amber-400 border border-slate-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Otomasyon Kuralları</span>
          <span className="ml-1 text-xs bg-slate-950/60 px-2 py-0.5 rounded-full text-slate-300 font-mono">
            {rules.length}
          </span>
        </button>
      </nav>

      {/* Hata Bildirimi */}
      {(devicesError || rulesError) && (
        <div className="mb-6 flex items-center gap-3 bg-red-950/50 border border-red-800/60 text-red-300 p-4 rounded-2xl text-sm">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{devicesError || rulesError}</span>
        </div>
      )}

      {/* Ana İçerik */}
      <main>
        {activeTab === 'devices' ? (
          <div className="space-y-6">
            {/* Oda Filtreleme & Görünüm Modu Çubuğu */}
            {devices.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-md">
                {/* Oda Filtre Hapları */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedRoom('all')}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium shrink-0 transition cursor-pointer ${
                      selectedRoom === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Tüm Odalar</span>
                    <span className="text-[10px] bg-slate-950/50 px-1.5 py-0.2 rounded-full font-mono">
                      {devices.length}
                    </span>
                  </button>

                  {presentRooms.map((roomName) => {
                    const rConfig = getRoomConfig(roomName);
                    const RIcon = rConfig.icon;
                    const isSelected = selectedRoom === roomName;
                    return (
                      <button
                        key={roomName}
                        type="button"
                        onClick={() => setSelectedRoom(roomName)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium shrink-0 transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <RIcon className="w-3.5 h-3.5" />
                        <span>{roomName}</span>
                        <span className="text-[10px] bg-slate-950/50 px-1.5 py-0.2 rounded-full font-mono">
                          {roomCounts[roomName]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Görünüm Değiştirici Butonları */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('grouped')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      viewMode === 'grouped'
                        ? 'bg-slate-800 text-emerald-400 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Odalara göre grupla"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Oda Gruplu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-slate-800 text-emerald-400 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Düz ızgara görünümü"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Düz Izgara</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cihazlar Listesi */}
            {devicesLoading ? (
              <div className="text-center py-16 text-slate-400">Cihazlar taranıyor...</div>
            ) : devices.length === 0 ? (
              <div className="rounded-2xl p-10 bg-slate-900/60 border border-slate-800/80 text-center max-w-lg mx-auto">
                <div className="text-lg font-semibold mb-2 text-slate-200">Cihaz Bulunamadı</div>
                <div className="text-sm text-slate-400 mb-4">
                  MQTT broker üzerinden telemetri mesajı gönderildiğinde cihazlar otomatik olarak listelenecektir.
                </div>
                <div className="text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-400 text-left">
                  home/devices/{'<deviceId>'}/telemetry
                </div>
              </div>
            ) : viewMode === 'grouped' ? (
              /* 1. Odalara Göre Gruplanmış Görünüm */
              <div className="space-y-6">
                {Object.keys(groupedRooms).map((roomName) => (
                  <RoomSection
                    key={roomName}
                    roomName={roomName}
                    devices={groupedRooms[roomName]}
                    onToggleDevice={toggleDevice}
                    onUpdateSetting={updateDeviceSetting}
                    onAssignRoom={handleAssignRoom}
                    onOpenHistory={(id) => setHistoryDeviceId(id)}
                    onMasterRoomToggle={handleMasterRoomToggle}
                  />
                ))}
              </div>
            ) : (
              /* 2. Düz Izgara Görünümü */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDevicesWithRooms.map(({ device, room }) => (
                  <DeviceCard
                    key={device.deviceId}
                    device={device}
                    currentRoom={room}
                    onToggle={toggleDevice}
                    onUpdateSetting={updateDeviceSetting}
                    onAssignRoom={handleAssignRoom}
                    onOpenHistory={(id) => setHistoryDeviceId(id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <RulesManager
            rules={rules}
            availableDevices={devices}
            onCreateRule={createRule}
            onDeleteRule={deleteRule}
            onToggleRule={toggleRule}
            loading={rulesLoading}
          />
        )}
      </main>

      {/* Çoklu Kayan Bildirim Kutuları (Live Toast Stack) */}
      <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sağ Yan Bildirim Geçmişi Paneli (Notification History Drawer) */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
        onClearAll={clearAllNotifications}
      />

      {/* Zaman Serisi Telemetri ve Trend Grafiği Modalı */}
      {historyDeviceId && (
        <TelemetryHistoryModal
          deviceId={historyDeviceId}
          deviceName={selectedHistoryDevice?.deviceId}
          roomName={selectedHistoryDeviceRoom}
          onClose={() => setHistoryDeviceId(null)}
        />
      )}
    </div>
  );
}

export default App;
