export interface NotificationSettings {
  visualNotifications: boolean;
  soundEnabled: boolean;
  browserNotifications: boolean;
  mentionNotifications: boolean;
}

export interface UnreadCounts {
  [channelName: string]: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
}

class NotificationService {
  private toasts: Toast[] = [];
  private toastListeners: Array<(toasts: Toast[]) => void> = [];
  private unreadCounts: UnreadCounts = {};
  private unreadCountListeners: Array<(counts: UnreadCounts) => void> = [];
  private settings: NotificationSettings = {
    visualNotifications: true,
    soundEnabled: true,
    browserNotifications: false,
    mentionNotifications: true
  };
  private isPermissionGranted = false;

  constructor() {
    this.checkBrowserPermission();
  }

  private checkBrowserPermission() {
    if (typeof window !== "undefined" && "Notification" in window) {
      this.isPermissionGranted = Notification.permission === "granted";
    }
  }

  setSettings(settings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): NotificationSettings {
    return this.settings;
  }

  async requestBrowserPermission(): Promise<boolean> {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      this.isPermissionGranted = permission === "granted";
      return this.isPermissionGranted;
    }
    return false;
  }

  // Gestion des toasts
  addToast(message: string, type: Toast['type'] = 'info', duration: number = 5000) {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, message, type, duration };
    
    this.toasts = [...this.toasts, toast];
    this.notifyToastListeners();

    // Auto-remove après la durée spécifiée
    setTimeout(() => {
      this.removeToast(id);
    }, duration);

    return id;
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyToastListeners();
  }

  getToasts(): Toast[] {
    return this.toasts;
  }

  onToastsChange(callback: (toasts: Toast[]) => void) {
    this.toastListeners.push(callback);
    return () => {
      const index = this.toastListeners.indexOf(callback);
      if (index > -1) {
        this.toastListeners.splice(index, 1);
      }
    };
  }

  private notifyToastListeners() {
    this.toastListeners.forEach(listener => listener([...this.toasts]));
  }

  private notifyUnreadCountListeners() {
    this.unreadCountListeners.forEach(listener => listener(this.unreadCounts));
  }

  // Notifications sonores
  playNotificationSound() {
    if (!this.settings.soundEnabled) return;

    if (typeof window !== "undefined" && "AudioContext" in window) {
      try {
        const audioContext = new (window as any).AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.log("Erreur lors de la lecture du son de notification:", error);
      }
    }
  }

  // Notifications navigateur
  showBrowserNotification(title: string, body: string, icon?: string) {
    if (!this.settings.browserNotifications || !this.isPermissionGranted) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        requireInteraction: false
      });
    }
  }

  // Méthode principale pour gérer les notifications de messages
  handleNewMessage(msg: any, currentChannel: string, currentUser: string, accessibleChannels: string[]) {
    console.log("NotificationService: Traitement d'un nouveau message", {
      msg,
      currentChannel,
      currentUser,
      accessibleChannels
    });

    // Incrémenter le compteur de messages non lus si le message n'est pas dans le salon actuel
    if (msg.channel !== currentChannel && msg.user !== currentUser) {
      this.incrementUnreadCount(msg.channel);
    }

    // Vérifier si le message doit déclencher une notification
    const shouldNotify = 
      msg.channel !== currentChannel && 
      msg.user !== currentUser &&
      accessibleChannels.includes(msg.channel);

    if (!shouldNotify) {
      console.log("NotificationService: Message ignoré - conditions non remplies");
      return;
    }

    console.log("NotificationService: Notification déclenchée");

    // Vérifier si c'est une mention
    const isMention = msg.content.includes(`@${currentUser}`);

    // Notifications visuelles (toasts)
    if (this.settings.visualNotifications) {
      if (isMention && this.settings.mentionNotifications) {
        this.addToast(`Vous avez été mentionné dans #${msg.channel}`, 'warning');
      } else {
        this.addToast(`Nouveau message dans #${msg.channel}`, 'info');
      }
    }

    // Notifications sonores
    if (this.settings.soundEnabled) {
      this.playNotificationSound();
    }

    // Notifications navigateur
    if (this.settings.browserNotifications && this.isPermissionGranted) {
      const title = isMention ? `Mention dans #${msg.channel}` : `Nouveau message dans #${msg.channel}`;
      const body = `${msg.user}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
      this.showBrowserNotification(title, body);
    }
  }

  // Gestion des compteurs de messages non lus
  incrementUnreadCount(channelName: string) {
    this.unreadCounts[channelName] = (this.unreadCounts[channelName] || 0) + 1;
    this.notifyUnreadCountListeners();
  }

  resetUnreadCount(channelName: string) {
    this.unreadCounts[channelName] = 0;
    this.notifyUnreadCountListeners();
  }

  getUnreadCounts(): UnreadCounts {
    return this.unreadCounts;
  }

  onUnreadCountsChange(callback: (counts: UnreadCounts) => void) {
    this.unreadCountListeners.push(callback);
    return () => {
      const index = this.unreadCountListeners.indexOf(callback);
      if (index > -1) {
        this.unreadCountListeners.splice(index, 1);
      }
    };
  }
}

// Instance singleton
export const notificationService = new NotificationService();
export default notificationService; 