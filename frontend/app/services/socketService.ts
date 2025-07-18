import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private messageListeners: Array<(msg: any) => void> = [];
  private historyListeners: Array<(data: { messages: any[], hasMore: boolean, totalCount: number, currentPage: number }) => void> = [];
  private deleteListeners: Array<(data: { messageId: string }) => void> = [];
  private userJoinedListeners: Array<(data: { email: string; status: string; channel: string }) => void> = [];
  private userLeftListeners: Array<(data: { email: string; status: string; channel: string }) => void> = [];
  private statusChangeListeners: Array<(data: { email: string; status: string }) => void> = [];

  connect(url: string = "http://localhost:4000"): Socket {
    if (!this.socket) {
      this.socket = io(url);
      this.setupEventListeners();
    }
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("message", (msg: any) => {
      console.log("SocketService: Message reçu", msg);
      this.messageListeners.forEach(listener => listener(msg));
    });

    this.socket.on("message_history", (data: any) => {
      // Gérer la compatibilité avec l'ancien format (array) et le nouveau format (object)
      if (Array.isArray(data)) {
        // Ancien format - convertir en nouveau format
        const newData = {
          messages: data,
          hasMore: false,
          totalCount: data.length,
          currentPage: 0
        };
        console.log("SocketService: Historique reçu (ancien format)", data.length, "messages");
        console.log("SocketService: Premier message:", data[0]);
        console.log("SocketService: Dernier message:", data[data.length - 1]);
        this.historyListeners.forEach(listener => listener(newData));
      } else {
        // Nouveau format
        console.log("SocketService: Historique reçu", data.messages?.length || 0, "messages");
        console.log("SocketService: Premier message:", data.messages?.[0]);
        console.log("SocketService: Dernier message:", data.messages?.[data.messages?.length - 1]);
        console.log("SocketService: HasMore:", data.hasMore, "TotalCount:", data.totalCount, "CurrentPage:", data.currentPage);
        this.historyListeners.forEach(listener => listener(data));
      }
    });

    this.socket.on("message_deleted", (data: { messageId: string }) => {
      console.log("SocketService: Message supprimé", data.messageId);
      this.deleteListeners.forEach(listener => listener(data));
    });

    this.socket.on("user_joined_channel", (data: { email: string; status: string; channel: string }) => {
      console.log("SocketService: Utilisateur rejoint le salon", data);
      this.userJoinedListeners.forEach(listener => listener(data));
    });

    this.socket.on("user_left_channel", (data: { email: string; status: string; channel: string }) => {
      console.log("SocketService: Utilisateur quitte le salon", data);
      this.userLeftListeners.forEach(listener => listener(data));
    });

    this.socket.on("user_status_changed", (data: { email: string; status: string }) => {
      console.log("SocketService: Statut utilisateur changé", data);
      this.statusChangeListeners.forEach(listener => listener(data));
    });
  }

  authenticate(email: string) {
    if (this.socket) {
      this.socket.emit("authenticate", email);
    }
  }

  joinChannel(channel: string) {
    if (this.socket) {
      this.socket.emit("join_channel", channel);
    }
  }

  leaveChannel(channel: string) {
    if (this.socket) {
      this.socket.emit("leave_channel", channel);
    }
  }

  sendMessage(data: { user: string; content: string; channel: string }) {
    if (this.socket) {
      console.log("SocketService: Envoi du message", data);
      this.socket.emit("message", data);
    }
  }

  getMessageHistory(channel: string, page: number = 0, limit: number = 50) {
    if (this.socket) {
      console.log("SocketService: Demande d'historique pour le salon:", channel, "page:", page);
      this.socket.emit("get_message_history", { channel, page, limit });
    }
  }

  deleteMessage(data: { messageId: string; channel: string }) {
    if (this.socket) {
      this.socket.emit("message_deleted", data);
    }
  }

  // Méthodes pour s'abonner aux événements
  onMessage(callback: (msg: any) => void) {
    this.messageListeners.push(callback);
    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  onHistory(callback: (data: { messages: any[], hasMore: boolean, totalCount: number, currentPage: number }) => void) {
    this.historyListeners.push(callback);
    return () => {
      const index = this.historyListeners.indexOf(callback);
      if (index > -1) {
        this.historyListeners.splice(index, 1);
      }
    };
  }

  onDelete(callback: (data: { messageId: string }) => void) {
    this.deleteListeners.push(callback);
    return () => {
      const index = this.deleteListeners.indexOf(callback);
      if (index > -1) {
        this.deleteListeners.splice(index, 1);
      }
    };
  }

  onUserJoined(callback: (data: { email: string; status: string; channel: string }) => void) {
    this.userJoinedListeners.push(callback);
    return () => {
      const index = this.userJoinedListeners.indexOf(callback);
      if (index > -1) {
        this.userJoinedListeners.splice(index, 1);
      }
    };
  }

  onUserLeft(callback: (data: { email: string; status: string; channel: string }) => void) {
    this.userLeftListeners.push(callback);
    return () => {
      const index = this.userLeftListeners.indexOf(callback);
      if (index > -1) {
        this.userLeftListeners.splice(index, 1);
      }
    };
  }

  onStatusChange(callback: (data: { email: string; status: string }) => void) {
    this.statusChangeListeners.push(callback);
    return () => {
      const index = this.statusChangeListeners.indexOf(callback);
      if (index > -1) {
        this.statusChangeListeners.splice(index, 1);
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Instance singleton
export const socketService = new SocketService();
export default socketService; 