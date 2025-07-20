"use client";
import { useState } from "react";
import CreateServerModal from "./CreateServerModal";

interface Server {
  _id: string;
  name: string;
  description: string;
  icon?: string;
  owner: string;
  createdAt: string;
}

interface ServerListProps {
  servers: Server[];
  selectedServer: string | null;
  onSelectServer: (serverId: string) => void;
  onCreateServer: (name: string, description: string) => Promise<void>;
  currentUserEmail: string;
}

// Fonction utilitaire pour l'URL de l'icône du serveur
const getServerIconUrl = (icon: string | undefined) => {
  let iconUrl = icon || "/icons/default.png";
  if (iconUrl.startsWith('http')) {
    if (iconUrl.includes('localhost:3000/uploads')) {
      iconUrl = iconUrl.replace('localhost:3000', 'localhost:4000');
    }
  } else if (iconUrl.startsWith('/uploads/')) {
    iconUrl = `http://localhost:4000${iconUrl}`;
  } else {
    iconUrl = `/icons/default.png`;
  }
  return iconUrl;
};

export default function ServerList({ 
  servers, 
  selectedServer, 
  onSelectServer, 
  onCreateServer, 
  currentUserEmail 
}: ServerListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateServer = async (name: string, description: string) => {
    setCreating(true);
    try {
      await onCreateServer(name, description);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Erreur lors de la création du serveur:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col w-20 bg-[#202225] p-3 space-y-2">
      {/* Serveur personnel (DM) */}
      <div className="relative group">
        <button
          onClick={() => onSelectServer("dm")}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all border-2 relative ${
            selectedServer === "dm"
              ? "bg-[#5865f2] border-[#5865f2]"
              : "bg-[#36393f] border-transparent hover:bg-[#40444b]"
          }`}
          title="Messages privés"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        
        {/* Indicateur de sélection */}
        {selectedServer === "dm" && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
        )}
        
        {/* Tooltip Discord-like */}
        <div className="absolute left-14 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
          <div className="bg-[#23272a] text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap border border-[#40444b]">
            Messages privés
          </div>
        </div>
      </div>

      {/* Séparateur */}
      <div className="w-8 h-px bg-[#40444b] mx-auto"></div>

      {/* Liste des serveurs */}
      {servers.map((server) => (
        <div key={server._id} className="relative group">
          <button
            onClick={() => onSelectServer(server._id)}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all border-2 relative ${
              selectedServer === server._id
                ? "bg-[#5865f2] border-[#5865f2]"
                : "bg-[#36393f] border-transparent hover:bg-[#40444b]"
            }`}
            title={server.name}
          >
            <img 
              src={getServerIconUrl(server.icon)} 
              alt={server.name} 
              className="w-8 h-8 rounded-full object-cover"
            />
            
            {/* Indicateur si propriétaire */}
            {server.owner === currentUserEmail && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#5865f2] rounded-full border-2 border-[#202225]"></div>
            )}
          </button>
          
          {/* Indicateur de sélection */}
          {selectedServer === server._id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
          )}
          
          {/* Tooltip Discord-like */}
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
            <div className="bg-[#23272a] text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap border border-[#40444b]">
              {server.name}
            </div>
          </div>
        </div>
      ))}
      
      {/* Bouton d'ajout de serveur */}
      <div className="relative group">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl transition-all border-2 bg-[#36393f] border-transparent hover:bg-[#40444b] hover:border-[#5865f2]"
          title="Créer un serveur"
        >
          <svg className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        {/* Tooltip Discord-like */}
        <div className="absolute left-14 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
          <div className="bg-[#23272a] text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap border border-[#40444b]">
            Créer un serveur
          </div>
        </div>
      </div>

      {/* Modal de création de serveur */}
      <CreateServerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateServer={handleCreateServer}
        loading={creating}
      />
    </div>
  );
} 