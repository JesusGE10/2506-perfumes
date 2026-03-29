import type { Metadata } from 'next';
import './globals.css';
import ClientRootLayout from '@/components/ClientRootLayout';

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
      <body>
        <ClientRootLayout>{children}</ClientRootLayout>
      </body>
    </html>
  );
}
