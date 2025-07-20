"use client";
import { useState, useEffect } from "react";

interface Permissions {
  [key: string]: boolean;
}

interface RoleMap {
  [role: string]: Permissions;
}

interface Member {
  email: string;
  role: string;
  name?: string;
  avatar?: string;
  status?: string;
}

interface ServerPermissionsProps {
  serverId: string;
  serverName: string;
  isOpen: boolean;
  onClose: () => void;
  session: any;
  userPermissions?: any;
}

const BASE_ROLES = ["Admin", "Modérateur", "Utilisateur"];

export default function ServerPermissions({ 
  serverId, 
  serverName, 
  isOpen, 
  onClose, 
  session,
  userPermissions 
}: ServerPermissionsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // États pour les permissions
  const [userRole, setUserRole] = useState("");
  const [permissions, setPermissions] = useState<Permissions>({});
  const [allRoles, setAllRoles] = useState<RoleMap>({});
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  
  // États pour la création de rôles
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<Permissions>({});
  
  // États pour les paramètres du serveur
  const [serverDescription, setServerDescription] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  useEffect(() => {
    if (isOpen && session?.user?.email) {
      fetchServerData();
    }
  }, [isOpen, session?.user?.email]);

  const fetchServerData = async () => {
    setLoading(true);
    setError("");
    try {
      // Récupérer les permissions du serveur
      const permissionsResponse = await fetch(
        `http://localhost:4000/servers/${serverId}/permissions?userEmail=${encodeURIComponent(session?.user?.email || "")}`
      );
      
      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setUserRole(permissionsData.userRole);
        setPermissions(permissionsData.permissions);
        setIsOwner(permissionsData.isOwner);
      }
      
      // Récupérer les membres du serveur
      const membersResponse = await fetch(
        `http://localhost:4000/servers/${serverId}/members?userEmail=${encodeURIComponent(session?.user?.email || "")}`
      );
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
      }
      
      // Récupérer les informations du serveur
      const serverResponse = await fetch(
        `http://localhost:4000/servers/${serverId}?userEmail=${encodeURIComponent(session?.user?.email || "")}`
      );
      
      if (serverResponse.ok) {
        const serverData = await serverResponse.json();
        setServerDescription(serverData.server.description || "");
      }
      
    } catch (error) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  // Gestion des permissions d'un rôle
  const handleRolePermissionChange = (role: string, perm: string, value: boolean) => {
    setAllRoles(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [perm]: value
      }
    }));
  };

  // Création d'un rôle
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          roleName: newRoleName.trim(),
          permissions: newRolePerms
        })
      });
      if (response.ok) {
        setNewRoleName("");
        setNewRolePerms({});
        await fetchServerData();
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de la création du rôle");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Modification d'un rôle
  const handleEditRole = async (role: string) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}/roles/${encodeURIComponent(role)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          permissions: allRoles[role]
        })
      });
      if (response.ok) {
        await fetchServerData();
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de la modification du rôle");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Suppression d'un rôle
  const handleDeleteRole = async (role: string) => {
    if (BASE_ROLES.includes(role)) return;
    if (!window.confirm(`Supprimer le rôle ${role} ?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}/roles/${encodeURIComponent(role)}?userEmail=${encodeURIComponent(session?.user?.email || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchServerData();
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de la suppression du rôle");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Gestion des membres
  const handleChangeMemberRole = async (memberEmail: string, role: string) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}/members/${encodeURIComponent(memberEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          role
        })
      });
      if (response.ok) {
        await fetchServerData();
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors du changement de rôle");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberEmail: string) => {
    if (!window.confirm(`Retirer ${memberEmail} du serveur ?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}/members/${encodeURIComponent(memberEmail)}?userEmail=${encodeURIComponent(session?.user?.email || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchServerData();
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors du retrait du membre");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Ajout d'un membre (par email ou pseudo)
  const [inviteInput, setInviteInput] = useState("");
  const [inviteRole, setInviteRole] = useState("Utilisateur");
  const handleInvite = async () => {
    if (!inviteInput.trim()) return;
    setSaving(true);
    setError("");
    try {
      const body: any = {
        userEmail: session?.user?.email,
        role: inviteRole
      };
      // Détection email ou pseudo
      if (inviteInput.includes("@")) {
        body.inviteEmail = inviteInput.trim();
      } else {
        body.inviteName = inviteInput.trim();
      }
      const response = await fetch(`http://localhost:4000/servers/${serverId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setInviteInput("");
        setInviteRole("Utilisateur");
        await fetchServerData();
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de l'invitation");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Gestion du lien d'invitation
  const fetchInviteLink = async () => {
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}/invite-link?userEmail=${encodeURIComponent(session?.user?.email || "")}`);
      if (response.ok) {
        const data = await response.json();
        setInviteToken(data.inviteLink);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du lien d'invitation:", error);
    }
  };

  const handleCopyLink = async () => {
    if (inviteToken) {
      try {
        await navigator.clipboard.writeText(inviteToken);
        // Optionnel: afficher un toast de confirmation
      } catch (error) {
        console.error("Erreur lors de la copie:", error);
      }
    }
  };

  // Suppression du serveur
  const handleDeleteServer = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le serveur "${serverName}" ? Cette action est irréversible.`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}?userEmail=${encodeURIComponent(session?.user?.email || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onClose();
        // Optionnel: rediriger vers la liste des serveurs
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de la suppression du serveur");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Quitter le serveur
  const handleLeaveServer = async () => {
    if (!window.confirm(`Quitter le serveur "${serverName}" ?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}/leave?userEmail=${encodeURIComponent(session?.user?.email || "")}`, {
        method: "POST"
      });
      if (response.ok) {
        onClose();
        // Optionnel: rediriger vers la liste des serveurs
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de la sortie du serveur");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarder les paramètres du serveur
  const handleSaveSettings = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/servers/${serverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          description: serverDescription
        })
      });
      if (response.ok) {
        await fetchServerData();
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de la sauvegarde");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#36393f] rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23272a]">
          <div>
            <h2 className="text-xl font-bold text-white">Paramètres du serveur</h2>
            <p className="text-gray-400 text-sm mt-1">{serverName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={saving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#23272a]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "text-white border-b-2 border-[#5865f2]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "text-white border-b-2 border-[#5865f2]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Membres
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "roles"
                ? "text-white border-b-2 border-[#5865f2]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Rôles
          </button>
          <button
            onClick={() => setActiveTab("invites")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "invites"
                ? "text-white border-b-2 border-[#5865f2]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Invitations
          </button>
          <button
            onClick={() => setActiveTab("danger")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "danger"
                ? "text-red-400 border-b-2 border-red-400"
                : "text-gray-400 hover:text-red-400"
            }`}
          >
            Zone de danger
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#5865f2]"></div>
                <span>Chargement...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Aperçu */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Informations du serveur</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={serverDescription}
                          onChange={(e) => setServerDescription(e.target.value)}
                          className="w-full p-3 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none transition-colors resize-none"
                          rows={3}
                          placeholder="Description du serveur"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveSettings}
                          disabled={saving}
                          className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50"
                        >
                          {saving ? "Sauvegarde..." : "Sauvegarder"}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Vos permissions</h3>
                    <div className="bg-[#23272a] rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(permissions).map(([perm, value]) => (
                          <div key={perm} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-gray-300 text-sm">{perm}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Membres */}
              {activeTab === "members" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Membres du serveur</h3>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.email} className="flex items-center justify-between p-3 bg-[#23272a] rounded-lg">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatar || "/avatars/avatar1.png"}
                              alt={member.name || member.email}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="text-white font-medium">{member.name || member.email.split('@')[0]}</div>
                              <div className="text-gray-400 text-sm">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeMemberRole(member.email, e.target.value)}
                              disabled={!userPermissions?.canManageMembers || member.email === session?.user?.email}
                              className="bg-[#40444b] text-white text-sm rounded px-2 py-1 border border-[#23272a] focus:border-[#5865f2] focus:outline-none"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Modérateur">Modérateur</option>
                              <option value="Utilisateur">Utilisateur</option>
                            </select>
                            {userPermissions?.canManageMembers && member.email !== session?.user?.email && (
                              <button
                                onClick={() => handleRemoveMember(member.email)}
                                className="text-red-400 hover:text-red-300 transition-colors p-1"
                                title="Retirer du serveur"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inviter un membre */}
                  {userPermissions?.canInviteUsers && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Inviter un membre</h3>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={inviteInput}
                          onChange={(e) => setInviteInput(e.target.value)}
                          placeholder="Email ou pseudo"
                          className="flex-1 p-3 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none transition-colors"
                        />
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="bg-[#40444b] text-white text-sm rounded px-3 py-3 border border-[#23272a] focus:border-[#5865f2] focus:outline-none"
                        >
                          <option value="Utilisateur">Utilisateur</option>
                          <option value="Modérateur">Modérateur</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <button
                          onClick={handleInvite}
                          disabled={!inviteInput.trim() || saving}
                          className="px-4 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50"
                        >
                          {saving ? "Invitation..." : "Inviter"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rôles */}
              {activeTab === "roles" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Rôles du serveur</h3>
                    <div className="space-y-4">
                      {Object.entries(allRoles).map(([roleName, rolePerms]) => (
                        <div key={roleName} className="bg-[#23272a] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-medium">{roleName}</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditRole(roleName)}
                                disabled={saving}
                                className="text-[#5865f2] hover:text-[#4752c4] transition-colors text-sm"
                              >
                                Modifier
                              </button>
                              {!BASE_ROLES.includes(roleName) && (
                                <button
                                  onClick={() => handleDeleteRole(roleName)}
                                  disabled={saving}
                                  className="text-red-400 hover:text-red-300 transition-colors text-sm"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(rolePerms).map(([perm, value]) => (
                              <label key={perm} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={(e) => handleRolePermissionChange(roleName, perm, e.target.checked)}
                                  disabled={saving || BASE_ROLES.includes(roleName)}
                                  className="text-[#5865f2] focus:ring-[#5865f2]"
                                />
                                <span className="text-gray-300 text-sm">{perm}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Créer un nouveau rôle */}
                  {userPermissions?.canManageRoles && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Créer un nouveau rôle</h3>
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="Nom du rôle"
                          className="w-full p-3 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none transition-colors"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {Object.keys(permissions).map((perm) => (
                            <label key={perm} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newRolePerms[perm] || false}
                                onChange={(e) => setNewRolePerms(prev => ({ ...prev, [perm]: e.target.checked }))}
                                className="text-[#5865f2] focus:ring-[#5865f2]"
                              />
                              <span className="text-gray-300 text-sm">{perm}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          onClick={handleCreateRole}
                          disabled={!newRoleName.trim() || saving}
                          className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50"
                        >
                          {saving ? "Création..." : "Créer le rôle"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Invitations */}
              {activeTab === "invites" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Lien d'invitation</h3>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={inviteToken}
                          readOnly
                          placeholder="Cliquez sur 'Générer' pour créer un lien d'invitation"
                          className="flex-1 p-3 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none transition-colors"
                        />
                        <button
                          onClick={fetchInviteLink}
                          className="px-4 py-3 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors"
                        >
                          Générer
                        </button>
                        <button
                          onClick={handleCopyLink}
                          disabled={!inviteToken}
                          className="px-4 py-3 bg-[#40444b] hover:bg-[#2f3136] text-white rounded font-medium transition-colors disabled:opacity-50"
                        >
                          Copier
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Partagez ce lien pour inviter des personnes à rejoindre votre serveur.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Zone de danger */}
              {activeTab === "danger" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-4">Zone de danger</h3>
                    <div className="space-y-4">
                      {!isOwner && (
                        <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
                          <h4 className="text-red-400 font-medium mb-2">Quitter le serveur</h4>
                          <p className="text-gray-300 text-sm mb-3">
                            Vous quitterez ce serveur. Vous pourrez le rejoindre plus tard si vous avez un lien d'invitation.
                          </p>
                          <button
                            onClick={handleLeaveServer}
                            disabled={saving}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors disabled:opacity-50"
                          >
                            {saving ? "Sortie..." : "Quitter le serveur"}
                          </button>
                        </div>
                      )}
                      
                      {isOwner && (
                        <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
                          <h4 className="text-red-400 font-medium mb-2">Supprimer le serveur</h4>
                          <p className="text-gray-300 text-sm mb-3">
                            Cette action est irréversible. Tous les canaux, messages et membres seront définitivement supprimés.
                          </p>
                          <button
                            onClick={handleDeleteServer}
                            disabled={saving}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors disabled:opacity-50"
                          >
                            {saving ? "Suppression..." : "Supprimer le serveur"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 