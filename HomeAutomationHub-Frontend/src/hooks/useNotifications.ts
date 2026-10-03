import { useState, useEffect, useCallback } from 'react';
import type { AppNotification, NotificationType } from '../types/notification';
import { subscribeNotificationReceived, subscribeRuleTriggered } from '../services/signalr';

const MAX_HISTORY = 100;
const MAX_TOASTS = 4;
const TOAST_TIMEOUT_MS = 5000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = sessionStorage.getItem('hah_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toasts, setToasts] = useState<AppNotification[]>([]);

  // Sync notifications to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('hah_notifications', JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addNotification = useCallback(
    (item: { type: NotificationType; title: string; message: string; meta?: Record<string, any> }) => {
      const newNotification: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: item.type,
        title: item.title,
        message: item.message,
        timestamp: new Date().toISOString(),
        read: false,
        meta: item.meta,
      };

      // Add to history
      setNotifications((prev) => [newNotification, ...prev].slice(0, MAX_HISTORY));

      // Add to visible toasts
      setToasts((prev) => [newNotification, ...prev].slice(0, MAX_TOASTS));

      // Auto dismiss this toast after TOAST_TIMEOUT_MS
      setTimeout(() => {
        dismissToast(newNotification.id);
      }, TOAST_TIMEOUT_MS);
    },
    [dismissToast]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setToasts([]);
    try {
      sessionStorage.removeItem('hah_notifications');
    } catch {
      // ignore
    }
  }, []);

  // Listen to SignalR events
  useEffect(() => {
    const unsubNotification = subscribeNotificationReceived((title, message) => {
      addNotification({
        type: 'info',
        title: title || 'Sistem Bildirimi',
        message: message,
      });
    });

    const unsubRule = subscribeRuleTriggered((rulePayload) => {
      addNotification({
        type: 'rule',
        title: `Otomasyon: ${rulePayload.ruleName}`,
        message: rulePayload.message,
        meta: { ruleId: rulePayload.ruleId },
      });
    });

    return () => {
      unsubNotification();
      unsubRule();
    };
  }, [addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    toasts,
    unreadCount,
    addNotification,
    dismissToast,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
