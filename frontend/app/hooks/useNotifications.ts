import { useEffect, useState, useRef, useCallback } from 'react';
import { notificationService, Toast, NotificationSettings, UnreadCounts, UnreadMessages } from '../services/notificationService';

export const useNotifications = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(notificationService.getSettings());
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>(notificationService.getUnreadCounts());
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessages>(notificationService.getUnreadMessages());
  const unreadCountsRef = useRef<UnreadCounts>(unreadCounts);
  const unreadMessagesRef = useRef<UnreadMessages>(unreadMessages);

  useEffect(() => {
    // S'abonner aux changements de toasts
    const unsubscribeToasts = notificationService.onToastsChange((newToasts) => {
      setToasts(newToasts);
    });

    // S'abonner aux changements de compteurs de messages non lus
    const unsubscribeUnreadCounts = notificationService.onUnreadCountsChange((newCounts) => {
      // Comparer les objets pour éviter les re-renders inutiles
      const currentCounts = unreadCountsRef.current;
      const currentKeys = Object.keys(currentCounts);
      const newKeys = Object.keys(newCounts);
      
      // Vérifier si les clés ont changé
      if (currentKeys.length !== newKeys.length) {
        unreadCountsRef.current = newCounts;
        setUnreadCounts(newCounts);
        return;
      }
      
      // Vérifier si les valeurs ont changé
      const hasChanged = newKeys.some(key => 
        newCounts[key] !== currentCounts[key]
      );
      
      // Toujours mettre à jour pour forcer le re-render
      // Créer un nouvel objet pour forcer React à détecter le changement
      const newCountsCopy = { ...newCounts };
      unreadCountsRef.current = newCountsCopy;
      setUnreadCounts(newCountsCopy);
    });

    // S'abonner aux changements de messages non lus par salon
    const unsubscribeUnreadMessages = notificationService.onUnreadMessagesChange((newMessages) => {
      // Comparer les objets pour éviter les re-renders inutiles
      const currentMessages = unreadMessagesRef.current;
      const currentKeys = Object.keys(currentMessages);
      const newKeys = Object.keys(newMessages);
      
      // Vérifier si les clés ont changé
      if (currentKeys.length !== newKeys.length) {
        unreadMessagesRef.current = newMessages;
        setUnreadMessages(newMessages);
        return;
      }
      
      // Vérifier si les valeurs ont changé
      const hasChanged = newKeys.some(key => 
        newMessages[key]?.count !== currentMessages[key]?.count
      );
      
      if (hasChanged) {
        unreadMessagesRef.current = newMessages;
        setUnreadMessages(newMessages);
      }
    });

    return () => {
      unsubscribeToasts();
      unsubscribeUnreadCounts();
      unsubscribeUnreadMessages();
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

  const initializeAudioContext = () => {
    notificationService.initializeAudioContext();
  };

  const isAudioContextInitialized = () => {
    return notificationService.isAudioContextInitialized();
  };

  const onAudioContextChange = (callback: (initialized: boolean) => void) => {
    return notificationService.onAudioContextChange(callback);
  };



  const loadUnreadCounts = useCallback(async (userEmail: string) => {
    await notificationService.loadUnreadCounts(userEmail);
    // console.log("🔔 useNotifications: Compteurs chargés:", JSON.stringify(notificationService.getUnreadCounts(), null, 2));
  }, []);

  const markChannelAsRead = useCallback(async (userEmail: string, channelId: string, serverId: string, messageId?: string, resetCount?: boolean) => {
    await notificationService.markChannelAsRead(userEmail, channelId, serverId, messageId, resetCount);
  }, []);

  // Mémoriser les fonctions de reset pour éviter les re-renders inutiles
  const resetUnreadCount = useCallback((serverId: string) => {
    notificationService.resetUnreadCount(serverId);
  }, []);

  const resetUnreadMessages = useCallback((channelId: string) => {
    notificationService.resetUnreadMessages(channelId);
  }, []);

  return {
    toasts,
    settings,
    unreadCounts,
    unreadMessages,
    addToast,
    removeToast,
    updateSettings,
    requestBrowserPermission,
    initializeAudioContext,
    isAudioContextInitialized,
    onAudioContextChange,
    loadUnreadCounts,
    markChannelAsRead,
    resetUnreadCount,
    resetUnreadMessages
  };
}; 