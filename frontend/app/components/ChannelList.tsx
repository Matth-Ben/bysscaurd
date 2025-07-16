"use client";
import { useState } from "react";
import CreateChannelModal from "./CreateChannelModal";

interface Channel {
  _id: string;
  name: string;
  createdAt: string;
  icon?: string;
}

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: string | null;
  onSelectChannel: (channel: string) => void;
  onCreateChannel: (name: string) => Promise<void>;
}

// Fonction utilitaire pour l’URL de l’icône du salon (comme AuthButton)
const getChannelIconUrl = (icon: string | undefined) => {
  let iconUrl = icon || "/icons/default.png";
  if (iconUrl.startsWith('http')) {
    if (iconUrl.includes('localhost:3000/uploads')) {
      iconUrl = iconUrl.replace('localhost:3000', 'localhost:4000');
    } else {
      // déjà une URL complète
    }
  } else if (iconUrl.startsWith('/uploads/')) {
    iconUrl = `http://localhost:4000${iconUrl}`;
  } else {
    iconUrl = `/icons/default.png`;
  }
  return iconUrl;
};

export default function ChannelList({ channels, selectedChannel, onSelectChannel, onCreateChannel }: ChannelListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateChannel = async (name: string) => {
    setCreating(true);
    try {
      await onCreateChannel(name);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Erreur lors de la création du salon:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-[#2f3136] flex flex-col h-screen">
      {/* Channels Section */}
      <div className="flex-1 p-4">
        {/* Channel List */}
        <div className="space-y-1">
          {channels.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm mb-3">Aucun salon disponible</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Créer le premier salon
              </button>
            </div>
          ) : (
            channels.map((channel) => {
              const iconUrl = getChannelIconUrl(channel.icon);
              return (
                <div key={channel._id || channel.name} className="relative group">
                  <button
                    onClick={() => onSelectChannel(channel.name)}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl mb-2 transition-all border-2 ${
                      selectedChannel === channel.name
                        ? "bg-[#5865f2] border-[#5865f2]"
                        : "bg-[#36393f] border-transparent hover:bg-[#40444b]"
                    }`}
                    style={{ position: 'relative' }}
                  >
                    <img src={iconUrl} alt="avatar" className="w-8 h-8 rounded-full" />
                  </button>
                  {/* Tooltip Discord-like */}
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
                    <div className="bg-[#23272a] text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap border border-[#40444b]">
                      #{channel.name}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Bouton d'ajout de salon */}
          <div className="relative group">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl mb-2 transition-all border-2 bg-[#36393f] border-transparent hover:bg-[#40444b] hover:border-[#5865f2]"
              title="Créer un salon"
            >
              <svg className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {/* Tooltip Discord-like */}
            <div className="absolute left-14 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
              <div className="bg-[#23272a] text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap border border-[#40444b]">
                Créer un salon
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateChannel={handleCreateChannel}
        loading={creating}
      />
    </div>
  );
} 