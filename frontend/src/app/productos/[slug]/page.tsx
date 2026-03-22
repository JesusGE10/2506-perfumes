import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import apiFetch from '@/lib/api';
import type { PerfumeDetailResponse } from '@/lib/types';
import ProductDetail from '@/components/ProductDetail';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string): Promise<PerfumeDetailResponse | null> {
  try {
    return await apiFetch<PerfumeDetailResponse>(`/products/${slug}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Perfume no encontrado' };
  return {
    title: `${product.nombre} — ${product.marca.nombre} | Perfumería Fina`,
    description: product.descripcion ?? `${product.nombre} de ${product.marca.nombre}. ${product.genero}.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <div className="container">
      <ProductDetail product={product} />
    </div>
  );
}
