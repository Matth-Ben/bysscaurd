import { useEffect, useState, useRef } from 'react';
import { notificationService, Toast, NotificationSettings, UnreadCounts } from '../services/notificationService';

export const useNotifications = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(notificationService.getSettings());
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(notificationService.getUnreadCounts());
  const unreadCountsRef = useRef<UnreadCounts>(unreadCounts);

  useEffect(() => {
    // S'abonner aux changements de toasts
    const unsubscribeToasts = notificationService.onToastsChange((newToasts) => {
      setToasts(newToasts);
    });

    // S'abonner aux changements de compteurs de messages non lus
    const unsubscribeUnreadCounts = notificationService.onUnreadCountsChange((newCounts) => {
      // Comparer les objets pour éviter les re-renders inutiles
      const currentCounts = unreadCountsRef.current;
      const hasChanged = Object.keys(newCounts).some(key => 
        newCounts[key] !== currentCounts[key]
      ) || Object.keys(currentCounts).some(key => 
        !(key in newCounts)
      );
      
      if (hasChanged) {
        unreadCountsRef.current = newCounts;
        setUnreadCounts(newCounts);
      }
    });

    return () => {
      unsubscribeToasts();
      unsubscribeUnreadCounts();
    };
  }, []);

  const addToast = (message: string, type: Toast['type'] = 'info', duration?: number) => {
    return notificationService.addToast(message, type, duration);
  };

  const removeToast = (id: string) => {
    notificationService.removeToast(id);
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    notificationService.setSettings(newSettings);
    setSettings(notificationService.getSettings());
  };

  const requestBrowserPermission = async () => {
    const granted = await notificationService.requestBrowserPermission();
    if (granted) {
      addToast("Notifications navigateur activées", 'success');
    }
    return granted;
  };

  return {
    toasts,
    settings,
    unreadCounts,
    addToast,
    removeToast,
    updateSettings,
    requestBrowserPermission,
    resetUnreadCount: notificationService.resetUnreadCount.bind(notificationService)
  };
}; 