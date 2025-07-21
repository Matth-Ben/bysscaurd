"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "./hooks/useSocket";
import { useNotifications } from "./hooks/useNotifications";
import { notificationService } from "./services/notificationService";
import Chat from "./components/chat/Chat";
import ServerList from "./components/servers/ServerList";
import ServerChannelList from "./components/servers/ServerChannelList";
import NotificationToast from "./components/notifications/NotificationToast";
import NotificationSettings from "./components/notifications/NotificationSettings";
import AuthButton from "./components/auth/AuthButton";
import WelcomeBanner from "./components/WelcomeBanner";
import NoChannelSelected from "./components/NoChannelSelected";
import MenuLinks from "./components/MenuLinks";

interface Server {
  _id: string;
  name: string;
  description: string;
  icon?: string;
  owner: string;
  createdAt: string;
}

interface Channel {
  _id: string;
  name: string;
  description: string;
  type: 'text' | 'voice';
  position: number;
  isPrivate: boolean;
  createdAt: string;
}

export default function Home() {
  const { data: session } = useSession();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [currentServer, setCurrentServer] = useState<Server | null>(null);
  const [currentChannels, setCurrentChannels] = useState<Channel[]>([]);
  const [userPermissions, setUserPermissions] = useState<any>(null);

  // Utiliser les nouveaux hooks
  const socketConfig = useMemo(() => ({
    session,
    selectedServer,
    selectedChannel,
    servers,
    channels: currentChannels, // Passer les salons pour les permissions
    onServersLoaded: (newServers: any[]) => {
      console.log("🔔 Page: Serveurs reçus du websocket:", newServers);
      setServers(newServers);
    }
  }), [session, selectedServer, selectedChannel, servers, currentChannels]);

  const { socket, isConnected, sendMessage, deleteMessage } = useSocket(socketConfig);

  const { 
    toasts, 
    settings, 
    unreadCounts,
    unreadMessages,
    addToast, 
    removeToast, 
    updateSettings, 
    requestBrowserPermission,
    initializeAudioContext,
    loadUnreadCounts,
    markChannelAsRead,
    resetUnreadCount,
    resetUnreadMessages
  } = useNotifications();



  // Initialiser l'AudioContext lors de la première interaction utilisateur
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudioContext();
      // Retirer les listeners après la première interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    // Ajouter des listeners pour détecter la première interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [initializeAudioContext]);



  // Référence pour addToast pour éviter les dépendances
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  // Charger les compteurs de messages non lus au démarrage
  useEffect(() => {
    if (session?.user?.email) {
      loadUnreadCounts(session.user.email);
    }
  }, [session?.user?.email, loadUnreadCounts]);

  // Charger les serveurs
  const fetchServers = useCallback(async (userEmail: string) => {
    try {
      const response = await fetch(`http://localhost:4000/servers?userEmail=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const serversData = await response.json();
        setServers(serversData);
        
        // Charger tous les salons de tous les serveurs pour les permissions de notification
        await fetchAllChannels(serversData, userEmail);
      } else {
        console.error("Erreur lors du chargement des serveurs:", response.status);
        addToastRef.current("Erreur lors du chargement des serveurs", "error");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des serveurs:", error);
      addToastRef.current("Erreur lors du chargement des serveurs", "error");
    }
  }, []);

  // Charger tous les salons de tous les serveurs pour les permissions
  const fetchAllChannels = useCallback(async (servers: Server[], userEmail: string) => {
    try {
      const allChannels: any[] = [];
      
      for (const server of servers) {
        const channelsResponse = await fetch(`http://localhost:4000/servers/${server._id}/channels?userEmail=${encodeURIComponent(userEmail)}`);
        if (channelsResponse.ok) {
          const channels = await channelsResponse.json();
          allChannels.push(...channels);
        }
      }
      
      // Mettre à jour le service de notification avec tous les salons
      if (allChannels.length > 0) {
        notificationService.updateUserChannels(allChannels);
      }
      
      // Marquer automatiquement tous les canaux comme lus au chargement initial
      // Cela évite que les anciens compteurs persistent après rechargement
      for (const server of servers) {
        for (const channel of allChannels.filter(ch => ch.serverId === server._id)) {
          await markChannelAsRead(userEmail, channel._id, server._id, undefined, true);
        }
      }
      
      // Recharger les compteurs après avoir marqué tous les canaux comme lus
      await loadUnreadCounts(userEmail);
    } catch (error) {
      console.error("Erreur lors du chargement de tous les salons:", error);
    }
  }, [markChannelAsRead, loadUnreadCounts]);

  // Gérer la sélection de salon et réinitialiser les messages non lus
  const handleSelectChannel = useCallback((channelId: string, isAutoSelect: boolean = false) => {
    setSelectedChannel(channelId);
    
    // Mettre à jour la position dans le service de notification
    if (selectedServer) {
      notificationService.updateCurrentPosition(selectedServer, channelId);
    }
    
    // Marquer le salon comme lu dans le backend seulement si ce n'est pas une sélection automatique
    if (session?.user?.email && selectedServer && !isAutoSelect) {
      markChannelAsRead(session.user.email, channelId, selectedServer, undefined, true); // Réinitialiser le compteur
      // Réinitialiser le compteur local pour ce serveur
      resetUnreadCount(selectedServer);
    } else if (session?.user?.email && selectedServer && isAutoSelect) {
      // Pour la sélection automatique, marquer comme lu mais conserver le compteur
      markChannelAsRead(session.user.email, channelId, selectedServer, undefined, false);
    }
    // Réinitialiser les messages non lus pour ce salon
    resetUnreadMessages(channelId);
  }, [resetUnreadMessages, markChannelAsRead, session?.user?.email, selectedServer, resetUnreadCount]);

  // Charger un serveur avec ses salons et permissions
  const fetchServerData = useCallback(async (serverId: string, userEmail: string) => {
    try {
      // Récupérer les canaux du serveur
      const channelsResponse = await fetch(`http://localhost:4000/servers/${serverId}/channels?userEmail=${encodeURIComponent(userEmail)}`);
      if (channelsResponse.ok) {
        const channels = await channelsResponse.json();
        setCurrentChannels(channels);
        
        // Sélectionner automatiquement le premier salon textuel
        const firstTextChannel = channels.find((ch: Channel) => ch.type === 'text');
        if (firstTextChannel) {
          handleSelectChannel(firstTextChannel._id, true); // Sélection automatique
        }
      } else {
        console.error("Erreur lors du chargement des canaux:", channelsResponse.status);
        addToastRef.current("Erreur lors du chargement des canaux", "error");
      }
      
      // Récupérer les permissions du serveur
      const permissionsResponse = await fetch(`http://localhost:4000/servers/${serverId}/permissions?userEmail=${encodeURIComponent(userEmail)}`);
      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setUserPermissions(permissionsData.permissions);
      } else {
        console.error("Erreur lors du chargement des permissions:", permissionsResponse.status);
      }
      
      // Récupérer les informations du serveur
      const serverResponse = await fetch(`http://localhost:4000/servers/${serverId}?userEmail=${encodeURIComponent(userEmail)}`);
      if (serverResponse.ok) {
        const serverData = await serverResponse.json();
        setCurrentServer(serverData.server);
      } else {
        console.error("Erreur lors du chargement du serveur:", serverResponse.status);
        addToastRef.current("Erreur lors du chargement du serveur", "error");
      }
    } catch (error) {
      console.error("Erreur lors du chargement du serveur:", error);
      addToastRef.current("Erreur lors du chargement du serveur", "error");
    }
  }, []);

  // Charger les serveurs au changement de session (maintenant géré par le websocket)
  useEffect(() => {
    if (session?.user?.email) {
      // Les serveurs seront chargés automatiquement par le websocket
      // fetchServers(session.user.email);
    }
  }, [session?.user?.email]);

  // Gérer la sélection d'un serveur
  const handleSelectServer = useCallback((serverId: string) => {
    // Activer le mode sélection automatique dès le début
    notificationService.setAutoSelecting(true);
    
    setSelectedServer(serverId);
    setSelectedChannel(null);
    setCurrentServer(null);
    setCurrentChannels([]);
    
    // Mettre à jour la position dans le service de notification (pas de salon sélectionné)
    notificationService.updateCurrentPosition(serverId, '');
    
    if (serverId !== "dm" && session?.user?.email) {
      fetchServerData(serverId, session.user.email);
    }
    
    // Désactiver le mode sélection automatique après un délai plus long
    setTimeout(() => {
      notificationService.setAutoSelecting(false);
    }, 3000);
  }, [session?.user?.email, fetchServerData]);

  // Gérer la création de serveur
  const handleCreateServer = useCallback(async (name: string, description: string) => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch("http://localhost:4000/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          ownerEmail: session.user.email
        })
      });

      if (response.ok) {
        const newServer = await response.json();
        setServers(prev => [...prev, newServer]);
        addToast(`Serveur "${newServer.name}" créé avec succès`, "success");
        
        // Sélectionner automatiquement le nouveau serveur
        handleSelectServer(newServer._id);
      } else {
        const error = await response.json();
        addToast(error.error || "Erreur lors de la création du serveur", "error");
      }
    } catch (error) {
      addToast("Erreur de connexion", "error");
    }
  }, [session?.user?.email, addToast, handleSelectServer]);

  // Gérer la création de salon
  const handleCreateChannel = useCallback(async (name: string, description: string, type: 'text' | 'voice', isPrivate: boolean = false, allowedRoles: string[] = []) => {
    if (!selectedServer || !session?.user?.email) return;

    try {
      const response = await fetch(`http://localhost:4000/servers/${selectedServer}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          type,
          userEmail: session.user.email,
          isPrivate,
          allowedRoles
        })
      });

      if (response.ok) {
        const newChannel = await response.json();
        setCurrentChannels(prev => [...prev, newChannel]);
        setSelectedChannel(newChannel._id);
        
        // Mettre à jour les permissions de notification avec le nouveau salon
        notificationService.updateUserChannels([...currentChannels, newChannel]);
        
        addToast(`Salon "${newChannel.name}" créé avec succès`, "success");
      } else {
        const error = await response.json();
        addToast(error.error || "Erreur lors de la création du salon", "error");
      }
    } catch (error) {
      addToast("Erreur de connexion", "error");
    }
  }, [selectedServer, session?.user?.email, addToast]);

  // Demander les permissions de notification
  const handleRequestNotificationPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestBrowserPermission();
    if (granted) {
      addToast("Notifications navigateur activées", "success");
    } else {
      addToast("Notifications navigateur refusées", "warning");
    }
    return granted;
  }, [requestBrowserPermission, addToast]);

  if (!session) {
    return (
      <div className="h-screen bg-[#313338] flex items-center justify-center">
        <div className="bg-[#36393f] p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Discord Lite</h1>
            <p className="text-gray-400">Connectez-vous pour commencer</p>
          </div>
          <AuthButton />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#313338] flex">
      {/* Liste des serveurs */}
      <ServerList
        servers={servers}
        selectedServer={selectedServer}
        onSelectServer={handleSelectServer}
        onCreateServer={handleCreateServer}
        currentUserEmail={session.user?.email || ""}
        unreadCounts={unreadCounts}
        onResetUnreadCount={resetUnreadCount}
      />

      {/* Liste des salons du serveur */}
      <ServerChannelList
        server={currentServer}
        channels={currentChannels}
        selectedChannel={selectedChannel}
        onSelectChannel={handleSelectChannel}
        onCreateChannel={handleCreateChannel}
        currentUserEmail={session.user?.email || ""}
        userPermissions={userPermissions}
        unreadMessages={unreadMessages}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
                {selectedChannel && selectedServer && selectedServer !== "dm" ? (
          <Chat
            channel={selectedChannel}
            serverId={selectedServer}
            channels={currentChannels}
            setChannels={setCurrentChannels}
            fetchChannels={() => {
              if (selectedServer && session?.user?.email) {
                return fetchServerData(selectedServer, session.user.email);
              }
              return Promise.resolve();
            }}
            setSelectedChannel={setSelectedChannel}
            session={session}
            socket={socket}
            onResetUnreadCount={resetUnreadCount}
            unreadMessages={unreadMessages}
            onResetUnreadMessages={resetUnreadMessages}
          />
        ) : selectedServer === "dm" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h2 className="text-xl font-bold mb-2">Messages privés</h2>
              <p>Fonctionnalité à venir</p>
            </div>
          </div>
        ) : (
          <NoChannelSelected />
        )}
      </div>

      {/* Notifications */}
      <NotificationToast toasts={toasts} removeToast={removeToast} />
      
      {/* Paramètres de notifications */}
      <NotificationSettings
        settings={settings}
        onUpdateSettings={updateSettings}
        onRequestPermission={handleRequestNotificationPermission}
        onInitializeAudio={initializeAudioContext}
      />

    </div>
  );
}
