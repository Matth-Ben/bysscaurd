"use client";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="p-8 text-center">Chargement du profil...</div>;
  }

  if (!session) {
    return <div className="p-8 text-center text-red-600">Vous devez être connecté pour accéder à votre profil.</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow flex flex-col items-center">
      {session.user?.image && (
        <Image src={session.user.image} alt="avatar" width={80} height={80} className="rounded-full mb-4" />
      )}
      <h1 className="text-2xl font-bold mb-2">{session.user?.name}</h1>
      <p className="text-gray-700 mb-2">{session.user?.email}</p>
      <p className="text-sm text-gray-500">Bienvenue sur votre profil Discord Lite !</p>
    </div>
  );
} 