import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            username?: string | null;
        }
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
            authorization: {
                params: {
                    // Request access to public and private repos
                    scope: "read:user user:email repo",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token.accessToken = account.access_token;
            }
            if (profile) {
                token.username = (profile as any).login;
            }
            return token;
        },
        async session({ session, token }) {
            // Send properties to the client
            session.accessToken = token.accessToken as string;
            if (session.user) {
                session.user.username = token.username as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/", // Redirect to home page for sign in
    },
});
