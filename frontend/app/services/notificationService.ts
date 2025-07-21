export interface NotificationSettings {
  visualNotifications: boolean;
  soundEnabled: boolean;
  browserNotifications: boolean;
  mentionNotifications: boolean;
}

export interface UnreadCounts {
  [serverId: string]: number;
}

export interface UnreadMessages {
  [channelId: string]: {
    count: number;
    lastMessageId: string;
    lastMessageTime: string;
  };
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
  private unreadMessages: UnreadMessages = {};
  private unreadMessagesListeners: Array<(messages: UnreadMessages) => void> = [];
  private settings: NotificationSettings = {
    visualNotifications: true,
    soundEnabled: true,
    browserNotifications: false,
    mentionNotifications: true
  };
  private isPermissionGranted = false;
  private userServers: string[] = [];
  
  // État actuel de l'utilisateur (comme Discord)
  private currentServerId: string = '';
  private currentChannelId: string = '';
  private currentUser: string = '';
  private isInitialized: boolean = false;
  private userChannels: { [channelId: string]: boolean } = {}; // Accès aux salons
  private isAutoSelecting: boolean = false; // Flag pour la sélection automatique
  private audioContext: any = null; // AudioContext global
  private audioContextInitialized: boolean = false; // Flag pour l'initialisation audio
  private audioContextListeners: Array<(initialized: boolean) => void> = []; // Listeners pour l'état audio

  constructor() {
    this.checkBrowserPermission();
  }

  private checkBrowserPermission() {
    if (typeof window !== "undefined" && "Notification" in window) {
      this.isPermissionGranted = Notification.permission === "granted";
    }
  }

  // Initialiser le service avec les informations de l'utilisateur
  initialize(userEmail: string, servers: string[]) {
    this.currentUser = userEmail;
    this.userServers = servers;
    this.isInitialized = true;
  }

  // Mettre à jour la position actuelle de l'utilisateur
  updateCurrentPosition(serverId: string, channelId: string) {
    const oldServerId = this.currentServerId;
    const oldChannelId = this.currentChannelId;
    
    this.currentServerId = serverId;
    this.currentChannelId = channelId;
  }

  // Activer le mode sélection automatique
  setAutoSelecting(enabled: boolean) {
    this.isAutoSelecting = enabled;
  }

  // Mettre à jour les serveurs accessibles (après chargement)
  updateUserServers(servers: string[]) {
    this.userServers = servers;
  }

  // Mettre à jour les salons accessibles à l'utilisateur
  updateUserChannels(channels: { _id: string; isPrivate: boolean; allowedRoles?: string[] }[]) {
    this.userChannels = {};
    channels.forEach(channel => {
      // Pour l'instant, on considère que l'utilisateur a accès à tous les salons non-privés
      // et aux salons privés s'il a les rôles appropriés (à implémenter plus tard)
      this.userChannels[channel._id] = !channel.isPrivate;
    });
  }

  setSettings(settings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): NotificationSettings {
    return this.settings;
  }

  // Charger les compteurs de messages non lus depuis le backend
  async loadUnreadCounts(userEmail: string) {
    try {
      // Charger les compteurs depuis le backend
      const response = await fetch(`http://localhost:4000/users/${encodeURIComponent(userEmail)}/unread-counts`);
      
      if (response.ok) {
        const counts = await response.json();
        
        // Extraire les compteurs du format backend {unreadCounts: {...}}
        const actualCounts = counts.unreadCounts || counts;
        
        // Mettre à jour les compteurs locaux
        this.unreadCounts = actualCounts;
        this.notifyUnreadCountListeners();
      } else {
        console.error("🔔 NotificationService: Erreur lors du chargement des compteurs:", response.status);
      }
    } catch (error) {
      console.error("🔔 NotificationService: Erreur lors du chargement des compteurs:", error);
    }
  }

  // Marquer un salon comme lu
  async markChannelAsRead(userEmail: string, channelId: string, serverId: string, messageId?: string, resetCount: boolean = true) {
    // Réinitialiser le compteur local pour ce serveur seulement si demandé
    if (resetCount) {
      this.resetUnreadCount(serverId);
    }
    this.resetUnreadMessages(channelId);
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

    try {
      this.playWebAudioSound();
    } catch (error) {
      console.error("🔔 NotificationService: Erreur Web Audio:", error);
    }
  }

  // Initialiser l'AudioContext lors de la première interaction utilisateur
  initializeAudioContext() {
    if (this.audioContextInitialized) return;
    
    if (typeof window !== "undefined" && "AudioContext" in window) {
      try {
        this.audioContext = new (window as any).AudioContext();
        this.audioContextInitialized = true;
        
        // Notifier les listeners
        this.audioContextListeners.forEach(listener => listener(true));
      } catch (error) {
        console.error("🔔 NotificationService: Erreur initialisation AudioContext:", error);
      }
    }
  }

