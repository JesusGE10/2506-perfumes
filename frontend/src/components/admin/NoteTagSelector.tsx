'use client';
/**
 * NoteTagSelector — controlled-vocabulary selector for olfactive notes.
 *
 * Fetches notes from GET /api/v1/products/notes and presents them
 * grouped by family (TOP, CORAZON, FONDO) with a search filter.
 * Selected notes are displayed as removable tag chips.
 */

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/api';

const FAMILY_LABELS: Record<string, string> = {
  top: '🍋 Salida',
  corazon: '🌹 Corazón',
  fondo: '🪵 Fondo',
};

const FAMILY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  top: { bg: '#fefce8', text: '#854d0e', border: '#fde047' },
  corazon: { bg: '#fff1f2', text: '#9f1239', border: '#fda4af' },
  fondo: { bg: '#f5f5f0', text: '#44403c', border: '#a8a29e' },
};

export interface NoteSelection {
  id: string;
  nombre: string;
  familia: string;
}

interface NoteTagSelectorProps {
  value: NoteSelection[];
  onChange: (notes: NoteSelection[]) => void;
  label?: string;
}

interface ApiNote {
  id: string;
  nombre: string;
  familia: string;
}

export default function NoteTagSelector({ value, onChange, label = 'Notas olfativas' }: NoteTagSelectorProps) {
  const [allNotes, setAllNotes] = useState<ApiNote[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all available notes once
  useEffect(() => {
    adminFetch<ApiNote[]>('/products/notes')
      .then(setAllNotes)
      .catch(() => {/* silently fail — notes are optional */})
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedIds = new Set(value.map(n => n.id));

  const filtered = search.trim()
    ? allNotes.filter(n => n.nombre.toLowerCase().includes(search.toLowerCase()))
    : allNotes;

  // Group by family for display
  const grouped = filtered.reduce<Record<string, ApiNote[]>>((acc, note) => {
    if (!acc[note.familia]) acc[note.familia] = [];
    acc[note.familia].push(note);
    return acc;
  }, {});

  function toggleNote(note: ApiNote) {
    if (selectedIds.has(note.id)) {
      onChange(value.filter(n => n.id !== note.id));
    } else {
      onChange([...value, { id: note.id, nombre: note.nombre, familia: note.familia }]);
    }
  }

  function removeNote(id: string) {
    onChange(value.filter(n => n.id !== id));
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Label */}
      <label style={{
        display: 'block', fontSize: '0.78rem', fontWeight: 700,
        color: '#6b5c4a', marginBottom: 6,
      }}>
        {label}
      </label>

      {/* Selected tags */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {value.map(note => {
            const colors = FAMILY_COLORS[note.familia] ?? { bg: '#f0ede8', text: '#5a4a3a', border: '#d9d4cd' };
            return (
              <span
                key={note.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: colors.bg, color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 99, padding: '3px 10px',
                  fontSize: '0.75rem', fontWeight: 600,
                }}
              >
                {note.nombre}
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.text, fontSize: '0.65rem', padding: 0,
                    lineHeight: 1, opacity: 0.7, marginLeft: 2,
                  }}
                >✕</button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input / trigger */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          border: `1px solid ${isOpen ? '#b8761e' : '#d9d4cd'}`,
          background: '#faf9f7', cursor: 'text',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar nota olfativa..."
          value={search}
          onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            outline: 'none', fontSize: '0.85rem', color: '#1a1410',
          }}
        />
        {value.length > 0 && (
          <span style={{
            background: '#b8761e', color: '#fff',
            borderRadius: 99, padding: '2px 8px',
            fontSize: '0.68rem', fontWeight: 800,
          }}>
            {value.length}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          background: '#fff', borderRadius: 12,
          border: '1px solid #d9d4cd',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              Cargando notas...
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              No se encontraron notas con "{search}"
            </div>
          ) : (
            Object.entries(grouped).map(([familia, notes]) => (
              <div key={familia}>
                {/* Family header */}
                <div style={{
                  padding: '8px 14px 4px',
                  fontSize: '0.68rem', fontWeight: 800,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: '#faf9f7',
                  borderBottom: '1px solid #f0ede8',
                }}>
                  {FAMILY_LABELS[familia] ?? familia}
                </div>
                {/* Note options */}
                {notes.map(note => {
                  const isSelected = selectedIds.has(note.id);
                  const colors = FAMILY_COLORS[note.familia] ?? { bg: '#f0ede8', text: '#5a4a3a', border: '#d9d4cd' };
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => toggleNote(note)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 14px',
                        border: 'none', textAlign: 'left', cursor: 'pointer',
                        background: isSelected ? colors.bg : 'transparent',
                        transition: 'background 0.1s',
                        fontSize: '0.82rem', color: isSelected ? colors.text : '#1a1410',
                        fontWeight: isSelected ? 700 : 400,
                      }}
                    >
                      <span style={{
                        width: 16, height: 16, borderRadius: 4,
                        border: `1.5px solid ${isSelected ? colors.text : '#d9d4cd'}`,
                        background: isSelected ? colors.bg : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: '0.6rem', color: colors.text,
                        transition: 'all 0.15s',
                      }}>
                        {isSelected && '✓'}
                      </span>
                      {note.nombre}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
