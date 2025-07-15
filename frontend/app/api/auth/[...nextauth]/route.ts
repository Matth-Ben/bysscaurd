import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        console.log("Tentative de connexion via CredentialsProvider", credentials);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
            }),
          });
          if (!res.ok) {
            console.log("Réponse non OK du backend:", res.status);
            return null;
          }
          const user = await res.json();
          if (user && user.id) {
            return user;
          }
          return null;
        } catch (err) {
          console.error("Erreur lors du fetch vers le backend:", err);
          return null;
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token, user }) {
      // Copier l'avatar, la bio et le statut du token dans la session
      if (token && typeof token === 'object') {
        if ('avatar' in token) (session.user as any).avatar = (token as any).avatar;
        if ('bio' in token) (session.user as any).bio = (token as any).bio;
        if ('status' in token) (session.user as any).status = (token as any).status;
      }
      // Pour Google, avatar = image
      if (session.user && (session.user as any).image && !(session.user as any).avatar) {
        (session.user as any).avatar = (session.user as any).image;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Pour Credentials, l'avatar, la bio et le statut sont dans user (issu du backend)
      if (user && (user as any).avatar) (token as any).avatar = (user as any).avatar;
      if (user && (user as any).bio) (token as any).bio = (user as any).bio;
      if (user && (user as any).status !== undefined) (token as any).status = (user as any).status;
      // Pour Google, avatar = image
      if (user && (user as any).image && !(token as any).avatar) {
        (token as any).avatar = (user as any).image;
      }
      // Synchroniser l'avatar, la bio et le statut à jour depuis le backend (si email présent)
      if (token?.email) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/auth/user?email=${encodeURIComponent(token.email)}`);
          if (res.ok) {
            const userData = await res.json();
            if (userData.avatar) (token as any).avatar = userData.avatar;
            if (userData.bio !== undefined) (token as any).bio = userData.bio;
            if (userData.status !== undefined) (token as any).status = userData.status;
          }
        } catch (e) {
          // ignore erreur
        }
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 