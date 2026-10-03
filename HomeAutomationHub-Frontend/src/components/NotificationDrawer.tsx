import React, { useState } from 'react';
import type { AppNotification } from '../types/notification';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onMarkAsRead,
  onClearAll,
}) => {
  const [filter, setFilter] = useState<'all' | 'rule' | 'system'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'rule') return n.type === 'rule';
    if (filter === 'system') return n.type !== 'rule';
    return true;
  });

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'rule':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Arka Plan Karartma */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sağ Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Panel Başlığı */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-800 rounded-xl text-slate-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Bildirimler</h3>
                <span className="text-xs text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                  title="Tümünü Okundu İşaretle"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Tümünü Temizle"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition ml-1"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtre Butonları */}
          <div className="px-5 py-3 border-b border-slate-800/60 flex items-center gap-2 bg-slate-950/40">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tümü ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('rule')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filter === 'rule'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Otomasyonlar ({notifications.filter((n) => n.type === 'rule').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('system')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filter === 'system'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sistem ({notifications.filter((n) => n.type !== 'rule').length})
            </button>
          </div>

          {/* Bildirim Listesi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-20 text-slate-500 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-sm">Bildirim kaydı bulunmuyor.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative ${
                    notif.read
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-80 hover:opacity-100 hover:border-slate-700'
                      : 'bg-slate-800/50 border-slate-700/80 shadow-xs hover:border-slate-600'
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-xs font-semibold text-slate-100 leading-tight">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                        {new Date(notif.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
