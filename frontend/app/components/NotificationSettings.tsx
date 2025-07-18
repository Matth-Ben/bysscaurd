"use client";
import { useState } from "react";

interface NotificationSettings {
  soundEnabled: boolean;
  browserNotifications: boolean;
  visualNotifications: boolean;
  mentionNotifications: boolean;
}

interface NotificationSettingsProps {
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
  isPermissionGranted: boolean;
  onRequestPermission: () => void;
}

export default function NotificationSettings({ 
  settings, 
  onSettingsChange, 
  isPermissionGranted, 
  onRequestPermission 
}: NotificationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-gray-400 hover:text-white transition-colors p-2 rounded hover:bg-[#40444b]"
        title="Paramètres de notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 00-6 6v7.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 17.25v-7.5a6 6 0 00-6-6zM12 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#36393f] rounded-lg p-6 w-96 max-w-[90vw]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Paramètres de notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Notifications visuelles */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notifications visuelles</p>
                  <p className="text-gray-400 text-sm">Afficher les notifications dans l'interface</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.visualNotifications}
                    onChange={(e) => handleSettingChange('visualNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Notifications sonores */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notifications sonores</p>
                  <p className="text-gray-400 text-sm">Jouer un son pour les nouveaux messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Notifications de mention */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notifications de mention</p>
                  <p className="text-gray-400 text-sm">Notifications spéciales pour les mentions @user</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.mentionNotifications}
                    onChange={(e) => handleSettingChange('mentionNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Notifications navigateur */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notifications navigateur</p>
                  <p className="text-gray-400 text-sm">Notifications système du navigateur</p>
                  {!isPermissionGranted && (
                    <p className="text-yellow-400 text-xs">Permission requise</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isPermissionGranted && (
                    <button
                      onClick={onRequestPermission}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      Autoriser
                    </button>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.browserNotifications && isPermissionGranted}
                      onChange={(e) => handleSettingChange('browserNotifications', e.target.checked)}
                      disabled={!isPermissionGranted}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${!isPermissionGranted ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-600'}`}></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 