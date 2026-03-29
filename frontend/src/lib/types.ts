// Shared TypeScript types matching the backend schemas

export type GeneroEnum = 'hombre' | 'mujer' | 'unisex';
export type FamiliaOlfativaEnum = 'citrico' | 'amaderado' | 'floral' | 'oriental' | 'dulce' | 'fresco' | 'especiado' | 'acuatico';
export type TipoNotaEnum = 'salida' | 'corazon' | 'fondo';
export type MetodoPagoEnum = 'transferencia' | 'efectivo' | 'pago_movil' | 'zelle';
export type EstadoPedidoEnum = 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';

export interface MarcaSummary {
  id: string;
  nombre: string;
  slug: string;
}

export interface CategoriaSummary {
  id: string;
  nombre: string;
  slug: string;
}

export interface PresentacionResponse {
  id: string;
  tamano_ml: number;
  precio: number;
  stock: number;
}

export interface ImagenResponse {
  id: string;
  url: string;
  orden: number;
  es_principal: boolean;
}

export interface NotaOlfativaResponse {
  id: string;
  nombre: string;
  familia: FamiliaOlfativaEnum;
  tipo: TipoNotaEnum;
}

export interface PerfumeSummaryResponse {
  id: string;
  nombre: string;
  slug: string;
  genero: GeneroEnum;
  activo: boolean;
  destacado: boolean;
  es_arabe: boolean;
  es_nuevo: boolean;
  marca: MarcaSummary;
  categoria: CategoriaSummary;
  presentaciones: PresentacionResponse[];
  imagen_principal: string | null;
}

export interface PerfumeDetailResponse extends PerfumeSummaryResponse {
  descripcion: string | null;
  imagenes: ImagenResponse[];
  notas: NotaOlfativaResponse[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ZonaEnvioResponse {
  id: string;
  nombre: string;
  costo: number;
  activa: boolean;
}

export interface CheckoutItemInput {
  presentacion_id: string;
  cantidad: number;
}

export interface CheckoutCreateRequest {
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  zona_envio_id: string;
  metodo_pago: MetodoPagoEnum;
  items: CheckoutItemInput[];
}

export interface PedidoItemResponse {
  id: string;
  presentacion_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  perfume_nombre: string | null;
  tamano_ml: number | null;
}

export interface PedidoResponse {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  costo_envio: number;
  subtotal: number;
  descuento_total: number;
  total: number;
  estado: EstadoPedidoEnum;
  metodo_pago: MetodoPagoEnum;
  created_at: string;
  items: PedidoItemResponse[];
}

// Cart (local, Zustand)
export interface CartItem {
  perfume: PerfumeSummaryResponse;
  presentacion: PresentacionResponse;
  cantidad: number;
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  created_at: string;
  last_login: string | null;
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
export interface DashboardMetrics {
  revenue: {
    today: number;
    this_week: number;
    this_month: number;
    total: number;
  };
  orders: {
    today: number;
    by_status: Record<EstadoPedidoEnum, number>;
  };
  low_stock: Array<{
    presentacion_id: string;
    perfume_nombre: string;
    tamano_ml: number;
    stock: number;
  }>;
}
