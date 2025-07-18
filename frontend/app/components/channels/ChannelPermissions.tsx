"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Permissions {
  [key: string]: boolean;
}

interface RoleMap {
  [role: string]: Permissions;
}

interface Member {
  email: string;
  role: string;
}

interface ChannelPermissionsProps {
  channelName: string;
  isOpen: boolean;
  onClose: () => void;
  fetchChannels: (userEmail: string) => Promise<void>;
  setSelectedChannel: (name: string) => void;
  session: any;
}

const BASE_ROLES = ["Admin", "Modérateur", "Utilisateur"];
const PERMISSIONS_LIST = [
  { key: "canDeleteChannel", label: "Supprimer le salon" },
  { key: "canManageUsers", label: "Gérer les utilisateurs" },
  { key: "canDeleteMessages", label: "Supprimer les messages" },
  { key: "canBanUsers", label: "Bannir les utilisateurs" },
  { key: "canManageRoles", label: "Modifier les permissions" },
];

// Fonction utilitaire pour l’URL de l’icône du salon
const getChannelIconUrl = (iconPath: string) => {
  if (!iconPath) return "/icons/default.png";
  if (iconPath.startsWith("http")) return iconPath;
  if (iconPath.startsWith("/uploads/")) return `http://localhost:4000${iconPath}`;
  return iconPath;
};

