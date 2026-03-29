'use client';
/**
 * ClientRootLayout — Conditionally renders Navbar and Footer.
 *
 * Admin routes (/admin/*) get their own full-screen layout and must NOT
 * show the store Navbar or Footer. All other routes render normally.
 */

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    // Admin has its own full-screen layout — no store chrome
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ paddingTop: 'var(--nav-height)', flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
