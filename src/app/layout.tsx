import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitGenius - Smart GitHub Automation',
  description: 'Keep your GitHub contributions alive with intelligent automation. Manage multiple accounts, track analytics, and maintain your contribution streak effortlessly.',
  keywords: ['github', 'automation', 'contributions', 'commits', 'developer tools'],
  authors: [{ name: 'GitGenius Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GitGenius',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'GitGenius - Smart GitHub Automation',
    description: 'Keep your GitHub contributions alive with intelligent automation',
    siteName: 'GitGenius',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
