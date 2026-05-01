import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js (next-auth v5) configuration.
 *
 * The session is stateless (JWT) — the FastAPI backend verifies the same JWT
 * and is the source of truth for user metadata. We forward `provider` and
 * `sub` into the token so the backend can upsert by `(provider, sub)`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
        token.sub = account.providerAccountId;
      }
      if (profile) {
        token.picture = (profile as { picture?: string; avatar_url?: string }).picture
          ?? (profile as { avatar_url?: string }).avatar_url
          ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { provider?: string }).provider = token.provider as string;
        (session.user as { id?: string }).id = token.sub as string;
      }
      return session;
    },
  },
});
