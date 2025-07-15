"use client";
import { useSession } from "next-auth/react";
import Image from "next/image";
import AvatarSelector from "../components/AvatarSelector";
import { useState } from "react";
import { signIn } from "next-auth/react";

function ModalPassword({ open, onSubmit, onCancel, loading }: { open: boolean; onSubmit: (pw: string) => void; onCancel: () => void; loading: boolean }) {
  const [pw, setPw] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-[#23272a] p-6 rounded-lg shadow-lg flex flex-col gap-4 min-w-[300px]">
        <h2 className="text-lg font-bold text-white">Confirmer avec votre mot de passe</h2>
        <input
          type="password"
          className="p-2 rounded bg-[#36393f] text-white border-none focus:ring-2 focus:ring-[#5865f2]"
          placeholder="Mot de passe"
          value={pw}
          onChange={e => setPw(e.target.value)}
          disabled={loading}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1 rounded bg-gray-500 text-white" disabled={loading}>Annuler</button>
          <button onClick={() => onSubmit(pw)} className="px-3 py-1 rounded bg-[#5865f2] text-white font-bold" disabled={!pw || loading}>Valider</button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  // Correction pour éviter l'erreur si session.user.avatar n'existe pas
  const user = session?.user;
  const [avatar, setAvatar] = useState(((user as any)?.avatar as string) || (user?.image as string) || "/avatars/avatar1.png");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  if (status === "loading") {
    return <div className="p-8 text-center">Chargement du profil...</div>;
  }

  if (!session) {
    return <div className="p-8 text-center text-red-600">Vous devez être connecté pour accéder à votre profil.</div>;
  }

  const handleSave = async () => {
    if (!user?.email) return;
    setPendingAvatar(avatar);
    setShowModal(true);
  };

  const handleModalSubmit = async (password: string) => {
    setModalLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("http://localhost:4000/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, avatar: pendingAvatar }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour du profil");
      setSuccess(true);
      await signIn("credentials", { redirect: false, email: user.email, password });
      setShowModal(false);
    } catch (e) {
      setError("Impossible de mettre à jour l'avatar ou mot de passe incorrect.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setPendingAvatar(null);
  };

  return (
    <>
      <ModalPassword open={showModal} onSubmit={handleModalSubmit} onCancel={handleModalCancel} loading={modalLoading} />
      <div className="min-h-screen flex items-center justify-center bg-[#313338]">
        <div className="bg-[#23272a] rounded-lg shadow-lg p-8 flex flex-col items-center w-full max-w-md">
          <div className="mb-6">
            <img
              src={avatar}
              alt="Avatar"
              width={96}
              height={96}
              className="rounded-full border-4 border-[#5865f2] shadow"
              style={{ background: "#23272a" }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{user?.name}</h1>
          <p className="text-gray-400 mb-4">{user?.email}</p>
          <div className="mb-6 w-full flex flex-col items-center">
            <span className="text-gray-300 mb-2">Choisissez votre avatar :</span>
            <AvatarSelector value={avatar} onChange={setAvatar} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2 px-6 rounded transition mb-2"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {success && <div className="text-green-400 mt-2">Avatar mis à jour !</div>}
          {error && <div className="text-red-400 mt-2">{error}</div>}
          <p className="text-xs text-gray-500 mt-6">Bienvenue sur votre profil Discord Lite !</p>
        </div>
      </div>
    </>
  );
} 