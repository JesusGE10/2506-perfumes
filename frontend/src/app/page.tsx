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
          <Link href="/productos" className={styles.heroBtn}>
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
              <Link href="/productos" className={styles.seeAll}>Ver todo →</Link>
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
              <Link href="/productos?sort_by=newest" className={styles.seeAll}>Ver todo →</Link>
            </div>
            <div className={styles.grid}>
              {newest.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer strip matching reference */}
      <footer className={styles.footerStrip}>
        <div className="container">
          <div className={styles.footerGrid}>
            <div className={styles.footerCol}>
              <h5>Fragancias</h5>
              <Link href="/productos?gender=masculino">Para Él</Link>
              <Link href="/productos?gender=femenino">Para Ella</Link>
              <Link href="/productos?gender=unisex">Unisex</Link>
              <Link href="/productos?sort_by=newest">Nuevos Lanzamientos</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>Colecciones</h5>
              <Link href="/productos">Clásicos</Link>
              <Link href="/productos?is_arab=true">Colección Árabe</Link>
              <Link href="/productos?destacado=true">Destacados</Link>
            </div>
            <div className={styles.footerCol}>
              <h5>Acerca de</h5>
              <p>Perfumería Fina</p>
              <p>El Arte del Perfume</p>
            </div>
            <div className={styles.footerCol}>
              <h5>Contacto</h5>
              <p>WhatsApp disponible</p>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Perfumería Fina. Todos los derechos reservados.</span>
            <div className={styles.footerLinks}>
              <a href="#">Términos de Privacidad</a>
              <a href="#">Política de Devoluciones</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
