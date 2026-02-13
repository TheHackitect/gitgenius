'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Github,
  GitBranch,
  Zap,
  BarChart3,
  Settings,
  Clock,
  Activity,
  Menu,
  X,
  Home,
  MoreHorizontal,
  Shield,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'GitHub Accounts', href: '/dashboard/accounts', icon: Github },
  { name: 'Repositories', href: '/dashboard/repositories', icon: GitBranch },
  { name: 'Automation', href: '/dashboard/automation', icon: Zap },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  { name: 'Scheduled Jobs', href: '/dashboard/jobs', icon: Clock },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const adminNavItem = { name: 'Admin Panel', href: '/admin', icon: Shield };

// Bottom nav items (main 4 + more menu)
const bottomNavItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Repos', href: '/dashboard/repositories', icon: GitBranch },
  { name: 'Automation', href: '/dashboard/automation', icon: Zap },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Clock },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  
  // Check if user is admin or superadmin
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN' || 
                  (session?.user as { role?: string })?.role === 'SUPERADMIN';
  
  // Build navigation with admin link if applicable
  const navigation = useMemo(() => {
    if (isAdmin) {
      return [...baseNavigation, adminNavItem];
    }
    return baseNavigation;
  }, [isAdmin]);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-card border-r border-border pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 text-white"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.164 6.839 9.49.5.09.682-.218.682-.485 0-.236-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .269.18.579.688.481C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </div>
              <span className="font-bold text-xl">GitGenius</span>
            </Link>
          </div>

          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-400">Automation Active</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your GitHub contributions are being maintained automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 safe-area-bottom">
        <nav className="flex justify-between items-center px-2 py-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-2 min-w-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
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
              <SheetTitle className="text-lg font-semibold mb-4">Navigation</SheetTitle>
              <nav className="grid grid-cols-3 gap-4 pb-safe">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
      </div>

      {/* Spacer for bottom nav on mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
