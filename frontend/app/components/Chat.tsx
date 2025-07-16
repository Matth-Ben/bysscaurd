"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import ChannelPermissions from "./ChannelPermissions";
import ChannelMembers from "./ChannelMembers";

interface Message {
  _id: string;
  user: string;
  content: string;
  channel: string;
  timestamp: string;
  avatar?: string;
}

let socket: Socket | null = null;

interface Props {
  channel: string;
  channels: any[];
  setChannels: (channels: any[]) => void;
  fetchChannels: (userEmail: string) => Promise<void>;
  setSelectedChannel: (name: string) => void;
  session: any;
}

export default function Chat({ channel, channels, setChannels, fetchChannels, setSelectedChannel, session }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [isChannelAdmin, setIsChannelAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Construire l'URL de l'avatar (gérer les avatars uploadés et par défaut)
  const getAvatarUrl = (avatarPath: string) => {
    if (avatarPath.startsWith('http')) {
      if (avatarPath.includes('localhost:3000/uploads')) {
        return avatarPath.replace('localhost:3000', 'localhost:4000');
      }
      return avatarPath;
    }
    // Si c'est un avatar uploadé (commence par /uploads/)
    if (avatarPath.startsWith('/uploads/')) {
      return `http://localhost:4000${avatarPath}`;
    }
    // Sinon, c'est un avatar par défaut
    return `http://localhost:3000${avatarPath}`;
  };

  useEffect(() => {
    if (!socket) {
      socket = io(typeof window !== "undefined" ? "ws://localhost:4000" : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });
      // Exposer le socket globalement pour que ChannelMembers puisse y accéder
      if (typeof window !== "undefined") {
        (window as any).socket = socket;
      }
    }
    
    // Authentifier l'utilisateur
    if (session?.user?.email) {
      socket.emit("authenticate", session.user.email);
    }
    
    if (channel) {
      socket.emit("join_channel", channel);
      socket.on("message_history", (history: Message[]) => {
        setMessages(history);
      });
      socket.on("message", (msg: Message) => {
        if (msg.channel === channel) setMessages(prev => [...prev, msg]);
      });
      socket.on("message_deleted", (data: { messageId: string }) => {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      });
    }
    
    return () => {
      if (channel) socket?.emit("leave_channel", channel);
      socket?.off("message_history");
      socket?.off("message");
      socket?.off("message_deleted");
    };
  }, [channel, session?.user?.email]);

  // Charger les permissions de l'utilisateur
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    const user = session?.user?.name || session?.user?.email || "Anonyme";
    socket.emit("message", { user, content: input, channel });
    setInput("");
  }

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

  // Passer les props nécessaires à ChannelPermissions
  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative">
      {/* Channel Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#23272a] bg-[#36393f]">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <h1 className="text-white font-bold text-lg">#{channel}</h1>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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
          messages.map(msg => (
            <div key={msg._id} className="flex items-start gap-3 group hover:bg-[#36393f] rounded-lg p-2 -m-2 transition-colors">
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
          ))
        )}
        <div ref={messagesEndRef} />
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