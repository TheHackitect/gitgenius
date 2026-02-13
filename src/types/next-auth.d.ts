import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: 'USER' | 'ADMIN' | 'SUPERADMIN';
    } & DefaultSession['user'];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    id: string;
    role?: 'USER' | 'ADMIN' | 'SUPERADMIN';
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: 'USER' | 'ADMIN' | 'SUPERADMIN';
    accessToken?: string;
  }
}
