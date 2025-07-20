"use client";
import { useState, useEffect } from "react";
import { socketService } from "../../services/socketService";

interface OnlineMember {
  email: string;
  role: string;
  name?: string;
  avatar?: string;
  status: string;
}

interface OnlineMembersProps {
  serverId: string;
  session: any;
}

export default function OnlineMembers({ serverId, session }: OnlineMembersProps) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [totalOnline, setTotalOnline] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(false);

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

  // Obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "dnd": return "bg-red-500";
      case "offline": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  // Obtenir la couleur du rôle
  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin": return "text-red-400";
      case "Modérateur": return "text-orange-400";
      case "Utilisateur": return "text-blue-400";
      default: return "text-gray-400";
    }
  };

  // Charger les membres connectés
  const fetchOnlineMembers = async () => {
    if (!serverId || !session?.user?.email) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:4000/servers/${serverId}/online-members?userEmail=${encodeURIComponent(session.user.email)}`
      );
      if (response.ok) {
        const data = await response.json();
        setOnlineMembers(data.onlineMembers || []);
        setTotalOnline(data.totalOnline || 0);
        setTotalMembers(data.totalMembers || 0);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des membres connectés:", error);
    } finally {
      setLoading(false);
    }
  };

  // Écouter les changements de statut en temps réel
  useEffect(() => {
    if (!serverId) return;

    const handleUserJoined = (data: { email: string; status: string; channel: string }) => {
      if (data.channel === serverId) {
        setOnlineMembers(prev => {
          const existing = prev.find(m => m.email === data.email);
          if (existing) {
            return prev.map(m => m.email === data.email ? { ...m, status: data.status } : m);
          } else {
            // Ajouter le nouveau membre (sera mis à jour lors du prochain fetch)
            return [...prev, { email: data.email, status: data.status, role: "Utilisateur" }];
          }
        });
      }
    };

    const handleUserLeft = (data: { email: string; status: string; channel: string }) => {
      if (data.channel === serverId) {
        setOnlineMembers(prev => prev.map(m => 
          m.email === data.email ? { ...m, status: data.status } : m
        ));
      }
    };

    const handleStatusChange = (data: { email: string; status: string }) => {
      setOnlineMembers(prev => prev.map(member => 
        member.email === data.email 
          ? { ...member, status: data.status }
          : member
      ));
    };

    // S'abonner aux événements Socket.io
    const unsubscribeJoined = socketService.onUserJoined(handleUserJoined);
    const unsubscribeLeft = socketService.onUserLeft(handleUserLeft);
    const unsubscribeStatus = socketService.onStatusChange(handleStatusChange);

    return () => {
      unsubscribeJoined();
      unsubscribeLeft();
      unsubscribeStatus();
    };
  }, [serverId]);

  // Charger les membres connectés au montage et quand le serveur change
  useEffect(() => {
    fetchOnlineMembers();
  }, [serverId, session?.user?.email]);

  // Rafraîchir périodiquement (toutes les 30 secondes)
  useEffect(() => {
    const interval = setInterval(fetchOnlineMembers, 30000);
    return () => clearInterval(interval);
  }, [serverId, session?.user?.email]);

  // Trier les membres par rôle et statut
  const sortedMembers = [...onlineMembers].sort((a, b) => {
    const roleOrder = { "Admin": 0, "Modérateur": 1, "Utilisateur": 2 };
    const statusOrder = { "online": 0, "idle": 1, "dnd": 2, "offline": 3 };
    
    const aRoleOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
    const bRoleOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
    
    if (aRoleOrder !== bRoleOrder) {
      return aRoleOrder - bRoleOrder;
    }
    
    const aStatusOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
    const bStatusOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
    
    return aStatusOrder - bStatusOrder;
  });

  // Grouper les membres par statut
  const membersByStatus = sortedMembers.reduce((acc, member) => {
    const status = member.status === "online" ? "En ligne" : 
                   member.status === "idle" ? "Inactif" :
                   member.status === "dnd" ? "Ne pas déranger" : "Hors ligne";
    
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(member);
    return acc;
  }, {} as Record<string, OnlineMember[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5865f2]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#2f3136] border-l border-[#23272a] w-60 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[#23272a] bg-[#36393f]">
        <h3 className="text-white font-semibold text-sm">
          Membres connectés — {totalOnline}/{totalMembers}
        </h3>
      </div>

      {/* Liste des membres */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(membersByStatus).map(([status, members]) => (
          <div key={status} className="mb-3">
            <div className="flex items-center gap-2 px-2 py-1 mb-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(members[0]?.status || "offline")}`}></div>
              <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                {status} — {members.length}
              </h4>
            </div>
            
            {members.map((member) => (
              <div key={member.email} className="flex items-center gap-2 p-2 rounded hover:bg-[#40444b] transition-colors group">
                <div className="relative">
                  <img 
                    src={getAvatarUrl(member.avatar || "/avatars/avatar1.png")} 
                    alt="Avatar" 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  {/* Indicateur de statut */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2f3136] ${getStatusColor(member.status)}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {member.name || member.email.split('@')[0]}
                  </p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity ${getRoleColor(member.role).replace('text-', 'bg-').replace('-400', '-600')}`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        ))}
        
        {sortedMembers.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-xs">Aucun membre connecté</p>
          </div>
        )}
      </div>
    </div>
  );
} 