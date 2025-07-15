"use client";
import { useSession } from "next-auth/react";

export default function WelcomeBanner() {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <div className="w-full bg-blue-50 border-b border-blue-200 text-blue-900 py-2 px-4 text-center font-semibold">
      Bienvenue, {session.user?.name || session.user?.email} !
    </div>
  );
}