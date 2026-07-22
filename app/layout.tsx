import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SideNav } from '@/components/layout/SideNav';
import { BottomNav } from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Personal health & daily dashboard',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          {/* Sidebar — desktop & tablet landscape */}
          <SideNav />

          {/* Main content area */}
          <main className="main-area">
            {children}
          </main>
        </div>

        {/* Bottom nav — mobile */}
        <BottomNav />

        <style>{`
          .app-shell {
            display: flex;
            min-height: 100dvh;
          }
          .main-area {
            flex: 1;
            min-width: 0;
            overflow-x: hidden;
          }
          @media (min-width: 768px) {
            .main-area {
              margin-left: var(--sidebar-w);
            }
          }
        `}</style>
      </body>
    </html>
  );
}
