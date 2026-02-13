import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import { Adapter } from 'next-auth/adapters';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/dashboard',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // Fetch user role from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = (dbUser?.role as 'USER' | 'ADMIN' | 'SUPERADMIN') || 'USER';
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'USER' | 'ADMIN' | 'SUPERADMIN' | undefined;
        session.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Log sign-in activity
      if (user.id) {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'login',
            category: 'auth',
            details: {
              provider: account?.provider,
              timestamp: new Date().toISOString(),
            },
          },
        }).catch(console.error);
      }
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await prisma.activityLog.create({
          data: {
            userId: token.id as string,
            action: 'logout',
            category: 'auth',
            details: {
              timestamp: new Date().toISOString(),
            },
          },
        }).catch(console.error);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
