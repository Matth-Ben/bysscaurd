"use client";
import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

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
      setRedirecting(true);
      setTimeout(() => router.push("/"), 1000);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-sm mx-auto p-4 border rounded" aria-busy={loading || redirecting}>
      <h2 className="text-lg font-bold mb-2">Connexion</h2>
      <input
        ref={emailRef}
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="p-2 border rounded"
        disabled={loading || redirecting}
        autoComplete="username"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        className="p-2 border rounded"
        disabled={loading || redirecting}
        autoComplete="current-password"
      />
      <button type="submit" disabled={loading || redirecting} className="bg-blue-600 text-white rounded p-2 mt-2">
        {loading ? "Connexion..." : "Se connecter"}
      </button>
      <button type="button" onClick={() => signIn("google")}
        className="bg-red-500 text-white rounded p-2 mt-2 flex items-center justify-center gap-2 hover:bg-red-600"
        disabled={loading || redirecting}
      >
        <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.68 30.21 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.2C12.13 13.09 17.56 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.39c-.53 2.85-2.13 5.26-4.54 6.89l7.02 5.46C43.93 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.29c-1.01-2.85-1.01-5.94 0-8.79l-7.98-6.2C.64 17.09 0 20.45 0 24c0 3.55.64 6.91 1.77 10.01l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.21 0 11.64-2.05 15.52-5.57l-7.02-5.46c-2.01 1.35-4.59 2.15-8.5 2.15-6.44 0-11.87-3.59-14.33-8.79l-7.98 6.2C6.73 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
        Se connecter avec Google
      </button>
      <div aria-live="polite" className="min-h-[24px]">
        {error && <div className="text-red-600 text-sm mt-1 font-semibold">{error}</div>}
        {redirecting && <div className="text-blue-600 text-sm mt-1 flex items-center gap-2"><svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="4" fill="none" strokeDasharray="60" strokeDashoffset="20"/></svg> Redirection...</div>}
      </div>
    </form>
  );
} 