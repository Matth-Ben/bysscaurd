import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { notificationService } from '../services/notificationService';

interface UseSocketProps {
  session: any;
  selectedServer: string | null;
  selectedChannel: string | null;
  servers: any[];
  channels?: any[]; // Ajouter les salons
  onServersLoaded?: (servers: any[]) => void; // Callback pour mettre à jour les serveurs
}

export const useSocket = ({ session, selectedServer, selectedChannel, servers, channels = [], onServersLoaded }: UseSocketProps) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const selectedServerRef = useRef<string | null>(null);
  const selectedChannelRef = useRef<string | null>(null);
  const serversRef = useRef<any[]>([]);
  const channelsRef = useRef<any[]>([]);
  const initializedRef = useRef(false);

  // Mettre à jour les refs
  selectedServerRef.current = selectedServer;
  selectedChannelRef.current = selectedChannel;
  serversRef.current = servers;
  channelsRef.current = channels;

  // Mettre à jour la position dans le service de notification quand elle change
  useEffect(() => {
    if (initializedRef.current) {
      notificationService.updateCurrentPosition(selectedServer || '', selectedChannel || '');
    }
  }, [selectedServer, selectedChannel]);

  // Mettre à jour les serveurs et salons accessibles quand ils sont chargés
  useEffect(() => {
    if (initializedRef.current && servers.length > 0) {
      const serverIds = servers.map(server => server._id);
      notificationService.updateUserServers(serverIds);
    }
  }, [servers]);

  // Mettre à jour les salons accessibles quand ils changent
  useEffect(() => {
    if (initializedRef.current && channels.length > 0) {
      notificationService.updateUserChannels(channels);
    }
  }, [channels]);

  // Initialiser le service de notification dès qu'on a une session
  useEffect(() => {
    if (session?.user?.email && !initializedRef.current) {
      const userEmail = session.user.name || session.user.email;
      const serverIds = servers.map(server => server._id);
  
      notificationService.initialize(userEmail, serverIds);
      
      // Mettre à jour les salons accessibles si disponibles
      if (channels.length > 0) {
        notificationService.updateUserChannels(channels);
      }
      
      // Position initiale : pas de serveur/salon sélectionné (permet toutes les notifications)
      notificationService.updateCurrentPosition('', '');
      
      initializedRef.current = true;
    }
  }, [session?.user?.email, servers, channels]);

  useEffect(() => {
    if (!session?.user?.email) return;



    // Connecter au socket
    const socket = socketService.connect();
    
    // Authentifier l'utilisateur
    socketService.authenticate(session.user.email);

    // S'abonner aux messages pour les notifications globales
    // (même quand aucun salon n'est sélectionné)
    const unsubscribe = socketService.onMessage((msg: any) => {
      // Traiter les notifications pour tous les messages
      notificationService.handleNewMessage(msg);
    });

    // S'abonner à l'initialisation des données utilisateur
    const unsubscribeUserInit = socketService.onUserInitialized((data) => {
      
      // Initialiser le service de notification avec les données du websocket
      const userEmail = session.user.name || session.user.email;
      const serverIds = data.servers.map((server: any) => server._id);
      
      notificationService.initialize(userEmail, serverIds);
      notificationService.updateUserServers(serverIds);
      notificationService.updateUserChannels(data.channels);
      
      // Mettre à jour les serveurs dans le composant parent
      if (onServersLoaded) {
        onServersLoaded(data.servers);
      }
      
      // Mettre à jour les compteurs de messages non lus
      notificationService.loadUnreadCounts(data.userEmail);
      
      initializedRef.current = true;
    });

    unsubscribeRef.current = () => {
      unsubscribe();
      unsubscribeUserInit();
    };

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [session?.user?.email]);

  // Rejoindre le salon sélectionné
  useEffect(() => {
    if (selectedChannel && selectedServer) {
      // Note: joinChannel nécessite un serverId, mais on n'en a pas dans ce contexte
      // Cette fonctionnalité est gérée dans le composant Chat
    }
  }, [selectedChannel, selectedServer]);

  return {
    socket: socketService.getSocket(),
    isConnected: socketService.isConnected(),
    sendMessage: socketService.sendMessage.bind(socketService),
    deleteMessage: socketService.deleteMessage.bind(socketService)
  };
}; 