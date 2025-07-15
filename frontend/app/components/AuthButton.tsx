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
    return (
      <div className="flex items-center gap-2">
        <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" />
        <span>{session.user?.name}</span>
        <Link href="/profile" className="px-3 py-1 bg-gray-200 rounded">Profil</Link>
        <button onClick={() => signOut()} className="px-3 py-1 bg-gray-200 rounded">Se déconnecter</button>
      </div>
    );
  }

  // Si pas connecté, on ne montre rien ici (les liens sont dans le menu)
  return null;
}