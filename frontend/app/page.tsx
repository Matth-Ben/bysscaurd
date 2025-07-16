"use client";
import AuthButton from "./components/AuthButton";
import MenuLinks from "./components/MenuLinks";
import Chat from "./components/Chat";
import ChannelList from "./components/ChannelList";
import NoChannelSelected from "./components/NoChannelSelected";
import { useState, useEffect } from "react";

interface Channel {
  _id: string;
  name: string;
  createdAt: string;
}

export default function Home() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger les salons au démarrage
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch("http://localhost:4000/channels");
      if (response.ok) {
        const channelsData = await response.json();
        setChannels(channelsData);
        // Sélectionner automatiquement le premier salon s'il existe
        if (channelsData.length > 0 && !selectedChannel) {
          setSelectedChannel(channelsData[0].name);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des salons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (name: string) => {
    try {
      const response = await fetch("http://localhost:4000/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const newChannel = await response.json();
        setChannels(prev => [...prev, newChannel]);
        setSelectedChannel(newChannel.name);
        return Promise.resolve();
      } else {
        const error = await response.json();
        return Promise.reject(new Error(error.error || "Erreur lors de la création du salon"));
      }
    } catch (error) {
      return Promise.reject(error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#313338] text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865f2] mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des salons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#313338] text-white">
      <ChannelList 
        channels={channels}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
        onCreateChannel={handleCreateChannel}
      />
      <div className="flex-1 flex flex-col">
        <header className="w-full flex justify-end items-center gap-4 p-2 bg-[#23272a] border-b border-[#23272a]">
          <MenuLinks />
          <AuthButton />
        </header>
        <main className="flex flex-1">
          {selectedChannel ? (
            <Chat channel={selectedChannel} />
          ) : (
            <NoChannelSelected />
          )}
        </main>
      </div>
    </div>
  );
}
