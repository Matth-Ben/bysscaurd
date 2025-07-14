import RegisterForm from "../components/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <RegisterForm />
      <p className="mt-4 text-sm">
        Déjà un compte ? <Link href="/login" className="text-blue-600 underline">Se connecter</Link>
      </p>
    </div>
  );
} 