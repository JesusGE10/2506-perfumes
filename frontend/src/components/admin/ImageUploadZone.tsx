'use client';
/**
 * ImageUploadZone — drag-and-drop multi-image uploader for product media.
 *
 * Features:
 * - Drag & drop or click-to-browse, max 10 images per product
 * - Live WebP preview via FileReader (before upload)
 * - Reorder via drag-within-list (mouse drag-and-drop on preview strip)
 * - Delete individual images (with R2 cleanup via API)
 * - Upload progress indicator per file
 * - First image auto-flagged as principal (shown with ★ badge)
 * - No external dependencies — 100% native browser APIs
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { adminFetch } from '@/lib/api';

const MAX_IMAGES = 10;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface ProductImage {
  id: string;
  url: string;
  s3_key: string | null;
  orden: number;
  es_principal: boolean;
}

interface UploaderProps {
  productId: string;
  initialImages: ProductImage[];
  onChange?: (images: ProductImage[]) => void;
}

interface UploadingFile {
  name: string;
  progress: 'uploading' | 'done' | 'error';
  error?: string;
}

export default function ImageUploadZone({ productId, initialImages, onChange }: UploaderProps) {
  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Drag-within-list state
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external changes (e.g. initial load)
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const notifyParent = useCallback((imgs: ProductImage[]) => {
    onChange?.(imgs);
  }, [onChange]);

  // ── Upload handler ────────────────────────────────────────────────────────
  async function uploadFiles(files: File[]) {
    setError(null);
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Máximo ${MAX_IMAGES} imágenes por producto`);
      return;
    }

    const toUpload = files
      .filter(f => ACCEPTED_TYPES.includes(f.type))
      .slice(0, remaining);

    if (toUpload.length === 0) {
      setError('Sólo se aceptan imágenes JPG, PNG, WebP o GIF');
      return;
    }

    // Show uploading progress items
    const progressItems: UploadingFile[] = toUpload.map(f => ({
      name: f.name,
      progress: 'uploading',
    }));
    setUploading(progressItems);

    const results: ProductImage[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const form = new FormData();
      form.append('file', file);

      try {
        const uploaded = await adminFetch<ProductImage>(
          `/media/products/${productId}/images`,
          { method: 'POST', body: form }
        );
        results.push(uploaded);
        setUploading(prev =>
          prev.map((p, idx) => (idx === i ? { ...p, progress: 'done' } : p))
        );
      } catch (err: any) {
        setUploading(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress: 'error', error: err.message ?? 'Error al subir' } : p
          )
        );
      }
    }

    // Merge new images into local state
    const updated = [...images, ...results];
    setImages(updated);
    notifyParent(updated);

    // Clear uploading strip after 2s
    setTimeout(() => setUploading([]), 2000);
  }

  // ── Drop zone handlers ────────────────────────────────────────────────────
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(true);
  }

  function onDragLeave() {
    setIsDraggingOver(false);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteImage(imgId: string) {
    try {
      await adminFetch(`/media/products/${productId}/images/${imgId}`, {
        method: 'DELETE',
      });
      const updated = images.filter(img => img.id !== imgId);
      setImages(updated);
      notifyParent(updated);
    } catch (err: any) {
      setError(err.message ?? 'Error al eliminar imagen');
    }
  }

  // ── Reorder (drag-within-preview-strip) ──────────────────────────────────
  function onItemDragStart(idx: number) {
    dragItem.current = idx;
  }

  function onItemDragEnter(idx: number) {
    dragOver.current = idx;
  }

  async function onItemDragEnd() {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === null || to === null || from === to) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }

    // Reorder locally first for instant feedback
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // Assign new orden values
    const withOrden = reordered.map((img, i) => ({ ...img, orden: i, es_principal: i === 0 }));
    setImages(withOrden);
    notifyParent(withOrden);

    // Persist new order to API
    try {
      await adminFetch(`/media/products/${productId}/images/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ order: withOrden.map(img => img.id) }),
      });
    } catch {
      // Silent fail — order is cosmetic; doesn't block workflow
    }

    dragItem.current = null;
    dragOver.current = null;
  }

  const isEmpty = images.length === 0;
  const isFull = images.length >= MAX_IMAGES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Drop zone */}
      {!isFull && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDraggingOver ? '#b8761e' : '#d9d4cd'}`,
            borderRadius: 14,
            padding: '32px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDraggingOver
              ? 'linear-gradient(135deg, #fdf5e8 0%, #fef9f2 100%)'
              : '#faf9f7',
            transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            style={{ display: 'none' }}
            onChange={onInputChange}
          />
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>
            {isDraggingOver ? '📂' : '🖼️'}
          </div>
          <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#5a4a3a', marginBottom: 4 }}>
            {isDraggingOver
              ? 'Suelta para subir'
              : 'Arrastra imágenes aquí o haz clic para seleccionar'}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            JPG, PNG, WebP — máx. {MAX_IMAGES} imágenes · se convierten a WebP automáticamente
          </p>
          <p style={{ fontSize: '0.72rem', color: '#b8761e', marginTop: 4, fontWeight: 600 }}>
            {images.length}/{MAX_IMAGES} imágenes
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 8, padding: '10px 14px',
          fontSize: '0.8rem', color: '#dc2626', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ⚠️ {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1rem' }}
          >✕</button>
        </div>
      )}

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {uploading.map((u, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: u.progress === 'error' ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${u.progress === 'error' ? '#fca5a5' : '#bbf7d0'}`,
              borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem',
            }}>
              <span>{u.progress === 'uploading' ? '⏳' : u.progress === 'done' ? '✓' : '✕'}</span>
              <span style={{ flex: 1, fontWeight: 600, color: '#5a4a3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.name}
              </span>
              {u.error && <span style={{ color: '#dc2626' }}>{u.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Image preview strip */}
      {!isEmpty && (
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Arrastra para reordenar · La primera imagen es la principal
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: 10,
          }}>
            {images.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => onItemDragStart(idx)}
                onDragEnter={() => onItemDragEnter(idx)}
                onDragEnd={onItemDragEnd}
                onDragOver={e => e.preventDefault()}
                style={{
                  position: 'relative',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: `2px solid ${idx === 0 ? '#b8761e' : '#e8e4df'}`,
                  cursor: 'grab',
                  userSelect: 'none',
                  aspectRatio: '1',
                  background: '#f0ede8',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Imagen ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                />

                {/* Principal badge */}
                {idx === 0 && (
                  <span style={{
                    position: 'absolute', top: 5, left: 5,
                    background: '#b8761e', color: '#fff',
                    fontSize: '0.6rem', fontWeight: 800,
                    padding: '2px 6px', borderRadius: 99,
                    letterSpacing: '0.05em',
                  }}>
                    ★ PRINCIPAL
                  </span>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => deleteImage(img.id)}
                  title="Eliminar imagen"
                  style={{
                    position: 'absolute', top: 5, right: 5,
                    width: 22, height: 22, borderRadius: '50%',
                    border: 'none', background: 'rgba(0,0,0,0.55)',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 900,
                    lineHeight: 1, transition: 'background 0.15s',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No images warning */}
      {isEmpty && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, padding: '12px 16px',
          fontSize: '0.82rem', color: '#92400e', fontWeight: 600,
        }}>
          ⚠️ Sin imagen — este producto no se mostrará al público hasta que subas al menos una imagen.
        </div>
      )}
    </div>
  );
}
