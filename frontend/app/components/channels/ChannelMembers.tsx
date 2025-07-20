"use client";
import { useState, useEffect } from "react";

interface Member {
  email: string;
  role: string;
  name?: string;
  avatar?: string;
  status?: string;
}

interface ChannelMembersProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

// Fonction utilitaire pour l'URL de l'avatar
const getAvatarUrl = (avatarPath: string) => {
  if (!avatarPath) return "/avatars/avatar1.png";
  if (avatarPath.startsWith("http")) return avatarPath;
  if (avatarPath.startsWith("/avatars/")) return `http://localhost:4000${avatarPath}`;
  return avatarPath;
};

// Fonction pour obtenir la couleur du rôle
const getRoleColor = (role: string) => {
  switch (role) {
    case "Admin":
      return "text-red-400";
    case "Modérateur":
      return "text-orange-400";
    default:
      return "text-gray-400";
  }
};

// Fonction pour obtenir la couleur du statut
const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "idle":
      return "bg-yellow-500";
    case "dnd":
      return "bg-red-500";
    case "offline":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

// Fonction pour obtenir l'icône du statut
const getStatusIcon = (status: string) => {
  switch (status) {
    case "online":
      return (
        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-[#2f3136]"></div>
      );
    case "idle":
      return (
        <div className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-[#2f3136] relative">
          <div className="absolute inset-0 bg-yellow-500 rounded-full animate-pulse"></div>
        </div>
      );
    case "dnd":
      return (
        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-[#2f3136]"></div>
      );
    case "offline":
      return (
        <div className="w-3 h-3 bg-gray-500 rounded-full border-2 border-[#2f3136]"></div>
      );
    default:
      return (
        <div className="w-3 h-3 bg-gray-500 rounded-full border-2 border-[#2f3136]"></div>
      );
  }
};

export default function ChannelMembers({ channelId, isOpen, onClose, session }: ChannelMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && channelId && session?.user?.email) {
      fetchMembers();
    }
  }, [isOpen, channelId, session?.user?.email]);

  // Écouter les changements de statut en temps réel
  useEffect(() => {
    if (!isOpen) return;

    const handleStatusChange = (data: { email: string; status: string }) => {
      setMembers(prev => prev.map(member => 
        member.email === data.email 
          ? { ...member, status: data.status }
          : member
      ));
    };

    // Écouter les changements de statut via Socket.io
    if (typeof window !== "undefined" && (window as any).socket) {
      (window as any).socket.on("user_status_changed", handleStatusChange);
    }

    return () => {
      if (typeof window !== "undefined" && (window as any).socket) {
        (window as any).socket.off("user_status_changed", handleStatusChange);
      }
    };
  }, [isOpen]);

  const fetchMembers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `http://localhost:4000/channels/${channelId}/members?userEmail=${encodeURIComponent(session?.user?.email || "")}`
      );
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        setError("Erreur lors du chargement des membres");
      }
    } catch (error) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  // Trier les membres par rôle (Admin, Modérateur, Utilisateur, puis autres)
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { "Admin": 0, "Modérateur": 1, "Utilisateur": 2 };
    const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
    const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
    return aOrder - bOrder;
  });

  // Grouper les membres par rôle
  const membersByRole = sortedMembers.reduce((acc, member) => {
    if (!acc[member.role]) {
      acc[member.role] = [];
    }
    acc[member.role].push(member);
    return acc;
  }, {} as Record<string, Member[]>);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-end z-50">
      <div className="bg-[#2f3136] w-80 h-full flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#23272a] bg-[#36393f]">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
            Membres — {sortedMembers.length}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-[#40444b]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto bg-[#2f3136]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865f2] mx-auto mb-4"></div>
                <p className="text-gray-400 text-sm">Chargement...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 text-center text-sm">{error}</div>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(membersByRole).map(([role, roleMembers]) => (
                <div key={role} className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 mb-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(role === "Admin" ? "online" : "online")}`}></div>
                    <h3 className={`font-medium text-xs uppercase tracking-wide ${getRoleColor(role)}`}>
                      {role} — {roleMembers.length}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {roleMembers.map((member) => (
                      <div key={member.email} className="flex items-center gap-3 p-2 rounded hover:bg-[#40444b] transition-colors group">
                        <div className="relative">
                          <img 
                            src={getAvatarUrl(member.avatar || "")} 
                            alt="Avatar" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          {/* Indicateur de statut */}
                          <div className="absolute -bottom-1 -right-1">
                            {getStatusIcon(member.status || "offline")}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {member.name || member.email.split('@')[0]}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            {member.email}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity ${getRoleColor(role).replace('text-', 'bg-').replace('-400', '-600')}`}>
                          {role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {sortedMembers.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">Aucun membre dans ce salon</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 