import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import AppleProvider from "next-auth/providers/apple";
import type { Provider } from "next-auth/providers";
import { prisma } from "./prisma";

// Whether "Sign in with Apple" is configured. Read in one place so the auth
// config and the login page agree on whether to offer it.
export const appleEnabled = Boolean(
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
);

// Lazy initialization so env vars are read fresh on every request,
// avoiding module-init timing issues in Vercel serverless.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const providers: Provider[] = [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ];

  // Apple — only enabled once its credentials are set, so the app is safe to
  // deploy before the Apple Developer setup is done. APPLE_CLIENT_SECRET is the
  // signed JWT produced by scripts/generate-apple-secret.mjs (renew ≤6 months).
  if (appleEnabled) {
    providers.push(
      AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
      })
    );
  }

  return {
    adapter: PrismaAdapter(prisma as any),
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    trustHost: true,
    providers,
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
    },
    pages: {
      signIn: "/login",
      signOut: "/signout",
    },
  };
});
