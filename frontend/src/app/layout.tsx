import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

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
      <body>
        <Navbar />
        <main style={{ paddingTop: 'var(--nav-height)' }}>
          {children}
        </main>
        <footer style={{
          borderTop: '1px solid var(--color-border)',
          padding: '40px 0',
          marginTop: '80px',
          textAlign: 'center',
          color: 'var(--color-text-subtle)',
          fontSize: '0.8rem',
          letterSpacing: '0.05em',
        }}>
          <div className="container">
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-gold)', marginBottom: '8px' }}>
              ✦ Perfumería Fina
            </p>
            <p>Fragancias de autor · Nicho · Árabes</p>
            <p style={{ marginTop: '8px' }}>© {new Date().getFullYear()} Todos los derechos reservados</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
