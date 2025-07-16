"use client";
import React, { useState, useRef } from "react";

const AVATARS = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
];

export default function AvatarSelector({ value, onChange, userEmail }: { value: string; onChange: (avatar: string) => void; userEmail: string }) {
  const [selected, setSelected] = useState(value || AVATARS[0]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (avatar: string) => {
    setSelected(avatar);
    onChange(avatar);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation basique
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('L\'image doit faire moins de 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('email', userEmail);

    try {
      const response = await fetch('http://localhost:4000/auth/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSelected(data.avatar);
        onChange(data.avatar);
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ display: "flex", gap: 16 }}>
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => handleSelect(avatar)}
            style={{
              border: selected === avatar ? "2px solid #0070f3" : "2px solid transparent",
              borderRadius: "50%",
              padding: 2,
              background: "none",
              cursor: "pointer",
            }}
            aria-label={`Choisir l'avatar ${avatar}`}
          >
            <img
              src={avatar}
              alt="Avatar"
              width={64}
              height={64}
              style={{ borderRadius: "50%", display: "block" }}
            />
          </button>
        ))}
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <span className="text-gray-300 text-sm">Ou uploader votre avatar :</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          id="avatar-upload"
        />
        <label
          htmlFor="avatar-upload"
          className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded cursor-pointer transition"
        >
          {uploading ? "Upload en cours..." : "Choisir une image"}
        </label>
      </div>
    </div>
  );
} 