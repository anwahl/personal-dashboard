import type { Metadata, Viewport } from 'next';
import {
  Unica_One, Odibee_Sans, Special_Elite,
  Truculenta, Alumni_Sans, Denk_One, Dosis,
  Pixelify_Sans, Syne_Mono, Smooch_Sans,
  Maven_Pro, Quicksand
 } from "next/font/google";
import './globals.css';
import { SideNav }      from '@/components/layout/SideNav';
import { MobileNavBar } from '@/components/layout/MobileNav';
import { ClientConfig } from '@/components/layout/ClientConfig';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Personal health & daily dashboard',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const unica = Unica_One({
  variable: "--font-family-header",
  weight: '400'
});

const odibee = Odibee_Sans({
  variable: "--font-family-display",
  weight: '400'
});

const truculenta = Truculenta({
  variable: "--font-family-sub-header",
  weight: '400'
});

const alumni = Alumni_Sans({
  variable: "--font-family-alumni",
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

const denk = Denk_One({
  variable: "--font-family-alternate-header",
  weight: '400'
});

const pixel = Pixelify_Sans({
  variable: "--font-family-fun",
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

const maven = Maven_Pro({
  variable: "--font-family-metric",
  weight: '400'
});

const elite = Special_Elite({
  variable: "--font-family-special",
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
        `${unica.variable} ${odibee.variable} ${truculenta.variable}
        ${odibee.variable} ${alumni.variable} ${dosis.variable}
        ${denk.variable} ${pixel.variable} ${syne.variable} ${smooch.variable}
        ${maven.variable} ${elite.variable} ${quicksand.variable}`}>
        <ClientConfig>
          <div className="app-shell">
            <SideNav />
            <main className="main-area">
              {children}
            </main>
          </div>
          <MobileNavBar />
        </ClientConfig>
      </body>
    </html>
  );
}
