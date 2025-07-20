"use client";
import { useState } from "react";

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateServer: (name: string, description: string) => Promise<void>;
  loading: boolean;
}

export default function CreateServerModal({ 
  isOpen, 
  onClose, 
  onCreateServer, 
  loading 
}: CreateServerModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    await onCreateServer(name.trim(), description.trim());
    setName("");
    setDescription("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2f3136] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-bold">Créer un serveur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-gray-300 text-sm font-medium mb-2">
              Nom du serveur *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-[#40444b] border border-[#23272a] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865f2] focus:border-transparent"
              placeholder="Mon serveur"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-gray-300 text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-[#40444b] border border-[#23272a] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865f2] focus:border-transparent resize-none"
              placeholder="Description optionnelle du serveur"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#40444b] hover:bg-[#4f545c] text-white rounded font-medium transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Création..." : "Créer le serveur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 