"use client";
import { useState } from "react";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string) => void;
  loading?: boolean;
}

export default function CreateChannelModal({ isOpen, onClose, onCreateChannel, loading = false }: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
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
    
    onCreateChannel(channelName.trim());
  };

  const handleClose = () => {
    setChannelName("");
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
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-300 mb-2">
              Nom du salon
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

          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3">
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