import { getAdminSession } from '@/lib/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Bell, 
  FileText, 
  Settings,
  Shield,
  BarChart3,
  MapPin,
  Download,
  ChevronLeft,
} from 'lucide-react';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Broadcasts', href: '/admin/broadcasts', icon: Bell },
  { name: 'Legal Pages', href: '/admin/legal', icon: FileText },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Locations', href: '/admin/locations', icon: MapPin },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {adminSession.user.email}
          </div>
          <div className="text-xs text-primary font-medium capitalize">
            {adminSession.user.role}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {adminNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Back to app */}
        <div className="p-4 border-t border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
