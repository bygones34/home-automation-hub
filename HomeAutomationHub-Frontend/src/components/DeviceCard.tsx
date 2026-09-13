import type { FC } from 'react';
import type { DeviceState } from '../types/device';
import { Lightbulb, Power, Thermometer, Droplets, Radio } from 'lucide-react';

interface DeviceCardProps {
  device: DeviceState;
  onToggle: (id: string, currentState: boolean) => void;
  isPending?: boolean;
}

export const DeviceCard: FC<DeviceCardProps> = ({ device, onToggle, isPending = false }) => {
  // raw: '{state:ON,temperature:24.5,humidity:46}' yapısını nesneye dönüştürür
  const parseTelemetry = (): Record<string, any> => {
    const rawVal = (device.telemetry as any)?.raw ?? device.telemetry;

    if (typeof rawVal === 'object' && rawVal !== null) {
      return rawVal;
    }

    if (typeof rawVal === 'string') {
      const cleaned = rawVal.replace(/[{}]/g, '').trim();
      if (!cleaned) return {};

      const result: Record<string, any> = {};
      cleaned.split(',').forEach(part => {
        const [k, v] = part.split(':').map(s => s?.trim().replace(/['"]/g, ''));
        if (k && v !== undefined) {
          const num = Number(v);
          result[k.toLowerCase()] = isNaN(num) ? v : num;
        }
      });
      return result;
    }

    return {};
  };

  const telemetryData = parseTelemetry();

  // Durum kontrolü (state veya isActive)
  const stateVal = telemetryData.state ?? (device.telemetry as any)?.state;
  const isDeviceOn = Boolean(
    device.isActive ||
    stateVal === 'ON' ||
    stateVal === 'on' ||
    stateVal === true
  );

  // Cihaz ikon seçimi
  const getDeviceIcon = () => {
    const type = (device.deviceType || '').toLowerCase();
    const id = (device.deviceId || '').toLowerCase();
    if (type.includes('light') || id.includes('light')) return <Lightbulb className="w-6 h-6" />;
    if (type.includes('sensor') || id.includes('sensor')) return <Radio className="w-6 h-6" />;
    return <Power className="w-6 h-6" />;
  };

  const temp = telemetryData.temperature ?? telemetryData.temp;
  const hum = telemetryData.humidity ?? telemetryData.hum;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        {/* Sol: İkon & İsim */}
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
            isDeviceOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {getDeviceIcon()}
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {device.deviceType || 'Cihaz'}
            </span>
            <h3 className="text-base font-semibold text-slate-100">{device.deviceId}</h3>
          </div>
        </div>

        {/* Sağ: Durum Rozeti & Toggle */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isDeviceOn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isDeviceOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {isDeviceOn ? 'Açık' : 'Kapalı'}
          </span>

          <button
            type="button"
            disabled={isPending}
            onClick={() => onToggle(device.deviceId, isDeviceOn)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
              isDeviceOn ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isDeviceOn ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Telemetri Rozetleri */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        {temp !== undefined && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/50 px-3 py-1 text-xs font-medium text-slate-200">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            {temp} °C
          </span>
        )}

        {hum !== undefined && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/50 px-3 py-1 text-xs font-medium text-slate-200">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            %{hum}
          </span>
        )}

        {temp === undefined && hum === undefined && (
          <span className="text-xs text-slate-500">Telemetri verisi yok</span>
        )}
      </div>

      {/* Zaman Damgası */}
      <div className="mt-2 text-[11px] text-slate-500">
        Son Güncelleme: {device.lastUpdatedUtc ? new Date(device.lastUpdatedUtc).toLocaleTimeString() : '-'}
      </div>
    </div>
  );
};

export default DeviceCard;