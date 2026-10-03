import React from 'react';
import type { DeviceState } from '../types/device';
import DeviceCard from './DeviceCard';
import { getRoomConfig } from '../utils/roomUtils';
import { Power, PowerOff } from 'lucide-react';

interface RoomSectionProps {
  roomName: string;
  devices: DeviceState[];
  onToggleDevice: (id: string, currentState: boolean) => void;
  onUpdateSetting?: (id: string, updates: Record<string, any>) => void;
  onAssignRoom?: (id: string, newRoom: string) => void;
  onMasterRoomToggle: (roomName: string, targetState: boolean) => void;
}

export const RoomSection: React.FC<RoomSectionProps> = ({
  roomName,
  devices,
  onToggleDevice,
  onUpdateSetting,
  onAssignRoom,
  onMasterRoomToggle,
}) => {
  const roomConfig = getRoomConfig(roomName);
  const RoomIcon = roomConfig.icon;

  const activeDevices = devices.filter((d) => {
    const raw = (d.telemetry as any)?.raw;
    const isTelemetryOn = typeof raw === 'string' && /state\s*:\s*ON/i.test(raw);
    return d.isActive || (d.telemetry as any)?.state === 'ON' || isTelemetryOn;
  });

  const allOn = activeDevices.length === devices.length && devices.length > 0;
  const anyOn = activeDevices.length > 0;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
      {/* Oda Başlığı & Toplu Kontroller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl bg-slate-950/80 border border-slate-800 ${roomConfig.color}`}>
            <RoomIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">{roomConfig.name}</h3>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${roomConfig.badgeClass}`}>
                {devices.length} Cihaz
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {activeDevices.length > 0 ? `${activeDevices.length} aktif cihaz çalışıyor` : 'Tüm cihazlar kapalı'}
            </span>
          </div>
        </div>

        {/* Oda Düzeyinde Toplu Anahtar / Hızlı Eylemler */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onMasterRoomToggle(roomName, true)}
            disabled={allOn}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            title="Odadaki tüm cihazları aç"
          >
            <Power className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tümünü Aç</span>
          </button>

          <button
            type="button"
            onClick={() => onMasterRoomToggle(roomName, false)}
            disabled={!anyOn}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-600/20 text-slate-300 hover:text-rose-300 border border-slate-700/60 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            title="Odadaki tüm cihazları kapat"
          >
            <PowerOff className="w-3.5 h-3.5 text-rose-400" />
            <span>Tümünü Kapat</span>
          </button>
        </div>
      </div>

      {/* Odadaki Cihaz Kartları Izgarası */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((device) => (
          <DeviceCard
            key={device.deviceId}
            device={device}
            currentRoom={roomName}
            onToggle={onToggleDevice}
            onUpdateSetting={onUpdateSetting}
            onAssignRoom={onAssignRoom}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomSection;
