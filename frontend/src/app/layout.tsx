import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Perfumes 2506',
  description: 'Descubre nuestra colección exclusiva de perfumes de diseñador, fragancias de nicho y árabes. Compra fácil, entrega rápida.',
  openGraph: {
    title: 'Perfumes 2506',
    description: 'Fragancias de autor y nicho — experiencia de compra premium',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <main style={{ paddingTop: 'var(--nav-height)', flex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