  // Vérifier si l'AudioContext est initialisé
  isAudioContextInitialized(): boolean {
    return this.audioContextInitialized;
  }

  // S'abonner aux changements d'état de l'AudioContext
  onAudioContextChange(callback: (initialized: boolean) => void) {
    this.audioContextListeners.push(callback);
    return () => {
      const index = this.audioContextListeners.indexOf(callback);
      if (index > -1) {
        this.audioContextListeners.splice(index, 1);
      }
    };
  }

  // Fallback vers l'API Web Audio
    private playWebAudioSound() {
    if (!this.audioContextInitialized) {
      this.initializeAudioContext();
      
      // Attendre un peu puis réessayer
      setTimeout(() => {
        if (this.audioContextInitialized) {
          this.playWebAudioSound();
        }
      }, 100);
      return;
    }

    if (this.audioContext) {
      // Résumer l'AudioContext si il est suspendu (nécessaire après interaction utilisateur)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          this.playWebAudioSoundInternal();
        }).catch((error: any) => {
          console.error("🔔 NotificationService: Erreur résumption AudioContext:", error);
        });
      } else {
        this.playWebAudioSoundInternal();
      }
    }
  }

  private playWebAudioSoundInternal() {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
          oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
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

  // Méthode principale pour gérer les notifications de messages (style Discord)
  handleNewMessage(msg: any) {
    if (!this.isInitialized) {
      return;
    }

    const messageServerId = msg.serverId;
    const messageChannelId = msg.channelId || msg.channel;
    const messageUser = msg.user;



    // 1. Ignorer nos propres messages
    if (messageUser === this.currentUser) {
      return;
    }

    // 2. Vérifier l'accès au serveur (mais permettre les notifications pendant le chargement)
    if (this.userServers.length > 0 && !this.userServers.includes(messageServerId)) {
      return;
    }

    // 3. Vérifier l'accès au salon (pour les salons privés)
    if (this.userChannels.hasOwnProperty(messageChannelId) && !this.userChannels[messageChannelId]) {
      return;
    }

    // 3. NOUVELLE LOGIQUE : Notification si on n'est pas dans le même salon du même serveur
    const isInSameChannel = this.currentChannelId === messageChannelId;
    const isInSameServer = this.currentServerId === messageServerId;

    // Notification si on n'est PAS dans le même salon du même serveur
    // Cela inclut :
    // - Pas dans le même salon (même serveur ou serveur différent)
    // - Pas dans le même serveur
    // - Pas dans aucun salon (currentChannelId vide)
    if (isInSameChannel && isInSameServer) {
      return;
    }

    // 4. Incrémenter les compteurs
    this.incrementUnreadCount(messageServerId);
    this.incrementUnreadMessage(messageChannelId, msg._id || `msg-${Date.now()}`);

    // 5. Jouer le son
    if (this.settings.soundEnabled) {
      this.playNotificationSound();
    }
  }

  // Gestion des compteurs de messages non lus (au niveau serveur)
  incrementUnreadCount(serverId: string) {
    this.unreadCounts[serverId] = (this.unreadCounts[serverId] || 0) + 1;
    this.notifyUnreadCountListeners();
  }

  resetUnreadCount(serverId: string) {
    // Ne pas réinitialiser si on est en mode sélection automatique
    if (this.isAutoSelecting) {
      return;
    }
    
    this.unreadCounts[serverId] = 0;
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

  // Gestion des messages non lus par salon
  incrementUnreadMessage(channelId: string, messageId: string) {
    if (!this.unreadMessages[channelId]) {
      this.unreadMessages[channelId] = {
        count: 0,
        lastMessageId: '',
        lastMessageTime: ''
      };
    }
    
    this.unreadMessages[channelId].count += 1;
    this.unreadMessages[channelId].lastMessageId = messageId;
    this.unreadMessages[channelId].lastMessageTime = new Date().toISOString();
    
    this.notifyUnreadMessagesListeners();
  }

  resetUnreadMessages(channelId: string) {
    if (this.unreadMessages[channelId]) {
      this.unreadMessages[channelId].count = 0;
      this.notifyUnreadMessagesListeners();
    }
  }

  getUnreadMessages(): UnreadMessages {
    return this.unreadMessages;
  }

  onUnreadMessagesChange(callback: (messages: UnreadMessages) => void) {
    this.unreadMessagesListeners.push(callback);
    return () => {
      const index = this.unreadMessagesListeners.indexOf(callback);
      if (index > -1) {
        this.unreadMessagesListeners.splice(index, 1);
      }
    };
  }

  private notifyUnreadMessagesListeners() {
    this.unreadMessagesListeners.forEach(callback => callback(this.unreadMessages));
  }
}

// Instance singleton
export const notificationService = new NotificationService();
export default notificationService; 