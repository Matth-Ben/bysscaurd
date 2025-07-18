"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { socketService } from "../../services/socketService";
import ChannelPermissions from "../channels/ChannelPermissions";
import ChannelMembers from "../channels/ChannelMembers";
import OnlineMembers from "../channels/OnlineMembers";
import MessageItem from "./MessageItem";
import MentionAutocomplete from "./MentionAutocomplete";
import EmojiPicker from "./EmojiPicker";
import { replaceTextEmojis, hasTextEmojis } from "../../utils/emojiMapping";

interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

interface Message {
  _id: string;
  user: string;
  content: string;
  channel: string;
  timestamp: string;
  avatar?: string;
  editedAt?: string;
  isEdited?: boolean;
  replyTo?: string;
  reactions?: Reaction[];
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
  const [showOnlineMembers, setShowOnlineMembers] = useState(true);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [isChannelAdmin, setIsChannelAdmin] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [channelUsers, setChannelUsers] = useState<any[]>([]);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
  const [highlightedMessage, setHighlightedMessage] = useState<string | null>(null);

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

    const unsubscribeMessageUpdate = socketService.onMessageUpdate((updatedMessage: Message) => {
      console.log("Chat: Message mis à jour reçu", updatedMessage);
      setMessages(prev => prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      ));
    });

    // Demander l'historique des messages pour ce salon
    console.log("Chat: Demande d'historique pour le salon:", channel);
    socketService.getMessageHistory(channel, 0, 50);

    return () => {
      unsubscribeMessage();
      unsubscribeHistory();
      unsubscribeDelete();
      unsubscribeMessageUpdate();
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

  // Charger les permissions et les utilisateurs du channel
  useEffect(() => {
    if (channel && session?.user?.email) {
      fetchUserPermissions();
      fetchChannelUsers();
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

  const fetchChannelUsers = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/channels/${encodeURIComponent(channel)}/members?userEmail=${encodeURIComponent(session?.user?.email || "")}`
      );
      if (response.ok) {
        const data = await response.json();
        setChannelUsers(data.members || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
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
    
    // Remplacer les emojis textuels par des emojis Unicode
    console.log("Chat: Texte original:", input);
    const processedContent = replaceTextEmojis(input);
    console.log("Chat: Texte après remplacement:", processedContent);
    
    const messageData = { 
      user, 
      content: processedContent, 
      channel,
      replyTo: replyingTo?._id 
    };
    console.log("Chat: Envoi du message", messageData);
    
    // Créer un message temporaire pour affichage immédiat
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      user,
      content: processedContent,
      channel,
      timestamp: new Date().toISOString(),
      avatar: session?.user?.image || "/avatars/avatar1.png",
      replyTo: replyingTo?._id
    };
    
    // Ajouter le message temporaire à l'affichage
    setMessages(prev => [...prev, tempMessage]);
    
    // Envoyer le message via Socket.io
    socketService.sendMessage(messageData);
    setInput("");
    setReplyingTo(null);
  };

  const handleReply = (message: Message, isReferenceClick: boolean = false) => {
    // Si c'est un clic sur le message de référence, on le met en avant
    if (isReferenceClick) {
      highlightMessage(message._id);
      scrollToMessage(message._id);
      return;
    }
    
    setReplyingTo(message);
    // Focus sur l'input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const highlightMessage = (messageId: string) => {
    setHighlightedMessage(messageId);
    
    // Retirer la mise en avant après 5 secondes
    setTimeout(() => {
      setHighlightedMessage(null);
    }, 5000);
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Vérifier si on tape @ pour afficher l'autocomplétion
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1) {
      const afterAt = value.slice(atIndex + 1);
      const hasSpaceAfterAt = afterAt.includes(' ');
      
      // Afficher l'autocomplétion seulement si on n'a pas d'espace après @
      if (!hasSpaceAfterAt) {
        setShowMentionAutocomplete(true);
      } else {
        setShowMentionAutocomplete(false);
      }
    } else {
      setShowMentionAutocomplete(false);
    }
  };

  const handleSelectUser = (user: any) => {
    const atIndex = input.lastIndexOf('@');
    if (atIndex !== -1) {
      const beforeAt = input.slice(0, atIndex);
      const afterAt = input.slice(atIndex + 1);
      const afterSpace = afterAt.includes(' ') ? afterAt.slice(afterAt.indexOf(' ')) : '';
      const username = user.name || user.email.split('@')[0];
      const newInput = beforeAt + '@' + username + ' ' + afterSpace;
      setInput(newInput);
    }
    setShowMentionAutocomplete(false);
    
    // Focus sur l'input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      setShowMentionAutocomplete(true);
    } else if (e.key === 'Escape') {
      setShowMentionAutocomplete(false);
      setShowEmojiPicker(false);
    } else if (showMentionAutocomplete && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Tab')) {
      // Empêcher la propagation pour permettre la navigation dans l'autocomplétion
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    
    // Focus sur l'input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputBlur = () => {
    // Fermer l'autocomplétion après un délai pour permettre la sélection
    setTimeout(() => {
      setShowMentionAutocomplete(false);
    }, 150);
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
    <div className="flex-1 flex bg-[#313338] relative h-dvh">
      {/* Zone principale du chat */}
      <div className="flex-1 flex flex-col">
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
              onClick={() => setShowOnlineMembers(!showOnlineMembers)}
              className={`transition-colors p-2 rounded hover:bg-[#40444b] ${showOnlineMembers ? 'text-white bg-[#40444b]' : 'text-gray-400 hover:text-white'}`}
              title={showOnlineMembers ? "Masquer les membres connectés" : "Afficher les membres connectés"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowMembers(true)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-[#40444b]"
              title="Voir tous les membres"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
      <div className="flex-1 overflow-y-auto custom-scrollbar relative" onScroll={handleScroll} ref={messagesContainerRef}>
        <div className="p-4 space-y-0">
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
              const isNewMessage = !!(lastReadTimestamp && new Date(msg.timestamp) > lastReadTimestamp);
              const showDivider = isNewMessage && index === 0;
              
              // Trouver le message auquel on répond
              const replyToMessage = msg.replyTo ? messages.find(m => m._id === msg.replyTo) : null;
              
              const isHighlighted = highlightedMessage === msg._id;
              
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
                  <div 
                    id={`message-${msg._id}`}
                    className={`transition-all duration-500 ${
                      isHighlighted 
                        ? 'bg-[#5865f2]/20 border-l-4 border-[#5865f2] shadow-lg' 
                        : ''
                    }`}
                  >
                    <MessageItem
                      message={msg}
                      session={session}
                      userPermissions={userPermissions}
                      onReply={handleReply}
                      getAvatarUrl={getAvatarUrl}
                      isNewMessage={isNewMessage}
                      replyToMessage={replyToMessage}
                    />
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
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#23272a] bg-[#36393f] relative">
        {/* Indicateur de réponse */}
        {replyingTo && (
          <div className="flex items-center justify-between p-2 mb-2 bg-[#40444b] rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Répondre à</span>
              <span className="text-white text-sm font-medium">{replyingTo.user}</span>
              <span className="text-gray-400 text-sm">:</span>
              <span className="text-gray-300 text-sm truncate max-w-xs">{replyingTo.content}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <form onSubmit={handleSend} className="flex gap-3 relative">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#40444b] border border-transparent focus-within:border-[#5865f2] focus-within:ring-2 focus-within:ring-[#5865f2]">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Ajouter un emoji"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                placeholder={session ? `Message #${channel}` : "Connectez-vous pour participer au chat"}
                className="flex-1 bg-transparent text-white border-none outline-none placeholder-gray-400"
                disabled={!session}
              />
              
              {/* Indicateur d'emojis textuels détectés */}
              {hasTextEmojis(input) && (
                <div className="text-xs text-[#5865f2] bg-[#5865f2]/10 px-2 py-1 rounded">
                  Emojis détectés
                </div>
              )}
            </div>
            
            {/* Autocomplétion des mentions */}
            <MentionAutocomplete
              inputValue={input}
              onSelectUser={handleSelectUser}
              users={channelUsers}
              isVisible={showMentionAutocomplete}
              onClose={() => setShowMentionAutocomplete(false)}
            />
            
            {/* Sélecteur d'emojis */}
            <EmojiPicker
              onSelectEmoji={handleSelectEmoji}
              isVisible={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
          
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

      {/* Liste des membres connectés */}
      {showOnlineMembers && session && (
        <OnlineMembers
          channelName={channel}
          session={session}
        />
      )}
    </div>
  );
} 