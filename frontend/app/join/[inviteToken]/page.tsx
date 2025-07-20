"use client";
import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export default function JoinChannelPage({ params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState("Connexion au salon...");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.email) {
      setMessage("Vous devez être connecté pour rejoindre un salon.");
      return;
    }
    const join = async () => {
      try {
        const userEmail = session && session.user && session.user.email ? session.user.email : null;
        if (!userEmail) return;
        
        // Essayer d'abord de rejoindre un serveur
        let res = await fetch(`http://localhost:4000/servers/join/${inviteToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail })
        });
        
        if (res.ok) {
          const data = await res.json();
          setMessage(`Vous avez rejoint le serveur "${data.server}" ! Redirection...`);
          setSuccess(true);
          setTimeout(() => {
            router.push("/");
          }, 2500);
          return;
        }
        
        // Si ce n'est pas un serveur, essayer de rejoindre un channel
        res = await fetch(`http://localhost:4000/channels/join/${inviteToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail })
        });
        
        const data = await res.json();
        if (res.ok) {
          setMessage(`Vous avez rejoint le salon #${data.channel} ! Redirection...`);
          setSuccess(true);
          setTimeout(() => {
            router.push("/");
          }, 2500);
        } else {
          setError(data.error || "Lien d'invitation invalide.");
        }
      } catch {
        setError("Erreur de connexion au serveur.");
      }
    };
    join();
  }, [status, session, inviteToken, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#313338] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865f2] mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#313338] text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Rejoindre un salon</h1>
          <p className="text-gray-300">Vous devez être connecté pour rejoindre ce salon.</p>
          <button
            onClick={() => signIn()}
            className="px-6 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#313338] text-white">
      <div className="bg-[#23272a] rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {success ? (
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto mb-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Succès !</h2>
            <p>{message}</p>
          </div>
        ) : error ? (
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Erreur</h2>
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5865f2] mx-auto mb-4"></div>
            <p>{message}</p>
          </div>
        )}
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded font-medium transition-colors"
        >
          Retour à l’accueil
        </button>
      </div>
    </div>
  );
} 