import LoginForm from "../components/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <LoginForm />
      <p className="mt-4 text-sm">
        Pas encore de compte ? <Link href="/register" className="text-blue-600 underline">S'inscrire</Link>
      </p>
    </div>
  );
} 