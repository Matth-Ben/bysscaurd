"use client";
import React, { useState } from "react";

const AVATARS = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
];

export default function AvatarSelector({ value, onChange }: { value: string; onChange: (avatar: string) => void }) {
  const [selected, setSelected] = useState(value || AVATARS[0]);

  const handleSelect = (avatar: string) => {
    setSelected(avatar);
    onChange(avatar);
  };

  return (
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
  );
} 