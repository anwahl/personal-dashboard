import type { Metadata, Viewport } from 'next';
import {
  Unica_One, Truculenta, Dosis,
  Syne_Mono, Smooch_Sans, Quicksand
 } from "next/font/google";
import './globals.css';
import { SideNav }      from '@/components/layout/SideNav';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { ClientConfig } from '@/components/layout/ClientConfig';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Personal health & daily dashboard',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Browser chrome (address/status bar) matches --bg; must be a literal, CSS vars aren't read here
  themeColor: '#0c0b0e',
};

const unica = Unica_One({
  variable: "--font-family-header",
  weight: '400'
});

const truculenta = Truculenta({
  variable: "--font-family-sub-header",
  weight: '400'
});

const quicksand = Quicksand({
  variable: "--font-family-body",
  weight: '500'
});

const dosis = Dosis({
  variable: "--font-family-item",
  weight: '400'
});

const syne = Syne_Mono({
  variable: "--font-family-code",
  weight: '400'
});

const smooch = Smooch_Sans({
  variable: "--font-family-tag",
  weight: '400'
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={
        `${unica.variable} ${truculenta.variable} ${dosis.variable}
        ${syne.variable} ${smooch.variable} ${quicksand.variable}`}>
        <ClientConfig>
          <div className="app-shell">
            <SideNav />
            <main className="main-area">
              {children}
            </main>
          </div>
          <MobileTabBar />
        </ClientConfig>
      </body>
    </html>
  );
}
