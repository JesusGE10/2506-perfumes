// API base URL — proxied through Next.js in development
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  
  const data = await res.json();
  
  // FIX GLOBAL: Inyectar fallback exacto sincronizado con la DB si el backend en cache retorna null
  const slugImageMap: Record<string, string> = {
    "bois-sauvage": "/productos/perfume_dark.png",
    "la-vie-est-belle": "/productos/perfume_gold.png",
    "rasasi-hawas": "/productos/perfume_oud.png",
    "ambre-dore": "/productos/perfume_floral.png",
    "fleur-de-nuit": "/productos/perfume_dark.png",
    "oud-vanille": "/productos/perfume_gold.png",
    "santal-royal": "/productos/perfume_oud.png",
    "noir-intense": "/productos/perfume_floral.png",
    "rose-mystique": "/productos/perfume_dark.png",
    "eclat-dor": "/productos/perfume_gold.png"
  };
  
  const injectImage = (item: any) => {
    if (item && item.slug && item.imagen_principal === null) {
      item.imagen_principal = slugImageMap[item.slug] || '/productos/perfume_gold.png';
    }
  };

  if (Array.isArray(data)) {
    data.forEach(injectImage);
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) {
      data.items.forEach(injectImage);
    } else {
      injectImage(data);
    }
  }

  return data as T;
}

/**
 * Authenticated fetch for admin endpoints.
 * Reads the JWT token from localStorage (via authStore key) and injects
 * it as a Bearer Authorization header.
 */
export async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Read token from Zustand persist storage
  let token: string | null = null;
  try {
    const raw = localStorage.getItem('admin-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      token = parsed?.state?.token ?? null;
    }
  } catch {
    // localStorage not available (SSR) — token stays null
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export default apiFetch;
