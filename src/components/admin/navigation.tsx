'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Bell,
  FileText,
  Settings,
  Shield,
  BarChart3,
  MapPin,
  Home,
  MoreHorizontal,
  ArrowLeft,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Broadcasts', href: '/admin/broadcasts', icon: Bell },
  { name: 'Legal Pages', href: '/admin/legal', icon: FileText },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Locations', href: '/admin/locations', icon: MapPin },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

// Bottom nav items (main 4 + more menu)
const bottomNavItems = [
  { name: 'Home', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Broadcasts', href: '/admin/broadcasts', icon: Bell },
  { name: 'App', href: '/dashboard', icon: Home },
];

interface AdminNavigationProps {
  user: {
    email: string;
    name?: string;
    role: string;
  };
  children: React.ReactNode;
}

export function AdminNavigation({ user, children }: AdminNavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen max-h-screen h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {user.email}
          </div>
          <div className="text-xs text-primary font-medium uppercase">
            {user.role}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="p-4 border-t border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold">Admin</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
        <nav className="flex justify-between items-center px-2 py-1">
          {bottomNavItems.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? false 
              : pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const isAppLink = item.href === '/dashboard';
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-2 min-w-0',
                  isActive ? 'text-primary' : isAppLink ? 'text-green-500' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 truncate">{item.name}</span>
              </Link>
            );
          })}
          
          {/* More menu trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="flex flex-col items-center justify-center flex-1 py-2 min-w-0 text-muted-foreground"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] mt-0.5">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
              <SheetTitle className="text-lg font-semibold mb-4">Admin Navigation</SheetTitle>
              <nav className="grid grid-cols-3 gap-4 pb-safe">
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-accent/50 text-muted-foreground hover:bg-accent'
                      )}
                    >
                      <item.icon className="h-6 w-6 mb-2" />
                      <span className="text-xs text-center font-medium">{item.name}</span>
                    </Link>
                  );
                })}
                {/* Back to Dashboard in menu */}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                >
                  <Home className="h-6 w-6 mb-2" />
                  <span className="text-xs text-center font-medium">Dashboard</span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </div>
  );
}
