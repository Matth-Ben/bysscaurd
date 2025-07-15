"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <button disabled>Chargement...</button>;
  }

  if (session) {
    // Avatar personnalisé si disponible, sinon image NextAuth, sinon avatar par défaut
    const avatar = (session.user as any)?.avatar || session.user?.image || "/avatars/avatar1.png";
    const status = (session.user as any)?.status;
    let statusColor = "bg-green-500";
    if (status === "away") statusColor = "bg-yellow-400";
    else if (status === "busy") statusColor = "bg-red-500";
    else if (!status || status === "") statusColor = "bg-gray-400";
    const statusText = status === "online" ? "En ligne" : status === "away" ? "Absent" : status === "busy" ? "Occupé" : "Invisible";
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" />
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor}`}></span>
        </div>
        <span>{session.user?.name}</span>
        <Link href="/profile" className="px-3 py-1 bg-gray-200 rounded">Profil</Link>
        <button onClick={() => signOut()} className="px-3 py-1 bg-gray-200 rounded">Se déconnecter</button>
      </div>
    );
  }

  // Si pas connecté, on ne montre rien ici (les liens sont dans le menu)
  return null;
}