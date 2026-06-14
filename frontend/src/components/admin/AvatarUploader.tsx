'use client';
/**
 * AvatarUploader — Profile picture binary uploader.
 *
 * UX flow:
 * 1. Render a circle with the current avatar (or initials placeholder).
 * 2. On click → hidden <input type="file"> opens file picker.
 * 3. On file select → optimistic preview + POST /auth/me/avatar.
 * 4. On success → call onSuccess(newUrl) to propagate to parent.
 * 5. On error → revert to previous avatar and show an error state.
 *
 * The component is intentionally self-contained: no external dependencies.
 */

import { useRef, useState } from 'react';
import { adminFetch } from '@/lib/api';
import type { AdminUser } from '@/lib/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — matches backend limit

interface AvatarUploaderProps {
  /** Current avatar URL (may be null/undefined). */
  currentUrl?: string | null;
  /** Admin display name — used for initials placeholder. */
  nombre?: string;
  /** Called with the new CDN URL after a successful upload. */
  onSuccess: (newUrl: string) => void;
  /** Called with a user-facing error string on failure. */
  onError: (msg: string) => void;
}

export default function AvatarUploader({
  currentUrl,
  nombre,
  onSuccess,
  onError,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);

  // Derive initials for the placeholder (max 2 chars)
  const initials = (nombre ?? 'A')
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  function handleClick() {
    if (uploading) return;
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation (mirrors backend constraints)
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError('Formato no soportado. Usa JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      onError(`El archivo es demasiado grande (máx. 5 MB, recibido ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      return;
    }

    // Optimistic preview — show immediately for snappy UX
    const objectUrl = URL.createObjectURL(file);
    const previousPreview = preview;
    setPreview(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // adminFetch handles the Authorization header automatically.
      // We bypass the default 'Content-Type: application/json' by
      // letting fetch set multipart/form-data with the correct boundary.
      const updated = await adminFetch<AdminUser>('/auth/me/avatar', {
        method: 'POST',
        body: formData,
      });

      onSuccess(updated.foto_perfil_url ?? objectUrl);
    } catch (err: unknown) {
      // Revert optimistic preview on failure
      setPreview(previousPreview);
      const msg = err instanceof Error ? err.message : 'Error al subir la imagen';
      onError(msg);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      // Reset input so the same file can be re-selected after an error
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style={{ position: 'relative', width: 88, height: 88 }}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        id="avatar-file-input"
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Avatar circle — clickable */}
      <button
        id="avatar-upload-btn"
        type="button"
        onClick={handleClick}
        title="Haz clic para cambiar tu foto de perfil"
        aria-label="Cambiar foto de perfil"
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          border: '3px solid #d9d4cd',
          background: '#e8e3dc',
          overflow: 'hidden',
          cursor: uploading ? 'wait' : 'pointer',
          padding: 0,
          position: 'relative',
          transition: 'border-color 200ms, box-shadow 200ms',
          boxShadow: uploading ? 'none' : '0 0 0 0 transparent',
          // Hover handled via onMouseEnter/Leave to avoid CSS module coupling
        }}
        onMouseEnter={(e) => {
          if (!uploading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#b8761e';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#d9d4cd';
        }}
      >
        {/* Avatar image or initials */}
        {preview ? (
          <img
            src={preview}
            alt="Foto de perfil"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: '#6b5c4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            fontFamily: 'var(--font-heading, serif)',
          }}>
            {initials || '👤'}
          </span>
        )}

        {/* Upload overlay — always visible on hover, spinner when uploading */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: uploading
              ? 'rgba(0,0,0,0.45)'
              : 'rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: uploading ? 1 : 0,
            transition: 'opacity 200ms',
            pointerEvents: 'none',
          }}
          className="avatar-overlay"
        >
          {uploading ? (
            <span style={{
              width: 22, height: 22, border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff', borderRadius: '50%',
              animation: 'spin 700ms linear infinite',
            }} />
          ) : (
            <>
              <span style={{ fontSize: '1.1rem', color: '#fff' }}>📷</span>
              <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700, marginTop: 2 }}>
                CAMBIAR
              </span>
            </>
          )}
        </span>
      </button>

      {/* Hover triggers the overlay via CSS-in-JS class */}
      <style>{`
        #avatar-upload-btn:hover .avatar-overlay {
          opacity: 1 !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
