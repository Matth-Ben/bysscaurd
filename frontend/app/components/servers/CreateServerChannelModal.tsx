"use client";
import { useState } from "react";

interface CreateServerChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, description: string, type: 'text' | 'voice', isPrivate: boolean, allowedRoles: string[]) => Promise<void>;
  loading?: boolean;
  userPermissions?: any;
}

export default function CreateServerChannelModal({ 
  isOpen, 
  onClose, 
  onCreateChannel, 
  loading = false,
  userPermissions
}: CreateServerChannelModalProps) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['Admin', 'Modérateur']);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!channelName.trim()) {
      setError("Le nom du salon est requis");
      return;
    }
    
    if (channelName.length < 3) {
      setError("Le nom du salon doit contenir au moins 3 caractères");
      return;
    }
    
    if (channelName.length > 20) {
      setError("Le nom du salon ne peut pas dépasser 20 caractères");
      return;
    }
    
    try {
      await onCreateChannel(channelName.trim(), description.trim(), type, isPrivate, allowedRoles);
      handleClose();
    } catch (error) {
      setError("Erreur lors de la création du salon");
    }
  };

  const handleClose = () => {
    setChannelName("");
    setDescription("");
    setType('text');
    setIsPrivate(false);
    setAllowedRoles(['Admin', 'Modérateur']);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#36393f] rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23272a]">
          <h2 className="text-xl font-bold text-white">Créer un salon</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-300 mb-2">
              Nom du salon *
            </label>
            <input
              type="text"
              id="channelName"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full p-3 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none transition-colors"
              placeholder="ex: général"
              disabled={loading}
              maxLength={20}
            />
            <p className="text-xs text-gray-400 mt-1">
              {channelName.length}/20 caractères
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded bg-[#23272a] text-white border border-[#40444b] focus:border-[#5865f2] focus:outline-none transition-colors resize-none"
              placeholder="Description optionnelle du salon"
              rows={3}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type de salon
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded bg-[#23272a] border border-[#40444b] cursor-pointer hover:bg-[#2f3136] transition-colors">
                <input
                  type="radio"
                  name="type"
                  value="text"
                  checked={type === 'text'}
                  onChange={(e) => setType(e.target.value as 'text' | 'voice')}
                  className="text-[#5865f2] focus:ring-[#5865f2]"
                />
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                  <div>
                    <div className="text-white font-medium">Salon textuel</div>
                    <div className="text-gray-400 text-sm">Envoyez des messages, partagez des fichiers</div>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded bg-[#23272a] border border-[#40444b] cursor-pointer hover:bg-[#2f3136] transition-colors">
                <input
                  type="radio"
                  name="type"
                  value="voice"
                  checked={type === 'voice'}
                  onChange={(e) => setType(e.target.value as 'text' | 'voice')}
                  className="text-[#5865f2] focus:ring-[#5865f2]"
                />
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <div>
                    <div className="text-white font-medium">Salon vocal</div>
                    <div className="text-gray-400 text-sm">Discutez en temps réel (à venir)</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Options de canal privé */}
          {userPermissions?.canCreatePrivateChannels && (
            <div>
              <label className="flex items-center gap-3 p-3 rounded bg-[#23272a] border border-[#40444b] cursor-pointer hover:bg-[#2f3136] transition-colors">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="text-[#5865f2] focus:ring-[#5865f2]"
                />
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                  <div>
                    <div className="text-white font-medium">Canal privé</div>
                    <div className="text-gray-400 text-sm">Seuls certains rôles peuvent y accéder</div>
                  </div>
                </div>
              </label>
              
              {isPrivate && (
                <div className="mt-3 p-3 bg-[#23272a] rounded border border-[#40444b]">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rôles autorisés
                  </label>
                  <div className="space-y-2">
                    {['Admin', 'Modérateur', 'Utilisateur'].map((role) => (
                      <label key={role} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={allowedRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedRoles([...allowedRoles, role]);
                            } else {
                              setAllowedRoles(allowedRoles.filter(r => r !== role));
                            }
                          }}
                          className="text-[#5865f2] focus:ring-[#5865f2]"
                        />
                        <span className="text-gray-300 text-sm">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!channelName.trim() || loading}
              className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Création..." : "Créer le salon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 