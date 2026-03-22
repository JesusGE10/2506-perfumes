import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Perfumería Fina — Fragancias de Autor y Nicho',
  description: 'Descubre nuestra colección exclusiva de perfumes de diseñador, fragancias de nicho y árabes. Compra fácil, entrega rápida.',
  openGraph: {
    title: 'Perfumería Fina',
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
