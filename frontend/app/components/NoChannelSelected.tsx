"use client";

export default function NoChannelSelected() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#313338]">
      <div className="text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Bienvenue sur Discord Lite !</h2>
        <p className="text-gray-400 mb-6 max-w-md">
          Sélectionnez un salon dans la barre latérale pour commencer à discuter avec vos amis.
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <span className="text-sm">Choisissez un salon pour commencer</span>
        </div>
      </div>
    </div>
  );
} 