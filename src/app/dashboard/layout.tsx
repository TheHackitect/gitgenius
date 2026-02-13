import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen max-h-screen h-screen bg-background flex flex-col overflow-hidden">
      <DashboardSidebar />
      <div className="lg:pl-64 flex flex-col flex-1 overflow-hidden">
        <DashboardHeader user={{
          ...session.user,
          role: session.user.role,
        }} />
        <main className="flex-1 overflow-y-auto py-4 px-4 sm:px-6 lg:px-8 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
