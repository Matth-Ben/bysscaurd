"use client";
import { useState } from "react";
import CreateChannelModal from "./CreateChannelModal";

interface Channel {
  _id: string;
  name: string;
  createdAt: string;
}

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: string | null;
  onSelectChannel: (channel: string) => void;
  onCreateChannel: (name: string) => Promise<void>;
}

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
    <div className="w-64 bg-[#2f3136] flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-[#23272a]">
        <h1 className="text-white font-bold text-lg">Discord Lite</h1>
      </div>

      {/* Channels Section */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-300 font-semibold text-sm uppercase tracking-wide">Salons</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Créer un salon"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

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
            channels.map((channel) => (
              <button
                key={channel._id}
                onClick={() => onSelectChannel(channel.name)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
                  selectedChannel === channel.name
                    ? "bg-[#5865f2] text-white"
                    : "text-gray-300 hover:bg-[#36393f] hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                <span className="font-medium">#{channel.name}</span>
              </button>
            ))
          )}
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