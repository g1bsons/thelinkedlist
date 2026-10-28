import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";

// JWT sessions: no Session/Account tables needed. On sign-in we upsert our own
// User row by email and keep its id in the token, so every query can be
// scoped to the signed-in user.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on the sign-in request.
      if (user?.email) {
        const dbUser = await db.user.upsert({
          where: { email: user.email },
          update: { name: user.name ?? undefined },
          create: { email: user.email, name: user.name ?? null },
        });
        token.uid = dbUser.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") {
        session.user.id = token.uid;
      }
      return session;
    },
  },
});
