"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "./hooks/useSocket";
import { useNotifications } from "./hooks/useNotifications";
import Chat from "./components/chat/Chat";
import ChannelList from "./components/channels/ChannelList";
import CreateChannelModal from "./components/channels/CreateChannelModal";
import NotificationToast from "./components/notifications/NotificationToast";
import NotificationSettings from "./components/notifications/NotificationSettings";
import AuthButton from "./components/auth/AuthButton";
import WelcomeBanner from "./components/WelcomeBanner";
import NoChannelSelected from "./components/NoChannelSelected";
import MenuLinks from "./components/MenuLinks";

interface Channel {
  _id: string;
  name: string;
  createdAt: string;
  description?: string;
  owner?: string;
  members?: string[];
  permissions?: any;
  icon?: string;
}

export default function Home() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Utiliser les nouveaux hooks
  const socketConfig = useMemo(() => ({
    session,
    selectedChannel,
    channels
  }), [session, selectedChannel, channels]);

  const { socket, isConnected, sendMessage, deleteMessage } = useSocket(socketConfig);

  const { 
    toasts, 
    settings, 
    unreadCounts,
    addToast, 
    removeToast, 
    updateSettings, 
    requestBrowserPermission,
    resetUnreadCount
  } = useNotifications();

  // Référence pour addToast pour éviter les dépendances
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  // Charger les salons
  const fetchChannels = useCallback(async (userEmail: string) => {
    try {
      const response = await fetch(`http://localhost:4000/channels?userEmail=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const channelsData = await response.json();
        setChannels(channelsData);
      } else {
        console.error("Erreur lors du chargement des salons:", response.status);
        addToastRef.current("Erreur lors du chargement des salons", "error");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des salons:", error);
      addToastRef.current("Erreur lors du chargement des salons", "error");
    }
  }, []);

  // Charger les salons au changement de session
  useEffect(() => {
    if (session?.user?.email) {
      fetchChannels(session.user.email);
    }
  }, [session?.user?.email, fetchChannels]);

  // Sélectionner automatiquement le premier salon si aucun n'est sélectionné
  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0].name);
    }
  }, [channels]);

  // Gérer la création de salon
  const handleCreateChannel = useCallback(async (channelData: any) => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch("http://localhost:4000/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...channelData,
          owner: session.user.email
        })
      });

      if (response.ok) {
        const newChannel = await response.json();
        setChannels(prev => [...prev, newChannel]);
        setSelectedChannel(newChannel.name);
        setShowCreateChannel(false);
        addToast(`Salon "${newChannel.name}" créé avec succès`, "success");
      } else {
        const error = await response.json();
        addToast(error.error || "Erreur lors de la création du salon", "error");
      }
    } catch (error) {
      addToast("Erreur de connexion", "error");
    }
  }, [session?.user?.email, addToast]);



  // Demander les permissions de notification
  const handleRequestNotificationPermission = useCallback(async () => {
    const granted = await requestBrowserPermission();
    if (granted) {
      addToast("Notifications navigateur activées", "success");
    } else {
      addToast("Notifications navigateur refusées", "warning");
    }
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
      {/* Sidebar */}
      <div className="w-64 bg-[#2b2d31] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#23272a]">
          <div className="flex items-center gap-3">
            <img
              src={session.user?.image || "/avatars/avatar1.png"}
              alt={session.user?.name || "Avatar"}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {session.user?.name || session.user?.email}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 text-xs">En ligne</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Links */}
        <MenuLinks />

        {/* Channels */}
                 <div className="flex-1 overflow-y-auto">
           <ChannelList
             channels={channels}
             selectedChannel={selectedChannel}
             onSelectChannel={setSelectedChannel}
             onCreateChannel={(name: string) => handleCreateChannel({ name })}
             unreadCounts={unreadCounts}
           />
         </div>

                 {/* Footer */}
         <div className="p-4 border-t border-[#23272a]">
           <div className="flex items-center gap-2">
             <NotificationSettings
               settings={settings}
               onUpdateSettings={updateSettings}
               onRequestPermission={requestBrowserPermission}
             />
           </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <Chat
            channel={selectedChannel}
            channels={channels}
            setChannels={setChannels}
            fetchChannels={fetchChannels}
            setSelectedChannel={setSelectedChannel}
            session={session}

            socket={socket}
            onResetUnreadCount={resetUnreadCount}
          />
        ) : (
          <NoChannelSelected />
        )}
      </div>

             {/* Modals */}
       <CreateChannelModal
         isOpen={showCreateChannel}
         onClose={() => setShowCreateChannel(false)}
         onCreateChannel={(name: string) => handleCreateChannel({ name })}
       />

      {/* Notifications */}
      <NotificationToast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
