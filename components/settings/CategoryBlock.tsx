'use client';

/**
 *
 * Shared UI for a named category that contains a list of child items.
 * Used by SymptomSettings (categories → types) and JournalSettings
 * (categories → prompts).
 *
 * Exports:
 *   CategoryBlock  — the outer category container + header
 *   ChildItem      — a single item row inside a category
 */

import { useState, useCallback } from 'react';
import { Button, ConfirmButton } from '@/components/ui';

// ── CategoryBlock ─────────────────────────────────────────────────────────────

interface CategoryBlockProps {
  name:        string;
  is_active:   boolean;
  isFirst:     boolean;
  isLast:      boolean;
  onMoveUp:    () => void;
  onMoveDown:  () => void;
  onRename:    (name: string) => Promise<void>;
  onToggle:    (active: boolean) => Promise<void>;
  onDelete:    () => Promise<void>;
  /** The list of child items (already rendered by the parent). */
  children:    React.ReactNode;
  /** The add-item form row shown at the bottom of the body. */
  addRow:      React.ReactNode;
  /** Whether to show the delete confirm button. Default: true. */
  showDelete?: boolean;
}

export function CategoryBlock({
  name, is_active, isFirst, isLast,
  onMoveUp, onMoveDown, onRename, onToggle, onDelete,
  children, addRow,
  showDelete = true,
}: Readonly<CategoryBlockProps>) {
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(name);
  const [saving,   setSaving]   = useState(false);

  const startEdit  = () => { setEditName(name); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const saveRename = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === name) { setEditing(false); return; }
    setSaving(true);
    try { await onRename(trimmed); setEditing(false); }
    finally { setSaving(false); }
  }, [editName, name, onRename]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  saveRename();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="category-block">
      <div className="category-block__header">
        {editing ? (
          <>
            <input
              className="category-block__name-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="category-block__actions">
              <Button size="sm" variant="accent" onClick={saveRename} disabled={saving}>✓</Button>
              <Button size="sm" variant="ghost"  onClick={cancelEdit}>✕</Button>
            </div>
          </>
        ) : (
          <>
            <span className={`category-block__name${is_active ? '' : ' category-block__name--inactive'}`}>
              {name}
            </span>
            <div className="category-block__actions">
              {is_active && (
                <>
                  <Button size="icon" variant="ghost" onClick={onMoveUp}   disabled={isFirst} title="Move up">↑</Button>
                  <Button size="icon" variant="ghost" onClick={onMoveDown} disabled={isLast}  title="Move down">↓</Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={startEdit} title="Rename">✏️</Button>
              <Button size="sm" variant="ghost" onClick={() => onToggle(!is_active)}>
                {is_active ? 'Deactivate' : 'Activate'}
              </Button>
              {showDelete && <ConfirmButton onConfirm={onDelete} size="sm">✕</ConfirmButton>}
            </div>
          </>
        )}
      </div>

      <div className="category-block__body">
        {children}
        {addRow}
      </div>
    </div>
  );
}

// ── ChildItem ─────────────────────────────────────────────────────────────────

interface ChildItemProps {
  name:        string;
  is_active:   boolean;
  isFirst:     boolean;
  isLast:      boolean;
  /** Render the name in italics. */
  italic?:     boolean;
  /** Use a textarea instead of a single-line input when editing. */
  multiline?:  boolean;
  onMoveUp:    () => void;
  onMoveDown:  () => void;
  onRename:    (name: string) => Promise<void>;
  onToggle:    (active: boolean) => Promise<void>;
  onDelete:    () => Promise<void>;
  /** Whether to show the delete confirm button. Default: true. */
  showDelete?: boolean;
}

export function ChildItem({
  name, is_active, isFirst, isLast,
  italic    = false,
  multiline = false,
  onMoveUp, onMoveDown, onRename, onToggle, onDelete,
  showDelete = true,
}: Readonly<ChildItemProps>) {
  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState(name);
  const [saving,   setSaving]   = useState(false);

  const startEdit  = () => { setEditName(name); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const saveRename = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === name) { setEditing(false); return; }
    setSaving(true);
    try { await onRename(trimmed); setEditing(false); }
    finally { setSaving(false); }
  }, [editName, name, onRename]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') cancelEdit();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveRename(); }
  };

  const nameClass = ['manage-item__name', italic ? 'manage-item__name--italic' : '']
    .filter(Boolean).join(' ');

  return (
    <div className={`manage-item${is_active ? '' : ' manage-item--inactive'}`}>
      {editing ? (
        <>
          {multiline ? (
            <textarea
              className="input--flex textarea--short"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <input
              type="text"
              className="input--flex"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
          <div className="manage-item__actions">
            <Button size="sm" variant="accent" onClick={saveRename} disabled={saving}>✓</Button>
            <Button size="sm" variant="ghost"  onClick={cancelEdit}>✕</Button>
          </div>
        </>
      ) : (
        <>
          <span className={nameClass}>{name}</span>
          <div className="manage-item__actions">
            {is_active && (
              <>
                <Button size="icon" variant="ghost" onClick={onMoveUp}   disabled={isFirst} title="Move up">↑</Button>
                <Button size="icon" variant="ghost" onClick={onMoveDown} disabled={isLast}  title="Move down">↓</Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={startEdit} title="Edit">✏️</Button>
            <Button size="sm" variant="ghost" onClick={() => onToggle(!is_active)}>
              {is_active ? 'Deactivate' : 'Activate'}
            </Button>
            {showDelete && <ConfirmButton onConfirm={onDelete} size="sm">✕</ConfirmButton>}
          </div>
        </>
      )}
    </div>
  );
}