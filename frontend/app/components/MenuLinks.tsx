"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function MenuLinks() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (session) return null;
  return (
    <nav className="flex gap-2">
      <Link href="/login" className="text-blue-600 underline">Connexion</Link>
      <Link href="/register" className="text-blue-600 underline">Inscription</Link>
    </nav>
  );
}