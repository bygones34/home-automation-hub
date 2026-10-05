import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  TrendingUp,
  Thermometer,
  Droplets,
  Zap,
  Calendar,
  AlertCircle,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { fetchTelemetryHistory } from '../services/api';
import type { TelemetryHistoryResponse, TelemetryHistoryPoint } from '../types/telemetry';

interface TelemetryHistoryModalProps {
  deviceId: string | null;
  deviceName?: string;
  roomName?: string;
  onClose: () => void;
}

export const TelemetryHistoryModal: React.FC<TelemetryHistoryModalProps> = ({
  deviceId,
  deviceName,
  roomName,
  onClose,
}) => {
  const [range, setRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TelemetryHistoryResponse | null>(null);

  // Görünür metrik filtreleri
  const [showTemperature, setShowTemperature] = useState<boolean>(true);
  const [showHumidity, setShowHumidity] = useState<boolean>(true);
  const [showPower, setShowPower] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTelemetryHistory(deviceId, range);
      setHistory(data);
    } catch (err: any) {
      setError(err?.message || 'Geçmiş telemetri verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [deviceId, range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Escape tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!deviceId) return null;

  // XAxis zaman biçimlendirmesi
  const formatXAxis = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      if (range === '1h') {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      }
      if (range === '24h') {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      }
      return `${date.getDate()} ${date.toLocaleDateString('tr-TR', { month: 'short' })} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoStr;
    }
  };

  const chartData = (history?.dataPoints || []).map((p: TelemetryHistoryPoint) => ({
    ...p,
    formattedTime: formatXAxis(p.timestampUtc),
  }));

  const hasTempData = chartData.some((p) => p.temperature !== null && p.temperature !== undefined);
  const hasHumData = chartData.some((p) => p.humidity !== null && p.humidity !== undefined);
  const hasPowerData = chartData.some((p) => p.power !== null && p.power !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl flex flex-col">
        {/* Başlık ve Kapat Butonu */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">
                  {deviceName || deviceId}
                </h2>
                {roomName && (
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700/60">
                    {roomName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                ID: {deviceId} • Zaman Serisi Telemetri Analizi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer disabled:opacity-50"
              title="Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zaman Aralığı ve Filtre Seçiciler */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {/* 1h, 24h, 7d Butonları */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => setRange('1h')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                range === '1h'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 Saat
            </button>
            <button
              type="button"
              onClick={() => setRange('24h')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                range === '24h'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24 Saat
            </button>
            <button
              type="button"
              onClick={() => setRange('7d')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                range === '7d'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Gün
            </button>
          </div>

          {/* Göster/Gizle Metrik Hapları */}
          <div className="flex flex-wrap items-center gap-2">
            {hasTempData && (
              <button
                type="button"
                onClick={() => setShowTemperature(!showTemperature)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  showTemperature
                    ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Sıcaklık
              </button>
            )}
            {hasHumData && (
              <button
                type="button"
                onClick={() => setShowHumidity(!showHumidity)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  showHumidity
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Nem
              </button>
            )}
            {hasPowerData && (
              <button
                type="button"
                onClick={() => setShowPower(!showPower)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  showPower
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Güç
              </button>
            )}
          </div>
        </div>

        {/* Hata veya Yükleniyor Durumu */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Özet İstatistik Kartları */}
        {history?.summary && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sıcaklık Özeti */}
            {hasTempData && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-orange-400">
                    <Thermometer className="w-3.5 h-3.5" /> Sıcaklık
                  </span>
                  <span className="text-[11px] text-slate-500">Ort: {history.summary.avgTemperature ?? '-'} °C</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Min:</span>{' '}
                    <span className="text-sm font-semibold text-slate-200">{history.summary.minTemperature ?? '-'} °C</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Maks:</span>{' '}
                    <span className="text-sm font-semibold text-orange-400">{history.summary.maxTemperature ?? '-'} °C</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nem Özeti */}
            {hasHumData && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-sky-400">
                    <Droplets className="w-3.5 h-3.5" /> Nem
                  </span>
                  <span className="text-[11px] text-slate-500">Ort: %{history.summary.avgHumidity ?? '-'}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Min:</span>{' '}
                    <span className="text-sm font-semibold text-slate-200">%{history.summary.minHumidity ?? '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Maks:</span>{' '}
                    <span className="text-sm font-semibold text-sky-400">%{history.summary.maxHumidity ?? '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Güç Özeti */}
            {hasPowerData && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-emerald-400">
                    <Zap className="w-3.5 h-3.5" /> Güç Tüketimi
                  </span>
                  <span className="text-[11px] text-slate-500">Ort: {history.summary.avgPower ?? '-'} W</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Min:</span>{' '}
                    <span className="text-sm font-semibold text-slate-200">{history.summary.minPower ?? '-'} W</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Maks:</span>{' '}
                    <span className="text-sm font-semibold text-emerald-400">{history.summary.maxPower ?? '-'} W</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grafik Alanı */}
        <div className="mt-6 h-[320px] w-full rounded-2xl border border-slate-800/60 bg-slate-950/50 p-4">
          {loading && chartData.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Zaman serisi verileri getiriliyor...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
              <Activity className="w-8 h-8 opacity-40" />
              <span className="text-xs">Bu zaman aralığında telemetri verisi bulunamadı.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="formattedTime"
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                {showTemperature && hasTempData && (
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    name="Sıcaklık (°C)"
                    stroke="#f97316"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTemp)"
                  />
                )}
                {showHumidity && hasHumData && (
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    name="Nem (%)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHum)"
                  />
                )}
                {showPower && hasPowerData && (
                  <Area
                    type="monotone"
                    dataKey="power"
                    name="Güç (W)"
                    stroke="#34d399"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPower)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alt Bilgi */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Kayıt Aralığı: {range === '1h' ? 'Son 1 Saat' : range === '24h' ? 'Son 24 Saat' : 'Son 7 Gün'}</span>
          </div>
          <span>Veriler SQLite kalıcı zaman serisi tablosundan dinamik olarak çekilmektedir.</span>
        </div>
      </div>
    </div>
  );
};

// Özel Tooltip Bileşeni
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const rawPoint = payload[0]?.payload as TelemetryHistoryPoint & { formattedTime: string };
    const fullDate = rawPoint ? new Date(rawPoint.timestampUtc).toLocaleString('tr-TR') : label;

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-medium text-slate-300 border-b border-slate-800 pb-1.5 mb-2">
          {fullDate}
        </p>
        <div className="flex flex-col gap-1">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}:
              </span>
              <span className="font-semibold text-slate-100">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default TelemetryHistoryModal;
