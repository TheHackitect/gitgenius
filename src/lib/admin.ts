import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type UserRole = 'USER' | 'ADMIN' | 'SUPERADMIN';

export interface AdminSession {
  user: {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
  };
}

// Check if current user is an admin
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  return user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
}

// Check if current user is a superadmin
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  
  return user?.role === 'SUPERADMIN';
}

// Get admin session with role
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    return null;
  }
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as UserRole,
    },
  };
}

// Require admin access - returns session or throws
export async function requireAdmin(): Promise<AdminSession> {
  const adminSession = await getAdminSession();
  
  if (!adminSession) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return adminSession;
}

// Require superadmin access - returns session or throws
export async function requireSuperAdmin(): Promise<AdminSession> {
  const adminSession = await getAdminSession();
  
  if (!adminSession || adminSession.user.role !== 'SUPERADMIN') {
    throw new Error('Unauthorized: Super admin access required');
  }
  
  return adminSession;
}

// Get user statistics for admin dashboard
export async function getAdminStats() {
  const [
    totalUsers,
    activeUsers,
    totalGitHubAccounts,
    totalRepositories,
    totalJobs,
    pendingJobs,
    completedJobs,
    failedJobs,
    totalCommits,
    usersLast24h,
    usersLast7d,
    usersLast30d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.gitHubAccount.count(),
    prisma.repository.count(),
    prisma.automationJob.count(),
    prisma.automationJob.count({ where: { status: 'pending' } }),
    prisma.automationJob.count({ where: { status: 'completed' } }),
    prisma.automationJob.count({ where: { status: 'failed' } }),
    prisma.commitRecord.count(),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newLast24h: usersLast24h,
      newLast7d: usersLast7d,
      newLast30d: usersLast30d,
    },
    github: {
      accounts: totalGitHubAccounts,
      repositories: totalRepositories,
    },
    jobs: {
      total: totalJobs,
      pending: pendingJobs,
      completed: completedJobs,
      failed: failedJobs,
    },
    commits: {
      total: totalCommits,
    },
  };
}
