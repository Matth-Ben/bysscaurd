"use client";
import AuthButton from "./components/AuthButton";
import MenuLinks from "./components/MenuLinks";
import Chat from "./components/Chat";
import ChannelList from "./components/ChannelList";
import { useState } from "react";
import WelcomeBanner from "./components/WelcomeBanner";

export default function Home() {
  const [selectedChannel, setSelectedChannel] = useState<string>("general");
  return (
    <div className="flex min-h-screen bg-[#313338] text-white">
      <ChannelList selected={selectedChannel} onSelect={setSelectedChannel} />
      <div className="flex-1 flex flex-col">
        <header className="w-full flex justify-end items-center gap-4 p-2 bg-[#23272a] border-b border-[#23272a]">
          <MenuLinks />
          <AuthButton />
        </header>
        <main className="flex flex-1 items-center justify-center">
          <Chat channel={selectedChannel} />
        </main>
      </div>
    </div>
  );
}
