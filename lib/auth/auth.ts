import { NextAuthOptions, DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "authelia",
      name: "Authelia",
      type: "oauth",
      wellKnown: `${process.env.AUTHELIA_ISSUER}/.well-known/openid-configuration`,
      idToken: true,
      issuer: process.env.AUTHELIA_ISSUER,
      clientId: process.env.AUTHELIA_CLIENT_ID,
      clientSecret: process.env.AUTHELIA_CLIENT_SECRET,
      authorization: {
        params: { scope: "openid profile email" },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
};
