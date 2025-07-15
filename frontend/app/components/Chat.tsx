"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface Message {
  _id: string;
  user: string;
  content: string;
  channel: string;
  timestamp: string;
  avatar?: string;
}

let socket: Socket | null = null;

interface Props {
  channel: string;
}

export default function Chat({ channel }: Props) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(typeof window !== "undefined" ? "ws://localhost:4000" : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });
    }
    if (channel) {
      socket.emit("join_channel", channel);
      socket.on("message_history", (history: Message[]) => {
        setMessages(history);
      });
      socket.on("message", (msg: Message) => {
        if (msg.channel === channel) setMessages(prev => [...prev, msg]);
      });
    }
    return () => {
      if (channel) socket?.emit("leave_channel", channel);
      socket?.off("message_history");
      socket?.off("message");
    };
  }, [channel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    const user = session?.user?.name || session?.user?.email || "Anonyme";
    socket.emit("message", { user, content: input, channel });
    setInput("");
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[600px] bg-[#36393f] rounded-lg shadow-lg border border-[#23272a]">
      <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-[#36393f] custom-scrollbar">
        {messages.map(msg => (
          <div key={msg._id} className="flex items-start gap-3 mb-2">
            <img
              src={msg.avatar || "/avatars/avatar1.png"}
              alt={msg.user}
              className="w-10 h-10 rounded-full border-2 border-[#23272a] bg-[#23272a]"
              style={{ minWidth: 40, minHeight: 40 }}
            />
            <div className="flex flex-col">
              <span className="text-xs text-[#b9bbbe] font-semibold">{msg.user} <span className="ml-2 text-[10px] text-[#72767d]">{new Date(msg.timestamp).toLocaleTimeString()}</span></span>
              <span className="bg-[#40444b] text-white rounded-lg px-4 py-2 w-fit max-w-lg break-words shadow">
                {msg.content}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-[#23272a] bg-[#40444b]">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 p-3 rounded-lg bg-[#36393f] text-white border-none focus:ring-2 focus:ring-[#5865f2] placeholder-[#72767d]"
          disabled={!session}
        />
        <button type="submit" disabled={!input.trim() || !session} className="bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg px-6 font-bold transition">
          Envoyer
        </button>
      </form>
      {!session && <div className="text-center text-sm text-[#b9bbbe] py-2">Connectez-vous pour participer au chat.</div>}
    </div>
  );
} 