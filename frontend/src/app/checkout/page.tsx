'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore } from '@/store/cartStore';
import apiFetch from '@/lib/api';
import type { CheckoutCreateRequest, PedidoResponse, ZonaEnvioResponse } from '@/lib/types';
import styles from './page.module.css';

const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Yaracuy', 'Zulia'
].sort();

const schema = z.object({
  cliente_nombre: z.string().min(2, 'Ingresa tu nombre completo'),
  cliente_telefono: z.string().min(10, 'Ingresa un número válido'),
  tipo_envio: z.enum(['delivery', 'nacional'], { errorMap: () => ({ message: 'Selecciona una modalidad' }) }),
  direccion: z.string().optional(),
  estado: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo_envio === 'delivery') {
    if (!data.direccion || data.direccion.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresa tu dirección exacta', path: ['direccion'] });
    }
  } else if (data.tipo_envio === 'nacional') {
    if (!data.estado) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecciona un estado', path: ['estado'] });
    }
  }
});

type CheckoutForm = z.infer<typeof schema>;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const clearCart = useCartStore((s) => s.clearCart);

  const [zones, setZones] = useState<ZonaEnvioResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({ resolver: zodResolver(schema) });

  const watchedTipoEnvio = watch('tipo_envio');

  useEffect(() => {
    apiFetch<ZonaEnvioResponse[]>('/delivery-zones').then(setZones).catch(() => {});
  }, []);

  // Redirect if cart empty
  useEffect(() => {
    if (mounted && items.length === 0) router.push('/carrito');
  }, [items, router, mounted]);

  const deliveryZone = zones.find((z) => z.nombre.includes('Caracas'));
  const nationalZone = zones.find((z) => z.nombre.includes('Nacional'));
  const activeZone = watchedTipoEnvio === 'delivery' ? deliveryZone : nationalZone;
  const shippingCost = activeZone ? Number(activeZone.costo) : 0;
  const finalTotal = totalPrice + shippingCost;

  const onSubmit = async (data: CheckoutForm) => {
    setSubmitting(true);
    setError(null);
    try {
      let phone = data.cliente_telefono.trim();
      if (phone.startsWith('0')) {
        phone = '+58' + phone.slice(1);
      } else if (!phone.startsWith('+')) {
        phone = '+58' + phone;
      }
      
      const payload: CheckoutCreateRequest = {
        cliente_nombre: data.cliente_nombre,
        cliente_telefono: phone,
        direccion: data.tipo_envio === 'delivery' ? data.direccion! : `Envío Nacional - Estado: ${data.estado}`,
        zona_envio_id: (data.tipo_envio === 'delivery' ? deliveryZone?.id : nationalZone?.id) ?? zones[0].id,
        metodo_pago: 'transferencia' as any,
        items: items.map((i) => ({
          presentacion_id: i.presentacion.id,
          cantidad: i.cantidad,
        })),
      };
      
      const order = await apiFetch<PedidoResponse>('/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const displayPhone = phone.replace('+58', '').trim();
      const shippingLabel = data.tipo_envio === 'delivery' ? `$${order.costo_envio}` : 'Cobro a destino';

      // Build WhatsApp message
      const lines = [
        `*Nuevo Pedido — Perfumería Fina*`,
        ``,
        `*Pedido #${order.id.slice(0, 8).toUpperCase()}*`,
        `Cliente: ${order.cliente_nombre}`,
        `Teléfono: ${displayPhone}`,
        `Dirección: ${order.direccion}`,
        `Método de pago: A coordinar`,
        ``,
        `*Productos:*`,
        ...order.items.map(
          (i) =>
            `• ${i.perfume_nombre ?? 'Perfume'} ${i.tamano_ml}ml × ${i.cantidad} = $${(i.precio_unitario * i.cantidad).toFixed(2)}`
        ),
        ``,
        `Subtotal: $${order.subtotal}`,
        `Envío: ${shippingLabel}`,
        `*Total: $${order.total}*`,
      ];

      const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER ?? '';
      const waText = encodeURIComponent(lines.join('\n'));
      const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

      clearCart();
      window.open(waUrl, '_blank');
      router.push('/checkout/confirmacion?order=' + order.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null; // Prevents hydration mismatch with localStorage items
  if (items.length === 0) return null;

  return (
    <div className="container section">
      <div className={styles.header}>
        <h1>Checkout</h1>
        <p className="text-muted">Completa tu información de envío para finalizar el pedido.</p>
      </div>

      <div className={styles.layout}>
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Información de contacto</legend>

            <div className={styles.field}>
              <label className="form-label">Nombre completo</label>
              <input
                {...register('cliente_nombre')}
                className={`input ${errors.cliente_nombre ? 'error' : ''}`}
                placeholder="Tu nombre completo"
              />
              {errors.cliente_nombre && <p className="form-error">{errors.cliente_nombre.message}</p>}
            </div>

            <div className={styles.field}>
              <label className="form-label">Teléfono / WhatsApp</label>
              <input
                {...register('cliente_telefono')}
                className={`input ${errors.cliente_telefono ? 'error' : ''}`}
                placeholder="+58 412 000 0000"
                type="tel"
              />
              {errors.cliente_telefono && <p className="form-error">{errors.cliente_telefono.message}</p>}
            </div>

            <legend className={styles.legend}>Información de envío y pago</legend>

            <div className={styles.field}>
              <label className="form-label">Modalidad de entrega</label>
              <div className={styles.paymentOptions}>
                <label className={styles.paymentOption}>
                  <input type="radio" value="delivery" {...register('tipo_envio')} />
                  <span>Delivery en Caracas ($5)</span>
                </label>
                <label className={styles.paymentOption}>
                  <input type="radio" value="nacional" {...register('tipo_envio')} />
                  <span>Envío a Nivel Nacional</span>
                </label>
              </div>
              {errors.tipo_envio && <p className="form-error">{errors.tipo_envio.message}</p>}
            </div>

            {watchedTipoEnvio === 'delivery' && (
              <div className={styles.field}>
                <label className="form-label">Dirección exacta</label>
                <textarea
                  {...register('direccion')}
                  className={`input ${styles.textarea} ${errors.direccion ? 'error' : ''}`}
                  placeholder="Calle, edificio, apartamento, referencias..."
                  rows={3}
                />
                {errors.direccion && <p className="form-error">{errors.direccion.message}</p>}
              </div>
            )}

            {watchedTipoEnvio === 'nacional' && (
              <div className={styles.field}>
                <label className="form-label">Estado de Venezuela</label>
                <select
                  {...register('estado')}
                  className={`select ${errors.estado ? 'error' : ''}`}
                >
                  <option value="">Selecciona tu estado</option>
                  {ESTADOS_VENEZUELA.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                {errors.estado && <p className="form-error">{errors.estado.message}</p>}
              </div>
            )}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Métodos de pago aceptados</legend>
            <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '13px' }}>
              El pago se coordinará vía WhatsApp tras confirmar tu pedido.
            </p>
            <ul className={styles.infoList}>
              <li>📱 Pago móvil</li>
              <li>📲 Zelle</li>
              <li>🟡 Binance Pay</li>
              <li>💵 Efectivo al recibir (Solo Caracas)</li>
              <li>🏦 Transferencias bancarias</li>
            </ul>
          </fieldset>

          {error && (
            <div className={styles.errorBanner}>
              <strong>Error:</strong> {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={submitting}
          >
            {submitting ? 'Procesando...' : '✓ Confirmar pedido vía WhatsApp'}
          </button>
        </form>

        {/* Order Summary */}
        <div className={`card ${styles.summary}`}>
          <h3 className={styles.summaryTitle}>Tu pedido</h3>
          {items.map((item) => (
            <div key={item.presentacion.id} className={styles.summaryItem}>
              <div className={styles.summaryItemInfo}>
                <span className={styles.summaryItemName}>{item.perfume.nombre}</span>
                <span className={styles.summaryItemSub}>
                  {item.presentacion.tamano_ml}ml × {item.cantidad}
                </span>
              </div>
              <span className={styles.summaryItemPrice}>
                ${(item.presentacion.precio * item.cantidad).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="divider" />

          <div className={styles.summaryRow}>
            <span className="text-muted">Subtotal</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className="text-muted">Envío</span>
            <span>{watchedTipoEnvio === 'nacional' ? 'Cobro a destino' : shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : '—'}</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <strong>Total</strong>
            <strong className={styles.totalAmount}>${finalTotal.toFixed(2)}</strong>
          </div>

          <p className={styles.waNote}>
            Al confirmar, se abrirá WhatsApp con el resumen de tu pedido para coordinarlo con nosotros.
          </p>
        </div>
      </div>
    </div>
  );
}
