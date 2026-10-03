import { useState, useEffect, useCallback } from 'react';
import type { AutomationRule, RuleTriggeredNotification } from '../types/rule';
import { fetchRules, createRule, deleteRule, toggleRule } from '../services/api';
import { subscribeRuleTriggered } from '../services/signalr';

export function useRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<RuleTriggeredNotification | null>(null);

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRules();
      setRules(data);
    } catch (err: any) {
      setError(err.message || 'Kurallar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();

    const unsubscribe = subscribeRuleTriggered((notification) => {
      setLastNotification(notification);

      // Kuralların lastTriggeredUtc alanını gerçek zamanlı güncelle
      setRules((prev) =>
        prev.map((r) =>
          r.id === notification.ruleId
            ? { ...r, lastTriggeredUtc: notification.triggeredAt }
            : r
        )
      );
    });

    return () => {
      unsubscribe();
    };
  }, [loadRules]);

  const handleCreateRule = async (
    newRule: Omit<AutomationRule, 'id' | 'lastTriggeredUtc'>
  ): Promise<boolean> => {
    try {
      const created = await createRule(newRule);
      setRules((prev) => [...prev, created]);
      return true;
    } catch (err: any) {
      setError(err.message || 'Kural oluşturulamadı');
      return false;
    }
  };

  const handleDeleteRule = async (id: string): Promise<boolean> => {
    // Optimistic remove
    const previousRules = [...rules];
    setRules((prev) => prev.filter((r) => r.id !== id));

    try {
      const success = await deleteRule(id);
      if (!success) {
        setRules(previousRules);
        setError('Kural silinemedi');
        return false;
      }
      return true;
    } catch (err: any) {
      setRules(previousRules);
      setError(err.message || 'Kural silinemedi');
      return false;
    }
  };

  const handleToggleRule = async (id: string, currentState: boolean): Promise<boolean> => {
    const nextState = !currentState;

    // Optimistic toggle
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isEnabled: nextState } : r))
    );

    try {
      const success = await toggleRule(id, nextState);
      if (!success) {
        // Rollback
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isEnabled: currentState } : r))
        );
        setError('Kural durumu değiştirilemedi');
        return false;
      }
      return true;
    } catch (err: any) {
      // Rollback
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isEnabled: currentState } : r))
      );
      setError(err.message || 'Kural durumu değiştirilemedi');
      return false;
    }
  };

  const clearNotification = () => setLastNotification(null);

  return {
    rules,
    loading,
    error,
    lastNotification,
    loadRules,
    createRule: handleCreateRule,
    deleteRule: handleDeleteRule,
    toggleRule: handleToggleRule,
    clearNotification,
  };
}
