"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { socketService } from "../../services/socketService";
import ChannelPermissions from "../channels/ChannelPermissions";
import ChannelMembers from "../channels/ChannelMembers";

interface Message {
  _id: string;
  user: string;
  content: string;
  channel: string;
  timestamp: string;
  avatar?: string;
}

interface Props {
  channel: string;
  channels: any[];
  setChannels: (channels: any[]) => void;
  fetchChannels: (userEmail: string) => Promise<void>;
  setSelectedChannel: (name: string) => void;
  session: any;
  onUnreadCountUpdate?: (counts: Record<string, number>) => void;
  socket: any;
  onResetUnreadCount?: (channelName: string) => void;
}

export default function Chat({ 
  channel, 
  channels, 
  setChannels, 
  fetchChannels, 
  setSelectedChannel, 
  session, 
  onUnreadCountUpdate, 
  socket, 
  onResetUnreadCount 
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [isChannelAdmin, setIsChannelAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Date | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Construire l'URL de l'avatar
  const getAvatarUrl = (avatarPath: string) => {
    if (avatarPath.startsWith('http')) {
      if (avatarPath.includes('localhost:3000/uploads')) {
        return avatarPath.replace('localhost:3000', 'localhost:4000');
      }
      return avatarPath;
    }
    if (avatarPath.startsWith('/uploads/')) {
      return `http://localhost:4000${avatarPath}`;
    }
    return `http://localhost:3000${avatarPath}`;
  };

  // Écouter les messages pour ce salon
  useEffect(() => {
    if (!socket) return;

    const unsubscribeMessage = socketService.onMessage((msg: Message) => {
      console.log("Chat: Message reçu", msg);
      if (msg.channel === channel) {
        console.log("Chat: Message correspond au salon actuel, ajout au state");
        setMessages(prev => {
          console.log("Chat: Messages précédents:", prev.length);
          // Vérifier s'il y a un message temporaire à remplacer
          const hasTempMessage = prev.some(m => m._id.startsWith('temp-'));
          if (hasTempMessage) {
            // Remplacer le dernier message temporaire par le vrai message
            const withoutTemp = prev.filter(m => !m._id.startsWith('temp-'));
            const newMessages = [...withoutTemp, msg];
            console.log("Chat: Messages après remplacement:", newMessages.length);
            return newMessages;
          } else {
            // Ajouter le message normalement
            const newMessages = [...prev, msg];
            console.log("Chat: Messages après ajout:", newMessages.length);
            return newMessages;
          }
        });
      } else {
        console.log("Chat: Message ignoré - salon différent:", msg.channel, "vs", channel);
      }
    });

    const unsubscribeHistory = socketService.onHistory((data: { messages: Message[], hasMore: boolean, totalCount: number, currentPage: number }) => {
      console.log("Chat: Historique reçu", data.messages.length, "messages pour le salon:", channel);
      console.log("Chat: Premier message:", data.messages[0]);
      console.log("Chat: Dernier message:", data.messages[data.messages.length - 1]);
      
      // Filtrer les messages pour ne garder que ceux du salon actuel
      const filteredHistory = data.messages.filter(msg => msg.channel === channel);
      console.log("Chat: Messages filtrés pour le salon", channel, ":", filteredHistory.length);
      console.log("Chat: Messages filtrés:", filteredHistory);
      
      if (data.currentPage === 0) {
        // Première page - remplacer tous les messages sauf les nouveaux
        setMessages(prev => {
          // Garder les nouveaux messages (ceux qui ne sont pas dans l'historique)
          const historyIds = new Set(filteredHistory.map(m => m._id));
          const newMessages = prev.filter(msg => !historyIds.has(msg._id));
          return [...filteredHistory, ...newMessages];
        });
      } else {
        // Pages suivantes - ajouter au début
        setMessages(prev => {
          // Éviter les doublons
          const existingIds = new Set(prev.map(m => m._id));
          const newMessages = filteredHistory.filter(msg => !existingIds.has(msg._id));
          return [...newMessages, ...prev];
        });
      }
      
      setHasMore(data.hasMore);
      setTotalCount(data.totalCount);
      setCurrentPage(data.currentPage);
      setIsLoadingMore(false);
    });

    const unsubscribeDelete = socketService.onDelete((data: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    });

    // Demander l'historique des messages pour ce salon
    console.log("Chat: Demande d'historique pour le salon:", channel);
    socketService.getMessageHistory(channel, 0, 50);

    return () => {
      unsubscribeMessage();
      unsubscribeHistory();
      unsubscribeDelete();
    };
  }, [channel, socket]);

  // Réinitialiser les messages et les états quand le channel change
  useEffect(() => {
    console.log("Chat: Changement de salon vers:", channel);
    setMessages([]);
    setCurrentPage(0);
    setHasMore(false);
    setTotalCount(0);
    setIsLoadingMore(false);
    setShowScrollToBottom(false);
    setShouldAutoScroll(true);
    setLastReadTimestamp(null);
    setUnreadMessagesCount(0);
  }, [channel]);

  // Réinitialiser le compteur de messages non lus
  useEffect(() => {
    if (channel && onResetUnreadCount) {
      console.log("Chat: Réinitialisation du compteur pour le salon:", channel);
      onResetUnreadCount(channel);
    }
  }, [channel, onResetUnreadCount]);

  // Mettre à jour le timestamp de dernière lecture quand les messages changent
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      setLastReadTimestamp(new Date(lastMessage.timestamp));
      setUnreadMessagesCount(0);
    }
  }, [messages]);

  // Gérer les nouveaux messages
  useEffect(() => {
    if (messages.length > 0 && lastReadTimestamp) {
      const newMessages = messages.filter(msg => 
        new Date(msg.timestamp) > lastReadTimestamp
      );
      setUnreadMessagesCount(newMessages.length);
    } else if (messages.length > 0 && !lastReadTimestamp) {
      // Si pas de timestamp de lecture, tous les messages sont considérés comme lus
      setUnreadMessagesCount(0);
    }
  }, [messages, lastReadTimestamp]);

  // Charger les permissions
  useEffect(() => {
    if (channel && session?.user?.email) {
      fetchUserPermissions();
    }
  }, [channel, session?.user?.email]);

  const fetchUserPermissions = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/channels/${encodeURIComponent(channel)}/permissions?userEmail=${encodeURIComponent(session?.user?.email || "")}`
      );
      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data.permissions);
        setIsChannelAdmin(data.isChannelAdmin);
        setIsOwner(data.isOwner);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des permissions:", error);
    }
  };

  // Scroll automatique pour les nouveaux messages
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  // Marquer comme lu au scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    const isAtTop = element.scrollTop <= 100;
    
    // Afficher/masquer le bouton "Descendre"
    setShowScrollToBottom(!isAtBottom);
    
    // Activer/désactiver l'auto-scroll
    setShouldAutoScroll(isAtBottom);
    
    // Marquer comme lu si on est en bas
    if (isAtBottom && unreadMessagesCount > 0 && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      setLastReadTimestamp(new Date(lastMessage.timestamp));
      setUnreadMessagesCount(0);
    }
    
    // Charger plus de messages si on est en haut et qu'il y en a plus
    if (isAtTop && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  // Charger plus de messages
  const loadMoreMessages = () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    console.log("Chat: Chargement de la page", nextPage, "pour le salon:", channel);
    
    socketService.getMessageHistory(channel, nextPage, 50);
  };

  // Descendre vers les messages récents
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShouldAutoScroll(true);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    const user = session?.user?.name || session?.user?.email || "Anonyme";
    const messageData = { user, content: input, channel };
    console.log("Chat: Envoi du message", messageData);
    
    // Créer un message temporaire pour affichage immédiat
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      user,
      content: input,
      channel,
      timestamp: new Date().toISOString(),
      avatar: session?.user?.image || "/avatars/avatar1.png"
    };
    
    // Ajouter le message temporaire à l'affichage
    setMessages(prev => [...prev, tempMessage]);
    
    // Envoyer le message via Socket.io
    socketService.sendMessage(messageData);
    setInput("");
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch(
        `http://localhost:4000/messages/${messageId}?userEmail=${encodeURIComponent(session.user.email)}&channelName=${encodeURIComponent(channel)}`,
        { method: "DELETE" }
      );
      
      if (response.ok) {
        // Le message sera supprimé via Socket.io
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Erreur lors de la suppression du message");
      }
    } catch (error) {
      alert("Erreur de connexion");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative h-dvh">
      {/* Channel Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#23272a] bg-[#36393f]">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <h1 className="text-white font-bold text-lg">#{channel}</h1>
          {unreadMessagesCount > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-[#5865f2] rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-medium">{unreadMessagesCount} nouveau{unreadMessagesCount > 1 ? 'x' : ''}</span>
            </div>
          )}
        </div>
        {session && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(true)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-[#40444b]"
              title="Voir les membres"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowPermissions(true)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-[#40444b]"
              title="Gérer les permissions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative" onScroll={handleScroll} ref={messagesContainerRef}>
        {/* Indicateur de chargement en haut */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5865f2]"></div>
              <span className="text-sm">Chargement des messages...</span>
            </div>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Bienvenue dans #{channel} !</h3>
            <p className="text-gray-400 text-sm">C'est le début de ce salon. Envoyez le premier message !</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isNewMessage = lastReadTimestamp && new Date(msg.timestamp) > lastReadTimestamp;
              const showDivider = isNewMessage && index === 0;
              
              return (
                <div key={msg._id}>
                  {/* Ligne de séparation pour les nouveaux messages */}
                  {showDivider && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-[#40444b]"></div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-[#40444b] rounded-full">
                        <div className="w-2 h-2 bg-[#5865f2] rounded-full animate-pulse"></div>
                        <span className="text-[#5865f2] text-xs font-medium">Nouveaux messages</span>
                      </div>
                      <div className="flex-1 h-px bg-[#40444b]"></div>
                    </div>
                  )}
                  
                  {/* Message */}
                  <div className={`flex items-start gap-3 group hover:bg-[#36393f] rounded-lg p-2 -m-2 transition-colors ${
                    isNewMessage ? 'bg-[#2b2d31] border-l-4 border-[#5865f2]' : ''
                  }`}>
                    <img
                      src={getAvatarUrl(msg.avatar || "/avatars/avatar1.png")}
                      alt={msg.user}
                      className="w-10 h-10 rounded-full border-2 border-[#23272a] bg-[#23272a] flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">{msg.user}</span>
                        <span className="text-gray-400 text-xs">{new Date(msg.timestamp).toLocaleString('fr-FR', { 
                          day: 'numeric', 
                          month: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                        {isNewMessage && (
                          <span className="text-[#5865f2] text-xs font-medium">Nouveau</span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm break-words">{msg.content}</p>
                    </div>
                    {/* Bouton de suppression pour les modérateurs/admins */}
                    {userPermissions?.canDeleteMessages && (
                      <button
                        onClick={() => handleDeleteMessage(msg._id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all p-1 rounded hover:bg-[#40444b]"
                        title="Supprimer le message"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
        
        {/* Bouton "Descendre" */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-6 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
            title="Descendre aux messages récents"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#23272a] bg-[#36393f]">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={session ? `Message #${channel}` : "Connectez-vous pour participer au chat"}
            className="flex-1 p-3 rounded-lg bg-[#40444b] text-white border-none focus:ring-2 focus:ring-[#5865f2] placeholder-gray-400"
            disabled={!session}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || !session} 
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg px-6 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Envoyer
          </button>
        </form>
      </div>

      {/* Modal des permissions */}
      <ChannelPermissions
        channelName={channel}
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        fetchChannels={fetchChannels}
        setSelectedChannel={setSelectedChannel}
        session={session}
      />

      {/* Modal des membres */}
      <ChannelMembers
        channelName={channel}
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
        session={session}
      />
    </div>
  );
} 