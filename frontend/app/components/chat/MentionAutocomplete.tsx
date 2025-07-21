"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface User {
  email: string;
  name?: string;
  avatar?: string;
}

interface MentionAutocompleteProps {
  inputValue: string;
  onSelectUser: (user: User) => void;
  users: User[];
  isVisible: boolean;
  onClose: () => void;
}

export default function MentionAutocomplete({ 
  inputValue, 
  onSelectUser, 
  users, 
  isVisible, 
  onClose 
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extraire le nom de l'utilisateur après @
  const getMentionQuery = () => {
    const atIndex = inputValue.lastIndexOf('@');
    if (atIndex === -1) return '';
    return inputValue.slice(atIndex + 1).toLowerCase().trim();
  };

  // Filtrer les utilisateurs basés sur la requête
  const filteredUsers = users.filter(user => {
    const query = getMentionQuery();
    if (!query) return true;
    
    const name = (user.name || user.email.split('@')[0]).toLowerCase();
    const email = user.email.toLowerCase();
    const username = user.email.split('@')[0].toLowerCase();
    
    // Recherche plus intelligente : nom, email, ou username
    return name.includes(query) || 
           email.includes(query) || 
           username.includes(query) ||
           name.startsWith(query) ||
           username.startsWith(query);
  }).slice(0, 8); // Limiter à 8 résultats

  // Réinitialiser la sélection quand les résultats changent
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredUsers.length]);

  // Gérer la navigation au clavier avec useCallback
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isVisible || filteredUsers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => {
          const newIndex = prev < filteredUsers.length - 1 ? prev + 1 : 0;
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : filteredUsers.length - 1;
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (filteredUsers[selectedIndex]) {
          onSelectUser(filteredUsers[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        e.stopPropagation();
        if (filteredUsers[selectedIndex]) {
          onSelectUser(filteredUsers[selectedIndex]);
        }
        break;
    }
  }, [isVisible, filteredUsers, selectedIndex, onSelectUser, onClose]);

  // Ajouter l'écouteur d'événement
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  // Fermer quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  // Debug: afficher l'état actuel
  useEffect(() => {
    // État actuel pour debug (silencieux)
  }, [selectedIndex, filteredUsers.length, isVisible]);

  // Ne pas afficher si pas de résultats ou pas de requête
  if (!isVisible || filteredUsers.length === 0 || getMentionQuery() === '') return null;

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-[#2f3136] border border-[#23272a] rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto"
    >
      <div className="p-2">
        <div className="text-xs text-gray-400 px-2 py-1 border-b border-[#40444b] mb-1 flex justify-between items-center">
          <span>Utilisateurs ({filteredUsers.length}) - Sélectionné: {selectedIndex + 1}</span>
          <span className="text-xs">↑↓ pour naviguer, Entrée pour sélectionner</span>
        </div>
        {filteredUsers.map((user, index) => {
          const query = getMentionQuery();
          const displayName = user.name || user.email.split('@')[0];
          const username = user.email.split('@')[0];
          
          // Mettre en surbrillance la partie correspondante
          const highlightText = (text: string) => {
            if (!query) return text;
            const lowerText = text.toLowerCase();
            const index = lowerText.indexOf(query);
            if (index === -1) return text;
            
            return (
              <>
                {text.slice(0, index)}
                <span className="bg-[#5865f2] text-white px-0.5 rounded">
                  {text.slice(index, index + query.length)}
                </span>
                {text.slice(index + query.length)}
              </>
            );
          };

          const isSelected = index === selectedIndex;

          return (
            <button
              key={user.email}
              onClick={() => onSelectUser(user)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded text-left transition-colors ${
                isSelected
                  ? 'bg-[#5865f2] text-white border-l-4 border-white' 
                  : 'text-gray-300 hover:bg-[#40444b]'
              }`}
            >
              <img
                src={user.avatar || "/avatars/avatar1.png"}
                alt={displayName}
                className="w-6 h-6 rounded-full"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium truncate">
                  {highlightText(displayName)}
                </span>
                <span className="text-xs opacity-70 truncate">
                  @{highlightText(username)}
                </span>
              </div>
              {isSelected && (
                <div className="text-xs opacity-70">
                  Appuyez sur Entrée
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
} 