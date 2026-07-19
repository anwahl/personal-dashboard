import NextAuth from "next-auth"

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "authelia",
      name: "Authelia",
      type: "oauth",
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
        }
      },
    },
  ],
})
