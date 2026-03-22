import Link from 'next/link';
import apiFetch from '@/lib/api';
import type { PerfumeSummaryResponse } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import styles from './page.module.css';

async function getFeatured(): Promise<PerfumeSummaryResponse[]> {
  try { return await apiFetch<PerfumeSummaryResponse[]>('/products/featured'); }
  catch { return []; }
}

async function getNewest(): Promise<PerfumeSummaryResponse[]> {
  try { return await apiFetch<PerfumeSummaryResponse[]>('/products/newest'); }
  catch { return []; }
}

export default async function HomePage() {
  const [featured, newest] = await Promise.all([getFeatured(), getNewest()]);

  return (
    <>
      {/* Hero — full-width with dark overlay like reference */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Descubre Tu Esencia</h1>
          <p className={styles.heroSubtitle}>Fragancias exclusivas que definen tu presencia</p>
          <Link href="/catalogo" className={styles.heroBtn}>
            Ver Colección
          </Link>
        </div>
      </section>

      {/* Nuestras Fragancias */}
      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Nuestras Fragancias</h2>
              <Link href="/catalogo" className={styles.seeAll}>Ver todo →</Link>
            </div>
            <div className={styles.grid}>
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Values */}
      <section className={styles.values}>
        <div className="container">
          <div className={styles.valuesGrid}>
            {[
              { icon: '✦', title: 'Autenticidad', desc: 'Fragancias 100% originales' },
              { icon: '◈', title: 'Entrega rápida', desc: '24-48h dentro de la ciudad' },
              { icon: '◎', title: 'Asesoría', desc: 'Te ayudamos a elegir tu fragancia' },
              { icon: '○', title: 'Pago flexible', desc: 'Transferencia, efectivo o pago móvil' },
            ].map((v) => (
              <div key={v.title} className={styles.valueCard}>
                <span className={styles.valueIcon}>{v.icon}</span>
                <h4>{v.title}</h4>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ofertas Exclusivas / Nuevas Adquisiciones */}
      {newest.length > 0 && (
        <section className="section">
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Ofertas Exclusivas</h2>
              <Link href="/catalogo?sort_by=newest" className={styles.seeAll}>Ver todo →</Link>
            </div>
            <div className={styles.grid}>
              {newest.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

    </>
  );
}
