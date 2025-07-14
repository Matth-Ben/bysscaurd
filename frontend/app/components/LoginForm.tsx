"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Email ou mot de passe incorrect");
    } else {
      setError("");
      window.location.reload();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-sm mx-auto p-4 border rounded">
      <h2 className="text-lg font-bold mb-2">Connexion</h2>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="p-2 border rounded" />
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="p-2 border rounded w-full pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(v => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {showPassword ? (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M17.94 17.94A9.77 9.77 0 0 1 12 19c-5.4 0-9-7-9-7a17.6 17.6 0 0 1 4.06-5.94M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .42-.09.82-.24 1.18"/><path stroke="currentColor" strokeWidth="2" d="m1 1 22 22"/></svg>
          )}
        </button>
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white rounded p-2 mt-2">{loading ? "Connexion..." : "Se connecter"}</button>
      <button type="button" onClick={() => signIn("google")}
        className="bg-red-500 text-white rounded p-2 mt-2 flex items-center justify-center gap-2 hover:bg-red-600">
        <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.68 30.21 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.2C12.13 13.09 17.56 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.39c-.53 2.85-2.13 5.26-4.54 6.89l7.02 5.46C43.93 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.29c-1.01-2.85-1.01-5.94 0-8.79l-7.98-6.2C.64 17.09 0 20.45 0 24c0 3.55.64 6.91 1.77 10.01l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.21 0 11.64-2.05 15.52-5.57l-7.02-5.46c-2.01 1.35-4.59 2.15-8.5 2.15-6.44 0-11.87-3.59-14.33-8.79l-7.98 6.2C6.73 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
        Se connecter avec Google
      </button>
      {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
    </form>
  );
} 