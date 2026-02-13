import { getAdminSession } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { AdminNavigation } from '@/components/admin/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    redirect('/dashboard');
  }

  return (
    <AdminNavigation user={adminSession.user}>
      {children}
    </AdminNavigation>
  );
}
