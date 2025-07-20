"use client";
import { useState } from "react";
import CreateServerChannelModal from "./CreateServerChannelModal";
import ServerPermissions from "./ServerPermissions";

interface Channel {
  _id: string;
  name: string;
  description: string;
  type: 'text' | 'voice';
  position: number;
  isPrivate: boolean;
  createdAt: string;
}

interface Server {
  _id: string;
  name: string;
  description: string;
  owner: string;
}

interface ServerChannelListProps {
  server: Server | null;
  channels: Channel[];
  selectedChannel: string | null;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: (name: string, description: string, type: 'text' | 'voice', isPrivate?: boolean, allowedRoles?: string[]) => Promise<void>;
  currentUserEmail: string;
  userPermissions?: any;
}

export default function ServerChannelList({ 
  server, 
  channels, 
  selectedChannel, 
  onSelectChannel, 
  onCreateChannel, 
  currentUserEmail,
  userPermissions
}: ServerChannelListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showServerPermissions, setShowServerPermissions] = useState(false);

  const handleCreateChannel = async (name: string, description: string, type: 'text' | 'voice', isPrivate?: boolean, allowedRoles?: string[]) => {
    setCreating(true);
    try {
      await onCreateChannel(name, description, type, isPrivate, allowedRoles);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Erreur lors de la création du salon:", error);
    } finally {
      setCreating(false);
    }
  };

  if (!server) {
    return (
      <div className="w-60 bg-[#2f3136] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm">Sélectionnez un serveur</p>
        </div>
      </div>
    );
  }

  const canCreateChannel = server.owner === currentUserEmail || userPermissions?.canManageChannels;

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col">
      {/* Header du serveur */}
      <div className="p-4 border-b border-[#23272a]">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{server.name}</h1>
            {server.description && (
              <p className="text-gray-400 text-sm mt-1 truncate">{server.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowServerPermissions(true)}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-[#40444b] ml-2 flex-shrink-0"
            title="Paramètres du serveur"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Liste des salons */}
      <div className="flex-1 p-2 space-y-1">
        {channels.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mb-3">Aucun salon</p>
            {canCreateChannel && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Créer le premier salon
              </button>
            )}
          </div>
        ) : (
          channels.map((channel) => (
            <button
              key={channel._id}
              onClick={() => onSelectChannel(channel._id)}
              className={`w-full flex items-center gap-3 px-2 py-1.5 rounded text-left transition-colors group ${
                selectedChannel === channel._id
                  ? "bg-[#40444b] text-white"
                  : "text-gray-300 hover:bg-[#40444b] hover:text-white"
              }`}
            >
              {/* Icône du salon */}
              <div className="flex-shrink-0">
                {channel.type === 'text' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                )}
              </div>
              
              {/* Nom du salon */}
              <span className="flex-1 truncate">#{channel.name}</span>
              
              {/* Indicateur privé */}
              {channel.isPrivate && (
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              )}
            </button>
          ))
        )}
        
        {/* Bouton d'ajout de salon */}
        {canCreateChannel && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded text-gray-400 hover:bg-[#40444b] hover:text-white transition-colors group"
            title="Créer un salon"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">Créer un salon</span>
          </button>
        )}
      </div>

      {/* Modal de création de salon */}
      <CreateServerChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateChannel={handleCreateChannel}
        loading={creating}
        userPermissions={userPermissions}
      />

      {/* Modal des paramètres du serveur */}
      <ServerPermissions
        serverId={server._id}
        serverName={server.name}
        isOpen={showServerPermissions}
        onClose={() => setShowServerPermissions(false)}
        session={{ user: { email: currentUserEmail } }}
        userPermissions={userPermissions}
      />
    </div>
  );
} 