import React, { useState, useEffect } from 'react';
import type { DeviceState } from '../types/device';
import {
  Lightbulb,
  Power,
  Thermometer,
  Droplets,
  Radio,
  SunMedium,
  Flame,
  Snowflake,
  Leaf,
  Sliders,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Zap,
} from 'lucide-react';

import { getRoomConfig, ROOM_CATALOG } from '../utils/roomUtils';

interface DeviceCardProps {
  device: DeviceState;
  onToggle: (id: string, currentState: boolean) => void;
  onUpdateSetting?: (id: string, updates: Record<string, any>) => void;
  onAssignRoom?: (id: string, newRoom: string) => void;
  currentRoom?: string;
  isPending?: boolean;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onToggle,
  onUpdateSetting,
  onAssignRoom,
  currentRoom,
  isPending = false,
}) => {
  // raw: '{state:ON,temperature:24.5,humidity:46}' veya doğrudan nesne
  const parseTelemetry = (): Record<string, any> => {
    const telemetryObj = typeof device.telemetry === 'object' && device.telemetry !== null ? device.telemetry : {};
    const rawVal = (telemetryObj as any)?.raw;

    const baseFromRaw: Record<string, any> = {};
    if (typeof rawVal === 'string') {
      const cleaned = rawVal.replace(/[{}]/g, '').trim();
      if (cleaned) {
        cleaned.split(',').forEach((part) => {
          const [k, v] = part.split(':').map((s) => s?.trim().replace(/['"]/g, ''));
          if (k && v !== undefined) {
            const num = Number(v);
            baseFromRaw[k.toLowerCase()] = isNaN(num) ? v : num;
          }
        });
      }
    }

    const normalizedTelemetry: Record<string, any> = {};
    for (const [key, val] of Object.entries(telemetryObj)) {
      if (key !== 'raw') {
        normalizedTelemetry[key.toLowerCase()] = val;
        normalizedTelemetry[key] = val;
      }
    }

    // Güncel telemetri nesnesi, eski raw dizesinden gelen değerlerin üzerine yazar
    return { ...baseFromRaw, ...normalizedTelemetry };
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

  const type = (device.deviceType || '').toLowerCase();
  const id = (device.deviceId || '').toLowerCase();

  const isLight = type.includes('light') || id.includes('light');
  const isThermostat =
    type.includes('thermostat') ||
    type.includes('climate') ||
    id.includes('thermostat') ||
    id.includes('climate') ||
    telemetryData.targettemperature !== undefined;
  const isSensor = (type.includes('sensor') || id.includes('sensor')) && !isLight && !isThermostat;
  const hasExtendedControls = isLight || isThermostat;

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Parlaklık durumu (Işıklar için)
  const currentBrightness = Number(
    telemetryData.brightness ?? telemetryData.bright ?? (isDeviceOn ? 100 : 0)
  );
  const [localBrightness, setLocalBrightness] = useState<number>(currentBrightness);

  // Hedef Sıcaklık durumu (Termostat için)
  const currentTargetTemp = Number(
    telemetryData.targettemperature ??
      telemetryData.targettemp ??
      telemetryData.setpoint ??
      22.0
  );
  const [localTargetTemp, setLocalTargetTemp] = useState<number>(currentTargetTemp);

  // İklim Modu
  const currentMode = String(telemetryData.mode ?? 'heat').toLowerCase();
  const [localMode, setLocalMode] = useState<string>(currentMode);

  // Renk Sıcaklığı (Işıklar için)
  const currentColorTemp = String(telemetryData.colortemp ?? telemetryData.colortemperature ?? 'warm').toLowerCase();
  const [localColorTemp, setLocalColorTemp] = useState<string>(currentColorTemp);

  useEffect(() => {
    setLocalBrightness(currentBrightness);
  }, [currentBrightness]);

  useEffect(() => {
    setLocalTargetTemp(currentTargetTemp);
  }, [currentTargetTemp]);

  useEffect(() => {
    setLocalMode(currentMode);
  }, [currentMode]);

  useEffect(() => {
    setLocalColorTemp(currentColorTemp);
  }, [currentColorTemp]);

  // Cihaz ikon seçimi
  const getDeviceIcon = () => {
    if (isLight) return <Lightbulb className="w-6 h-6" />;
    if (isThermostat) return <Thermometer className="w-6 h-6" />;
    if (isSensor) return <Radio className="w-6 h-6" />;
    return <Power className="w-6 h-6" />;
  };

  const temp = telemetryData.temperature ?? telemetryData.temp;
  const hum = telemetryData.humidity ?? telemetryData.hum;
  const powerWatts = telemetryData.power ?? telemetryData.watts ?? telemetryData.watt;

  const handleBrightnessChange = (value: number) => {
    setLocalBrightness(value);
  };

  const commitBrightnessChange = (value: number) => {
    if (!onUpdateSetting) return;
    onUpdateSetting(device.deviceId, {
      state: value > 0 ? 'ON' : 'OFF',
      brightness: value,
    });
  };

  const handleTargetTempChange = (delta: number) => {
    const next = Math.round((localTargetTemp + delta) * 10) / 10;
    if (next < 16 || next > 30) return;
    setLocalTargetTemp(next);
    if (onUpdateSetting) {
      onUpdateSetting(device.deviceId, {
        targetTemperature: next,
      });
    }
  };

  const commitTargetTempSlider = (val: number) => {
    setLocalTargetTemp(val);
    if (onUpdateSetting) {
      onUpdateSetting(device.deviceId, {
        targetTemperature: val,
      });
    }
  };

  const handleModeChange = (mode: string) => {
    setLocalMode(mode);
    if (onUpdateSetting) {
      onUpdateSetting(device.deviceId, {
        mode,
      });
    }
  };

  const handleColorTempChange = (colorTemp: string) => {
    setLocalColorTemp(colorTemp);
    if (onUpdateSetting) {
      onUpdateSetting(device.deviceId, {
        colorTemp,
        colortemp: colorTemp,
      });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-slate-700 shadow-sm flex flex-col justify-between">
      <div>
        {/* Üst Kısım: İkon, Cihaz Bilgisi, Rozet & Aç/Kapa Butonu */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                isDeviceOn
                  ? isLight
                    ? 'bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/10'
                    : isThermostat
                    ? 'bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/10'
                    : 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {getDeviceIcon()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {device.deviceType || (isLight ? 'Aydınlatma' : isThermostat ? 'İklimlendirme' : 'Cihaz')}
                </span>
                {currentRoom && (
                  <div className="relative inline-flex items-center">
                    {onAssignRoom ? (
                      <select
                        value={currentRoom}
                        onChange={(e) => onAssignRoom(device.deviceId, e.target.value)}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border appearance-none cursor-pointer focus:outline-none ${getRoomConfig(currentRoom).badgeClass}`}
                        title="Odayı Değiştir"
                      >
                        {ROOM_CATALOG.map((r) => (
                          <option key={r.id} value={r.name} className="bg-slate-900 text-slate-200">
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getRoomConfig(currentRoom).badgeClass}`}>
                        {currentRoom}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-100">{device.deviceId}</h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isDeviceOn
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isDeviceOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              {isDeviceOn ? 'Açık' : 'Kapalı'}
            </span>

            <button
              type="button"
              disabled={isPending}
              onClick={() => onToggle(device.deviceId, isDeviceOn)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                isDeviceOn ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              title={isDeviceOn ? 'Kapat' : 'Aç'}
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

          {isLight && isDeviceOn && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/50 px-3 py-1 text-xs font-medium text-amber-300">
                <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                %{localBrightness}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-200">
                <span
                  className={`w-2 h-2 rounded-full ${
                    localColorTemp === 'warm'
                      ? 'bg-amber-400'
                      : localColorTemp === 'neutral'
                      ? 'bg-yellow-100'
                      : 'bg-sky-300'
                  }`}
                />
                {localColorTemp === 'warm'
                  ? 'Sıcak'
                  : localColorTemp === 'neutral'
                  ? 'Doğal'
                  : 'Soğuk'}
              </span>
            </>
          )}

          {isThermostat && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/50 px-3 py-1 text-xs font-medium text-orange-300">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Hedef: {localTargetTemp} °C
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  localMode === 'heat'
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    : localMode === 'cool'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {localMode === 'heat' ? (
                  <Flame className="w-3 h-3 text-orange-400" />
                ) : localMode === 'cool' ? (
                  <Snowflake className="w-3 h-3 text-sky-400" />
                ) : (
                  <Leaf className="w-3 h-3 text-emerald-400" />
                )}
                {localMode === 'heat' ? 'Isıtma' : localMode === 'cool' ? 'Soğutma' : 'Eco'}
              </span>
            </>
          )}

          {powerWatts !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 border border-slate-700/50 px-3 py-1 text-xs font-medium text-emerald-300">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              {powerWatts} W
            </span>
          )}

          {temp === undefined && hum === undefined && !isLight && !isThermostat && (
            <span className="text-xs text-slate-500">Telemetri verisi yok</span>
          )}
        </div>

        {/* Gelişmiş Kontroller Alanı (Accordion / Expandable) */}
        {hasExtendedControls && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/60 rounded-xl px-3 py-2 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Gelişmiş Kontroller</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4 animate-in fade-in duration-200">
                {/* 1. Aydınlatma / Parlaklık & Ton Kontrolleri */}
                {isLight && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                        Parlaklık Ayarı
                      </span>
                      <span className="text-amber-400 font-mono font-semibold">
                        %{localBrightness}
                      </span>
                    </div>

                    {/* Parlaklık Slider */}
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={localBrightness}
                      onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                      onMouseUp={(e) => commitBrightnessChange(Number(e.currentTarget.value))}
                      onTouchEnd={(e) => commitBrightnessChange(Number(e.currentTarget.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />

                    {/* Hızlı Parlaklık Ön Ayarları */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[25, 50, 75, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setLocalBrightness(preset);
                            commitBrightnessChange(preset);
                          }}
                          className={`text-[11px] py-1 rounded-lg font-medium transition cursor-pointer ${
                            localBrightness === preset
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          %{preset}
                        </button>
                      ))}
                    </div>

                    {/* Renk Tonu Seçimi */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="block text-[11px] text-slate-400 mb-1.5">Işık Tonu</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { key: 'warm', label: 'Sıcak (2700K)', color: 'bg-amber-400' },
                          { key: 'neutral', label: 'Doğal (4000K)', color: 'bg-yellow-100' },
                          { key: 'cool', label: 'Soğuk (6500K)', color: 'bg-sky-300' },
                        ].map((tone) => (
                          <button
                            key={tone.key}
                            type="button"
                            onClick={() => handleColorTempChange(tone.key)}
                            className={`flex items-center justify-center gap-1.5 text-[10px] py-1.5 px-2 rounded-lg border transition cursor-pointer ${
                              localColorTemp === tone.key
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold shadow-xs'
                                : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${tone.color}`} />
                            <span className="truncate">{tone.label.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Termostat / İklimlendirme Kontrolleri */}
                {isThermostat && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                        Hedef Sıcaklık
                      </span>
                      <span className="text-orange-400 font-mono font-bold text-sm">
                        {localTargetTemp} °C
                      </span>
                    </div>

                    {/* Stepper Butonları & Slider */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTargetTempChange(-0.5)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer"
                        title="-0.5 °C"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="range"
                        min="16"
                        max="30"
                        step="0.5"
                        value={localTargetTemp}
                        onChange={(e) => setLocalTargetTemp(Number(e.target.value))}
                        onMouseUp={(e) => commitTargetTempSlider(Number(e.currentTarget.value))}
                        onTouchEnd={(e) => commitTargetTempSlider(Number(e.currentTarget.value))}
                        className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
                      />

                      <button
                        type="button"
                        onClick={() => handleTargetTempChange(0.5)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer"
                        title="+0.5 °C"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* İklim Modu Seçici */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="block text-[11px] text-slate-400 mb-1.5">Çalışma Modu</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleModeChange('heat')}
                          className={`flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition cursor-pointer ${
                            localMode === 'heat'
                              ? 'bg-orange-500/20 text-orange-300 border-orange-500/30 font-semibold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5 text-orange-400" />
                          Isıtma
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeChange('cool')}
                          className={`flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition cursor-pointer ${
                            localMode === 'cool'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30 font-semibold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <Snowflake className="w-3.5 h-3.5 text-sky-400" />
                          Soğutma
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeChange('eco')}
                          className={`flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition cursor-pointer ${
                            localMode === 'eco'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                          Eco
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zaman Damgası */}
      <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-800/40 pt-2 flex items-center justify-between">
        <span>Son Güncelleme:</span>
        <span className="font-mono text-slate-400">
          {device.lastUpdatedUtc ? new Date(device.lastUpdatedUtc).toLocaleTimeString() : '-'}
        </span>
      </div>
    </div>
  );
};

export default DeviceCard;