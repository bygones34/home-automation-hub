import React from 'react';
import type { AppNotification } from '../types/notification';
import { Zap, Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

interface NotificationToastContainerProps {
  toasts: AppNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  const getToastConfig = (type: AppNotification['type']) => {
    switch (type) {
      case 'rule':
        return {
          icon: <Zap className="w-4 h-4 text-amber-400" />,
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          borderClass: 'border-amber-500/40 shadow-amber-950/20',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          borderClass: 'border-emerald-500/40 shadow-emerald-950/20',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
          badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          borderClass: 'border-orange-500/40 shadow-orange-950/20',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          borderClass: 'border-rose-500/40 shadow-rose-950/20',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-4 h-4 text-sky-400" />,
          badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          borderClass: 'border-sky-500/40 shadow-sky-950/20',
        };
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const config = getToastConfig(toast.type);
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-slate-900/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in ${config.borderClass}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 border ${config.badgeClass}`}>
                {config.icon}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-xs font-bold text-slate-100 truncate">{toast.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                  {toast.message}
                </p>
                <span className="text-[10px] text-slate-500 font-mono mt-1.5 block">
                  {new Date(toast.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800"
                title="Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToastContainer;