export default function ChannelPermissions({ channelName, isOpen, onClose, fetchChannels, setSelectedChannel, session }: ChannelPermissionsProps) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>("");
  const [permissions, setPermissions] = useState<Permissions>({});
  const [allRoles, setAllRoles] = useState<RoleMap>({});
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<Permissions>({});
  const [activeTab, setActiveTab] = useState("members");
  const [inviteLink, setInviteLink] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  // State pour l’édition des paramètres du salon
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [settingsMsg, setSettingsMsg] = useState("");
  // State pour l’icône du salon
  const [channelIcon, setChannelIcon] = useState<string>("");

  useEffect(() => {
    if (isOpen && channelName && session?.user?.email) {
      fetchPermissions();
    }
    // eslint-disable-next-line
  }, [isOpen, channelName, session?.user?.email]);

  const fetchPermissions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `http://localhost:4000/channels/${encodeURIComponent(channelName)}/permissions?userEmail=${encodeURIComponent(session?.user?.email || "")}`
      );
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.userRole);
        setPermissions(data.permissions);
        setAllRoles(data.allRoles);
        setIsOwner(data.isOwner);
        setMembers(data.members);
      } else {
        setError("Erreur lors du chargement des permissions");
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
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/roles`, {
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
        await fetchPermissions();
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
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/roles/${encodeURIComponent(role)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          permissions: allRoles[role]
        })
      });
      if (response.ok) {
        await fetchPermissions();
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
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/roles/${encodeURIComponent(role)}?userEmail=${encodeURIComponent(session?.user?.email || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchPermissions();
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
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/members/${encodeURIComponent(memberEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          role
        })
      });
      if (response.ok) {
        await fetchPermissions();
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
    if (!window.confirm(`Retirer ${memberEmail} du salon ?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/members/${encodeURIComponent(memberEmail)}?userEmail=${encodeURIComponent(session?.user?.email || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchPermissions();
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
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setInviteInput("");
        setInviteRole("Utilisateur");
        await fetchPermissions();
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

  // Récupérer le lien d’invitation
  const fetchInviteLink = async () => {
    try {
      const res = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/invite-link`);
      if (res.ok) {
        const data = await res.json();
        setInviteLink(data.inviteLink);
      }
    } catch {}
  };

  // Copier le lien d’invitation
  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess("Lien copié !");
      setTimeout(() => setCopySuccess(""), 1500);
    }
  };

  useEffect(() => {
    if (activeTab === "invite") fetchInviteLink();
  }, [activeTab, channelName]);

  // Suppression du salon (admin)
  const handleDeleteChannel = async () => {
    if (!window.confirm("Supprimer ce salon ? Cette action est irréversible.")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}?userEmail=${encodeURIComponent(session?.user?.email || "")}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onClose();
        router.push("/");
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors de la suppression du salon");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };
  // Quitter le salon (membre)
  const handleLeaveChannel = async () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce salon ?")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: session?.user?.email })
      });
      if (response.ok) {
        onClose();
        router.push("/");
      } else {
        const err = await response.json();
        setError(err.error || "Erreur lors du départ du salon");
      }
    } catch (e) {
      setError("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Déterminer les droits d’accès aux onglets
  const canManageUsers = isOwner || permissions.canManageUsers;
  const canManageRoles = isOwner || permissions.canManageRoles;

  // Déterminer le premier onglet accessible
  const getDefaultTab = () => {
    if (canManageUsers) return "members";
    if (canManageRoles) return "roles";
    return "permissions";
  };

  // Initialiser l’onglet actif dynamiquement à l’ouverture
  useEffect(() => {
    if (isOpen) {
      setActiveTab(getDefaultTab());
    }
    // eslint-disable-next-line
  }, [isOpen, canManageUsers, canManageRoles]);

  // Mettre à jour l’icône du salon à l’ouverture
  useEffect(() => {
    if (isOpen && permissions && permissions.channelIcon) {
      setChannelIcon(permissions.channelIcon);
    } else if (isOpen) {
      setChannelIcon("");
    }
  }, [isOpen, permissions]);

  // Préremplir le nom et l’icône quand on ouvre l’onglet
  useEffect(() => {
    if (activeTab === "settings" && isOwner && channelName) {
      setEditName(channelName);
      setIconPreview(getChannelIconUrl(channelIcon || "/icons/default.png"));
      setEditIcon(null);
      setSettingsMsg("");
    }
  }, [activeTab, isOwner, channelName, channelIcon]);

  // Gérer l’upload d’icône (preview)
  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditIcon(e.target.files[0]);
      setIconPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Sauvegarder les paramètres
  const handleSaveSettings = async () => {
    setSaving(true);
    setSettingsMsg("");
    setError("");
    try {
      const formData = new FormData();
      formData.append("userEmail", session?.user?.email || "");
      if (editName && editName !== channelName) formData.append("newName", editName);
      if (editIcon) formData.append("icon", editIcon);
      const response = await fetch(`http://localhost:4000/channels/${encodeURIComponent(channelName)}`, {
        method: "PATCH",
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setSettingsMsg("Salon mis à jour !");
        setTimeout(() => setSettingsMsg("") , 3000);
        await fetchPermissions();
        // Rafraîchir la liste des salons et le salon sélectionné, fermer la modale
        if (session?.user?.email) {
          await fetchChannels(session.user.email);
          if (editName && editName !== channelName) {
            setSelectedChannel(editName);
            setTimeout(() => onClose(), 100); // Ferme la modale après update
          } else {
            setTimeout(() => onClose(), 100);
          }
        }
        // Lors de la mise à jour de l’icône après modification
        if (data.channel && data.channel.icon) {
          setChannelIcon(data.channel.icon);
          setIconPreview(data.channel.icon);
        }
      } else {
        setError(data.error || "Erreur lors de la mise à jour du salon");
        if (data.error && (data.error.includes("volumineuse") || data.error.includes("images"))) {
          setEditIcon(null);
          setIconPreview(channelIcon || "/icons/default.png");
        }
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
      <div className="bg-[#36393f] rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23272a]">
          <h2 className="text-xl font-bold text-white">Gestion du salon #{channelName}</h2>
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

        {/* Onglets */}
        <div className="flex border-b border-[#23272a] bg-[#2f3136]">
          {isOwner && (
            <button onClick={() => setActiveTab("settings")} className={`px-6 py-3 text-sm font-medium focus:outline-none ${activeTab === "settings" ? "border-b-2 border-[#5865f2] text-white" : "text-gray-400"}`}>Paramètres</button>
          )}
          {canManageUsers && (
            <button onClick={() => setActiveTab("members")} className={`px-6 py-3 text-sm font-medium focus:outline-none ${activeTab === "members" ? "border-b-2 border-[#5865f2] text-white" : "text-gray-400"}`}>Membres</button>
          )}
          {canManageRoles && (
            <button onClick={() => setActiveTab("roles")} className={`px-6 py-3 text-sm font-medium focus:outline-none ${activeTab === "roles" ? "border-b-2 border-[#5865f2] text-white" : "text-gray-400"}`}>Rôles</button>
          )}
          <button onClick={() => setActiveTab("permissions")} className={`px-6 py-3 text-sm font-medium focus:outline-none ${activeTab === "permissions" ? "border-b-2 border-[#5865f2] text-white" : "text-gray-400"}`}>Permissions</button>
          {canManageUsers && (
            <button onClick={() => setActiveTab("invite")} className={`px-6 py-3 text-sm font-medium focus:outline-none ${activeTab === "invite" ? "border-b-2 border-[#5865f2] text-white" : "text-gray-400"}`}>Lien d’invitation</button>
          )}
        </div>

        {/* Contenu de l’onglet actif */}
        <div className="p-6">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865f2] mx-auto mb-4"></div>
              <p className="text-gray-400">Chargement...</p>
            </div>
          ) : (
            <>
              {activeTab === "settings" && isOwner && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Paramètres du salon</h3>
                  <div className="mb-4 flex items-center gap-6">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Icône du salon</label>
                      <div className="flex items-center gap-3">
                        <img src={getChannelIconUrl(iconPreview || channelIcon)} alt="Icône" className="w-16 h-16 rounded-full object-cover border border-[#40444b]" />
                        <input type="file" accept="image/*" onChange={handleIconChange} className="text-sm text-gray-400" />
                      </div>
                      {error && (error.includes("volumineuse") || error.includes("images")) && (
                        <div className="mt-2 text-red-400 text-sm">{error}</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-gray-300 text-sm mb-2">Nom du salon</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full p-2 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none"
                        maxLength={20}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50"
                    disabled={saving || (!editName && !editIcon)}
                  >
                    Sauvegarder
                  </button>
                  {settingsMsg && <div className="mt-3 text-green-400 text-sm">{settingsMsg}</div>}
                </div>
              )}
              {activeTab === "members" && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Gestion des membres</h3>
                  <div className="flex gap-4 mb-4">
                    <input
                      type="text"
                      value={inviteInput}
                      onChange={e => setInviteInput(e.target.value)}
                      placeholder="Pseudo ou email du membre à inviter"
                      className="p-2 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none"
                      disabled={saving}
                    />
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                      className="p-2 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none"
                      disabled={saving}
                    >
                      {Object.keys(allRoles).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={!inviteInput.trim() || saving}
                      className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50"
                    >
                      Inviter
                    </button>
                  </div>
                  {members.map(member => (
                    <div key={member.email} className="flex items-center justify-between p-2 bg-[#23272a] rounded mb-2">
                      <span className="text-gray-300 text-sm">{member.email}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={e => handleChangeMemberRole(member.email, e.target.value)}
                          className="p-1 rounded bg-[#36393f] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none text-xs"
                          disabled={member.email === channelName || saving}
                        >
                          {Object.keys(allRoles).map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        {member.email !== session?.user?.email && (
                          <button
                            onClick={() => handleRemoveMember(member.email)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                            disabled={saving}
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "roles" && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Gestion des rôles</h3>
                  <div className="flex gap-4 mb-4">
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={e => setNewRoleName(e.target.value)}
                      placeholder="Nom du nouveau rôle"
                      className="p-2 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none"
                      maxLength={20}
                      disabled={saving}
                    />
                    <button
                      onClick={handleCreateRole}
                      disabled={!newRoleName.trim() || saving}
                      className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50"
                    >
                      Créer le rôle
                    </button>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-white font-medium mb-2">Permissions pour {newRoleName}</h4>
                    <div className="flex flex-wrap gap-4">
                      {PERMISSIONS_LIST.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!newRolePerms[perm.key]}
                            onChange={e => setNewRolePerms(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                            className="rounded border-gray-600 bg-[#23272a] text-[#5865f2] focus:ring-[#5865f2]"
                          />
                          <span className="text-gray-300 text-sm">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {Object.entries(allRoles).map(([role, perms]) => (
                    <div key={role} className="border border-[#23272a] rounded-lg p-4 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium capitalize">{role}</h4>
                        <div className="flex gap-2">
                          {!BASE_ROLES.includes(role) && (
                            <button
                              onClick={() => handleDeleteRole(role)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                              disabled={saving}
                            >
                              Supprimer
                            </button>
                          )}
                          <button
                            onClick={() => handleEditRole(role)}
                            className="px-2 py-1 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-xs"
                            disabled={saving}
                          >
                            Sauvegarder
                          </button>
                        </div>
                      </div>
                      {PERMISSIONS_LIST.map(perm => (
                        <label key={perm.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!perms[perm.key]}
                            onChange={e => handleRolePermissionChange(role, perm.key, e.target.checked)}
                            className="rounded border-gray-600 bg-[#23272a] text-[#5865f2] focus:ring-[#5865f2]"
                            disabled={saving}
                          />
                          <span className="text-gray-300 text-sm">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "permissions" && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Vos permissions dans ce salon</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      userRole === 'Admin' ? 'bg-red-500 text-white' :
                      userRole === 'Modérateur' ? 'bg-orange-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {userRole || 'Aucun'}
                    </span>
                    {isOwner && <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">Propriétaire</span>}
                  </div>
                  <div className="space-y-2 mb-6">
                    {PERMISSIONS_LIST.map(perm => (
                      <div key={perm.key} className="flex items-center justify-between p-2 bg-[#23272a] rounded">
                        <span className="text-gray-300 text-sm">{perm.label}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${permissions[perm.key] ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                          {permissions[perm.key] ? 'Autorisé' : 'Interdit'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Boutons d’action */}
                  {isOwner ? (
                    <button
                      onClick={handleDeleteChannel}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors disabled:opacity-50"
                      disabled={saving}
                    >
                      Supprimer le salon
                    </button>
                  ) : (
                    <button
                      onClick={handleLeaveChannel}
                      className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50"
                      disabled={saving}
                    >
                      Quitter le salon
                    </button>
                  )}
                </div>
              )}
              {activeTab === "invite" && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Lien d’invitation</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 p-2 rounded bg-[#23272a] text-white border border-[#40444b] focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors"
                      disabled={!inviteLink}
                    >
                      Copier le lien
                    </button>
                  </div>
                  {copySuccess && <div className="text-green-400 text-sm">{copySuccess}</div>}
                  <p className="text-gray-400 text-xs mt-2">Toute personne connectée avec ce lien pourra rejoindre le salon.</p>
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors mt-6"
                disabled={saving}
              >
                Fermer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 