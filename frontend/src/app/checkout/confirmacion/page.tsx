import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedido confirmado — Perfumería Fina',
};

export default function ConfirmacionPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-xl)',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(76,175,120,0.12)',
          border: '1px solid rgba(76,175,120,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'var(--color-success)',
        }}
      >
        ✓
      </div>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', marginBottom: '8px' }}>
          ¡Pedido confirmado!
        </h1>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', lineHeight: '1.7' }}>
          Hemos recibido tu pedido. Se abrió WhatsApp con el resumen para coordinar
          la entrega y el pago contigo.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/catalogo" className="btn btn-primary">
          Seguir comprando
        </Link>
        <Link href="/" className="btn btn-ghost">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
