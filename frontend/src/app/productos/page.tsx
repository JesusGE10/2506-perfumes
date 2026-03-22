import { Suspense } from 'react';
import type { Metadata } from 'next';
import apiFetch from '@/lib/api';
import type { PaginatedResponse, PerfumeSummaryResponse } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import CatalogFilters from '@/components/CatalogFilters';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Catálogo — Perfumería Fina',
  description: 'Explora nuestra colección completa de perfumes de diseñador, nicho y árabes.',
};

interface SearchParams {
  category?: string;
  brand?: string;
  gender?: string;
  is_arab?: string;
  q?: string;
  sort_by?: string;
  page?: string;
}

async function getProducts(params: SearchParams): Promise<PaginatedResponse<PerfumeSummaryResponse>> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.brand) query.set('brand', params.brand);
  if (params.gender) query.set('gender', params.gender);
  if (params.is_arab) query.set('is_arab', params.is_arab);
  if (params.q) query.set('q', params.q);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  query.set('page', params.page ?? '1');
  query.set('size', '24');

  try {
    return await apiFetch<PaginatedResponse<PerfumeSummaryResponse>>(
      `/products?${query.toString()}`
    );
  } catch {
    return { items: [], total: 0, page: 1, size: 24, pages: 0 };
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await getProducts(params);
  const currentPage = parseInt(params.page ?? '1');

  return (
    <div className="container section">
      {/* Header */}
      <div className={styles.header}>
        <h1>Catálogo de Perfumes</h1>
        <p className="text-muted">
          Fragancias de autor, nicho y árabes — selección curada
        </p>
      </div>

      <div className="divider" />

      {/* Filters */}
      <Suspense>
        <CatalogFilters total={data.total} />
      </Suspense>

      {/* Grid */}
      {data.items.length > 0 ? (
        <>
          <div className={styles.grid}>
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className={styles.pagination}>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/productos?${new URLSearchParams({ ...params, page: String(p) })}`}
                  className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>◎</span>
          <h3>No se encontraron perfumes</h3>
          <p>Intenta con otros filtros o explora el catálogo completo.</p>
          <a href="/productos" className="btn btn-secondary">
            Ver todos los perfumes
          </a>
        </div>
      )}
    </div>
  );
}
