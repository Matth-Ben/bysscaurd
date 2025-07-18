import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { notificationService } from '../services/notificationService';

interface UseSocketProps {
  session: any;
  selectedChannel: string | null;
  channels: any[];
}

export const useSocket = ({ session, selectedChannel, channels }: UseSocketProps) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const selectedChannelRef = useRef<string | null>(null);
  const channelsRef = useRef<any[]>([]);

  // Mettre à jour les refs
  selectedChannelRef.current = selectedChannel;
  channelsRef.current = channels;

  useEffect(() => {
    if (!session?.user?.email) return;

    // Connecter au socket
    const socket = socketService.connect();
    
    // Authentifier l'utilisateur
    socketService.authenticate(session.user.email);

    // S'abonner aux messages pour les notifications
    const unsubscribe = socketService.onMessage((msg: any) => {
      console.log("useSocket: Message reçu", msg);
      
      // Traiter les notifications en utilisant les refs
      notificationService.handleNewMessage(
        msg,
        selectedChannelRef.current || '',
        session.user.name || session.user.email,
        channelsRef.current.map(c => c.name)
      );
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [session?.user?.email]);

  // Rejoindre le salon sélectionné
  useEffect(() => {
    if (selectedChannel) {
      socketService.joinChannel(selectedChannel);
    }
  }, [selectedChannel]);

  return {
    socket: socketService.getSocket(),
    isConnected: socketService.isConnected(),
    sendMessage: socketService.sendMessage.bind(socketService),
    deleteMessage: socketService.deleteMessage.bind(socketService)
  };
}; 