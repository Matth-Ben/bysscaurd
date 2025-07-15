"use client";
import { useEffect, useState } from "react";

interface Channel {
  _id: string;
  name: string;
}

interface Props {
  selected: string;
  onSelect: (name: string) => void;
}

export default function ChannelList({ selected, onSelect }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannel, setNewChannel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/channels")
      .then(res => res.json())
      .then(setChannels);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannel }),
    });
    if (res.ok) {
      const channel = await res.json();
      setChannels(chs => [...chs, channel]);
      setNewChannel("");
      onSelect(channel.name);
    } else {
      const data = await res.json();
      setError(data.error || "Erreur inconnue");
    }
    setLoading(false);
  }

  return (
    <aside className="h-screen w-20 bg-[#23272a] flex flex-col items-center py-4 gap-4 border-r border-[#23272a]">
      <ul className="flex flex-col gap-3 w-full items-center flex-1">
        {channels.map(c => (
          <li key={c._id} className="w-full flex justify-center">
            <button
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-150 text-lg font-bold
                ${selected === c.name ? "bg-[#5865f2] text-white shadow-lg scale-110" : "bg-[#313338] text-gray-300 hover:bg-[#5865f2] hover:text-white"}`}
              onClick={() => onSelect(c.name)}
              title={c.name}
            >
              #{c.name[0].toUpperCase()}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate} className="flex flex-col items-center gap-2 w-full mt-4">
        <input
          type="text"
          value={newChannel}
          onChange={e => setNewChannel(e.target.value)}
          placeholder="+ Salon"
          className="w-12 h-12 text-center rounded-2xl bg-[#313338] text-white border-none focus:ring-2 focus:ring-[#5865f2] placeholder-gray-400"
          disabled={loading}
          maxLength={16}
        />
        <button
          type="submit"
          disabled={!newChannel.trim() || loading}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#5865f2] text-white text-2xl font-bold hover:bg-[#4752c4] transition"
          title="Créer un salon"
        >
          +
        </button>
      </form>
      {error && <div className="text-red-400 text-xs mt-1 text-center w-full">{error}</div>}
    </aside>
  );
} 