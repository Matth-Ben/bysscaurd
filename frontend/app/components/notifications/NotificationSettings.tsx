"use client";
import { useState } from 'react';
import { NotificationSettings as NotificationSettingsType } from '../../services/notificationService';

interface NotificationSettingsProps {
  settings: NotificationSettingsType;
  onUpdateSettings: (settings: Partial<NotificationSettingsType>) => void;
  onRequestPermission: () => Promise<boolean>;
  onInitializeAudio?: () => void;
}

export default function NotificationSettings({ 
  settings, 
  onUpdateSettings, 
  onRequestPermission,
  onInitializeAudio
}: NotificationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (key: keyof NotificationSettingsType) => {
    onUpdateSettings({ [key]: !settings[key] });
  };

  const handleRequestPermission = async () => {
    await onRequestPermission();
  };

  return (
    <>
      {/* Bouton pour ouvrir les paramètres */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-[#40444b]"
        title="Paramètres de notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Modal des paramètres */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#36393f] rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#23272a]">
              <h2 className="text-xl font-bold text-white">Paramètres de notifications</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-4">
              {/* Bouton pour activer l'audio */}
              <div className="p-3 bg-[#40444b] rounded-lg">
                <p className="text-gray-300 text-sm mb-2">
                  Pour activer les notifications sonores, cliquez sur le bouton ci-dessous :
                </p>
                <button
                  onClick={() => {
                    if (onInitializeAudio) {
                      onInitializeAudio();
                    }
                  }}
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Activer les notifications sonores
                </button>
              </div>

              {/* Notifications visuelles */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Notifications visuelles</h3>
                  <p className="text-gray-400 text-sm">Afficher les toasts de notification</p>
                </div>
                <button
                  onClick={() => handleToggle('visualNotifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.visualNotifications ? 'bg-[#5865f2]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.visualNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications sonores */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Notifications sonores</h3>
                  <p className="text-gray-400 text-sm">Jouer un son pour les nouveaux messages</p>
                </div>
                <button
                  onClick={() => handleToggle('soundEnabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.soundEnabled ? 'bg-[#5865f2]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications navigateur */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Notifications navigateur</h3>
                  <p className="text-gray-400 text-sm">Afficher les notifications système</p>
                </div>
                <button
                  onClick={() => handleToggle('browserNotifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.browserNotifications ? 'bg-[#5865f2]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.browserNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications de mentions */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Notifications de mentions</h3>
                  <p className="text-gray-400 text-sm">Notifications spéciales pour les mentions @</p>
                </div>
                <button
                  onClick={() => handleToggle('mentionNotifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.mentionNotifications ? 'bg-[#5865f2]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.mentionNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Bouton pour activer les permissions navigateur */}
              <div className="pt-4 border-t border-[#23272a]">
                <button
                  onClick={handleRequestPermission}
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-2 px-4 rounded font-medium transition-colors"
                >
                  Activer les notifications navigateur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 