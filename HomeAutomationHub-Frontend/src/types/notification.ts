export type NotificationType = 'rule' | 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO 8601 string
  read: boolean;
  meta?: Record<string, any>;
}
