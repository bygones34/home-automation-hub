import React, { useState } from 'react';
import type { AutomationRule, ComparisonOperator } from '../types/rule';
import type { DeviceState } from '../types/device';
import {
  Zap,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  Sliders,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';

interface RulesManagerProps {
  rules: AutomationRule[];
  availableDevices: DeviceState[];
  onCreateRule: (rule: Omit<AutomationRule, 'id' | 'lastTriggeredUtc'>) => Promise<boolean>;
  onDeleteRule: (id: string) => Promise<boolean>;
  onToggleRule: (id: string, currentState: boolean) => Promise<boolean>;
  loading: boolean;
}

export const RulesManager: React.FC<RulesManagerProps> = ({
  rules,
  availableDevices,
  onCreateRule,
  onDeleteRule,
  onToggleRule,
  loading,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sourceDeviceId, setSourceDeviceId] = useState('');
  const [customSourceId, setCustomSourceId] = useState('');
  const [telemetryKey, setTelemetryKey] = useState('temperature');
  const [customTelemetryKey, setCustomTelemetryKey] = useState('');
  const [operator, setOperator] = useState<ComparisonOperator>('GreaterThan');
  const [thresholdValue, setThresholdValue] = useState<string>('24.0');
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [customTargetId, setCustomTargetId] = useState('');
  const [targetAction, setTargetAction] = useState('ON');

  const openModal = () => {
    // Akıllı varsayılanlar
    const firstDev = availableDevices[0]?.deviceId || 'bedroom-sensor';
    const secondDev = availableDevices[1]?.deviceId || availableDevices[0]?.deviceId || 'living-room-light';

    setName('');
    setSourceDeviceId(firstDev);
    setCustomSourceId('');
    setTelemetryKey('temperature');
    setCustomTelemetryKey('');
    setOperator('GreaterThan');
    setThresholdValue('24.0');
    setTargetDeviceId(secondDev);
    setCustomTargetId('');
    setTargetAction('ON');
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalSource = sourceDeviceId === '__custom__' ? customSourceId.trim() : sourceDeviceId;
    const finalTarget = targetDeviceId === '__custom__' ? customTargetId.trim() : targetDeviceId;
    const finalKey = telemetryKey === '__custom__' ? customTelemetryKey.trim() : telemetryKey;
    const numThreshold = parseFloat(thresholdValue);

    if (!name.trim()) {
      setFormError('Lütfen kural için bir isim belirleyin.');
      return;
    }
    if (!finalSource) {
      setFormError('Lütfen kaynak cihazı belirtin.');
      return;
    }
    if (!finalKey) {
      setFormError('Lütfen telemetri anahtarını (örn: temperature) belirtin.');
      return;
    }
    if (isNaN(numThreshold)) {
      setFormError('Lütfen geçerli bir sayısal eşik değeri girin.');
      return;
    }
    if (!finalTarget) {
      setFormError('Lütfen hedef cihazı belirtin.');
      return;
    }

    setSubmitting(true);
    const success = await onCreateRule({
      name: name.trim(),
      isEnabled: true,
      sourceDeviceId: finalSource,
      telemetryKey: finalKey.toLowerCase(),
      operator,
      thresholdValue: numThreshold,
      targetDeviceId: finalTarget,
      targetAction,
    });
    setSubmitting(false);

    if (success) {
      closeModal();
    } else {
      setFormError('Kural oluşturulamadı. Lütfen alanları kontrol edin.');
    }
  };

  const getOperatorLabel = (op: ComparisonOperator) => {
    switch (op) {
      case 'GreaterThan':
        return '> Büyüktür';
      case 'LessThan':
        return '< Küçüktür';
      case 'Equals':
        return '= Eşittir';
      default:
        return op;
    }
  };

  const activeRulesCount = rules.filter((r) => r.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* Üst Bar: Başlık, İstatistik ve Ekle Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-100">Otomasyon Kuralları</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Sensör telemetri koşullarına göre cihazları otomatik tetikleyen kural motoru.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50">
            <span className="text-slate-400">Aktif:</span>
            <span className="font-semibold text-emerald-400">{activeRulesCount}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">Toplam:</span>
            <span className="font-semibold text-slate-200">{rules.length}</span>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition duration-200 shadow-lg shadow-emerald-900/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Kural
          </button>
        </div>
      </div>

      {/* Yükleniyor / Boş Durum / Kurallar Listesi */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Kurallar yükleniyor...</div>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl p-12 bg-slate-900/40 border border-slate-800/80 text-center">
          <Sliders className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-200 mb-1">Henüz Otomasyon Kuralı Yok</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Sensör değerlerinize göre lambaları veya anahtarları otomatik kontrol etmek için yeni bir kural ekleyin.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition border border-slate-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            İlk Kuralı Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-5 ${
                rule.isEnabled
                  ? 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 shadow-sm'
                  : 'border-slate-800/40 bg-slate-950/40 opacity-75'
              }`}
            >
              {/* Kart Başlığı & Durum / Aksiyon Butonları */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-100">{rule.name}</h3>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        rule.isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                      }`}
                    >
                      {rule.isEnabled ? 'Aktif' : 'Devre Dışı'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">ID: {rule.id}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => onToggleRule(rule.id, rule.isEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rule.isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    title={rule.isEnabled ? 'Devre Dışı Bırak' : 'Etkinleştir'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        rule.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {/* Sil Butonu */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`"${rule.name}" kuralını silmek istediğinize emin misiniz?`)) {
                        onDeleteRule(rule.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                    title="Kuralı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Koşul & Eylem Akış Görseli */}
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="text-amber-400 font-medium">Eğer:</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-slate-200">
                    {rule.sourceDeviceId}
                  </span>
                  <span className="text-slate-400">({rule.telemetryKey})</span>
                  <span className="text-amber-300 font-semibold">{getOperatorLabel(rule.operator)}</span>
                  <span className="font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded font-mono">
                    {rule.thresholdValue}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800/50">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-medium">O zaman:</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-slate-200">
                    {rule.targetDeviceId}
                  </span>
                  <span className="text-slate-400">cihazını</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      rule.targetAction === 'ON'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {rule.targetAction}
                  </span>
                  <span className="text-slate-400">yap</span>
                </div>
              </div>

              {/* Alt Bilgi: Son Tetiklenme */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Son Tetiklenme:{' '}
                    {rule.lastTriggeredUtc
                      ? new Date(rule.lastTriggeredUtc).toLocaleTimeString()
                      : 'Henüz tetiklenmedi'}
                  </span>
                </div>
                {rule.lastTriggeredUtc && (
                  <span className="text-emerald-400/80 font-mono text-[10px]">
                    {new Date(rule.lastTriggeredUtc).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Kural Oluşturma Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-slate-100">Yeni Otomasyon Kuralı Ekle</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-200 transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Kural Adı */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kural Adı</label>
                <input
                  type="text"
                  required
                  placeholder="örn: Yatak Odası Aşırı Sıcaklık Koruması"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Koşul Grubu (Tetikleyici) */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Tetikleyici Koşul (Kaynak)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kaynak Cihaz</label>
                    <select
                      value={sourceDeviceId}
                      onChange={(e) => setSourceDeviceId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {availableDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.deviceId} ({d.deviceType || 'cihaz'})
                        </option>
                      ))}
                      <option value="__custom__">-- Manuel Giriş --</option>
                    </select>
                    {sourceDeviceId === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Cihaz ID yazın"
                        value={customSourceId}
                        onChange={(e) => setCustomSourceId(e.target.value)}
                        className="mt-1.5 w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sensör Parametresi</label>
                    <select
                      value={telemetryKey}
                      onChange={(e) => setTelemetryKey(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="temperature">temperature (°C)</option>
                      <option value="humidity">humidity (%)</option>
                      <option value="__custom__">-- Manuel Parametre --</option>
                    </select>
                    {telemetryKey === '__custom__' && (
                      <input
                        type="text"
                        placeholder="örn: battery, co2"
                        value={customTelemetryKey}
                        onChange={(e) => setCustomTelemetryKey(e.target.value)}
                        className="mt-1.5 w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Karşılaştırma</label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value as ComparisonOperator)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="GreaterThan">&gt; Büyüktür</option>
                      <option value="LessThan">&lt; Küçüktür</option>
                      <option value="Equals">= Eşittir</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Eşik Değer</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Hedef Eylem Grubu */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Gerçekleşecek Eylem (Hedef)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hedef Cihaz</label>
                    <select
                      value={targetDeviceId}
                      onChange={(e) => setTargetDeviceId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {availableDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.deviceId} ({d.deviceType || 'cihaz'})
                        </option>
                      ))}
                      <option value="__custom__">-- Manuel Giriş --</option>
                    </select>
                    {targetDeviceId === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Hedef cihaz ID yazın"
                        value={customTargetId}
                        onChange={(e) => setCustomTargetId(e.target.value)}
                        className="mt-1.5 w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Komut / Durum</label>
                    <select
                      value={targetAction}
                      onChange={(e) => setTargetAction(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ON">AÇ (ON)</option>
                      <option value="OFF">KAPAT (OFF)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Önizleme Cümlesi */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-400">Kural Özeti: </span>
                <span className="text-amber-300 font-semibold">
                  Eğer {sourceDeviceId === '__custom__' ? customSourceId || '...' : sourceDeviceId}
                </span>{' '}
                cihazının{' '}
                <span className="text-slate-200">
                  {telemetryKey === '__custom__' ? customTelemetryKey || 'değer' : telemetryKey}
                </span>{' '}
                değeri{' '}
                <span className="text-amber-300 font-semibold">{getOperatorLabel(operator)}</span>{' '}
                <span className="text-white font-mono">{thresholdValue || '0'}</span> ise,{' '}
                <span className="text-emerald-400 font-semibold">
                  {targetDeviceId === '__custom__' ? customTargetId || '...' : targetDeviceId}
                </span>{' '}
                cihazını <span className="text-white font-bold">{targetAction}</span> konumuna getir.
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-900/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Kaydediliyor...' : 'Kuralı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesManager;
