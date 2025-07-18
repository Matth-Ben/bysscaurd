"use client";
import { useState, useRef, useEffect } from "react";
import { socketService } from "../../services/socketService";

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

interface MessageItemProps {
  message: Message;
  session: any;
  userPermissions: any;
  onReply: (message: Message) => void;
  getAvatarUrl: (avatarPath: string) => string;
  isNewMessage?: boolean;
  replyToMessage?: Message | null;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "👏", "🔥", "💯"];

export default function MessageItem({ 
  message, 
  session, 
  userPermissions, 
  onReply, 
  getAvatarUrl,
  isNewMessage = false,
  replyToMessage = null
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = message.user === (session?.user?.name || session?.user?.email);
  const canEdit = isOwnMessage;
  const canDelete = isOwnMessage || userPermissions?.canDeleteMessages;

  // Focus sur l'input d'édition quand on entre en mode édition
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  // Fermer les options quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setShowOptions(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      socketService.editMessage({
        messageId: message._id,
        content: editContent.trim(),
        channel: message.channel
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
      socketService.deleteMessage({
        messageId: message._id,
        channel: message.channel
      });
    }
    setShowOptions(false);
  };

  const handleReaction = (emoji: string) => {
    const hasReacted = message.reactions?.some(r => 
      r.emoji === emoji && r.users.includes(session?.user?.email || session?.user?.name)
    );

    socketService.addReaction({
      messageId: message._id,
      emoji,
      channel: message.channel,
      action: hasReacted ? 'remove' : 'add'
    });
    setShowReactions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Fonction pour formater le contenu avec les mentions @
  const formatContent = (content: string) => {
    // Détecter les mentions @username
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // C'est une mention
        return (
          <span key={index} className="text-[#5865f2] font-medium hover:underline cursor-pointer">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`group hover:bg-[#36393f] transition-colors ${isNewMessage ? 'bg-[#2b2d31] border-l-4 border-[#5865f2]' : ''}`}>
      {/* Message auquel on répond */}
      {replyToMessage && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-1 text-xs text-gray-400">
          <div className="w-0.5 h-4 bg-gray-500 rounded-full"></div>
          <span className="font-medium text-[#5865f2]">{replyToMessage.user}</span>
          <span className="truncate">{replyToMessage.content}</span>
        </div>
      )}
      
      <div className="flex items-start gap-3 px-4 py-2">
        <img
          src={getAvatarUrl(message.avatar || "/avatars/avatar1.png")}
          alt={message.user}
          className="w-10 h-10 rounded-full border-2 border-[#23272a] bg-[#23272a] flex-shrink-0"
        />
        
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-semibold text-sm hover:underline cursor-pointer">
              {message.user}
            </span>
            <span className="text-gray-400 text-xs">
              {new Date(message.timestamp).toLocaleString('fr-FR', { 
                day: 'numeric', 
                month: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {message.isEdited && (
              <span className="text-gray-400 text-xs">(modifié)</span>
            )}
            {isNewMessage && (
              <span className="text-[#5865f2] text-xs font-medium">Nouveau</span>
            )}
          </div>
          
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                ref={editInputRef}
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 p-2 rounded bg-[#40444b] text-white border border-[#5865f2] focus:outline-none focus:ring-1 focus:ring-[#5865f2]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-sm transition-colors"
                >
                  Sauvegarder
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-[#40444b] hover:bg-[#4f545c] text-white rounded text-sm transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-300 text-sm break-words leading-relaxed">
                {formatContent(message.content)}
              </p>
              
              {/* Réactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {message.reactions.map((reaction, index) => {
                    const hasReacted = reaction.users.includes(session?.user?.email || session?.user?.name);
                    return (
                      <button
                        key={`${reaction.emoji}-${index}`}
                        onClick={() => handleReaction(reaction.emoji)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                          hasReacted 
                            ? 'bg-[#5865f2] text-white' 
                            : 'bg-[#40444b] text-gray-300 hover:bg-[#4f545c]'
                        }`}
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Options du message */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-[#40444b]"
            title="Options du message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showOptions && (
            <div 
              ref={optionsRef}
              className="absolute right-0 top-8 bg-[#2f3136] border border-[#23272a] rounded-lg shadow-lg z-10 min-w-48"
            >
              <div className="p-1">
                <button
                  onClick={() => onReply(message)}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-[#40444b] rounded text-sm transition-colors"
                >
                  Répondre
                </button>
                
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-[#40444b] rounded text-sm transition-colors"
                >
                  Réagir
                </button>
                
                {canEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-[#40444b] rounded text-sm transition-colors"
                  >
                    Modifier
                  </button>
                )}
                
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-[#40444b] rounded text-sm transition-colors"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Menu des réactions */}
          {showReactions && (
            <div className="absolute right-0 top-8 bg-[#2f3136] border border-[#23272a] rounded-lg shadow-lg z-10 p-2">
              <div className="grid grid-cols-5 gap-1">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#40444b] rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 