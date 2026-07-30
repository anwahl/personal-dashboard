'use client';

/**
 * components/providers/ProviderSettings.tsx
 *
 * Settings UI for managing healthcare providers.
 * Handles listing, inline editing, activating/deactivating, and adding providers.
 * All DB operations go through lib/dal/providers.
 */

import { useState, useCallback } from 'react';
import { createClient }          from '@/lib/supabase/client';
import {
  createProvider,
  updateProvider,
  toggleProviderActive,
} from '@/lib/dal/providers';
import { Button, InputField }     from '@/components/ui';
import type { ProviderRow, ProviderTypeRow } from '@/types/schema';

// ── Add form ──────────────────────────────────────────────────────────────────

interface AddProviderFormProps {
  providerTypes: ProviderTypeRow[];
  onAdded:       (provider: ProviderRow) => void;
}

function AddProviderForm({ providerTypes, onAdded }: Readonly<AddProviderFormProps>) {
  const supabase = createClient();

  const [show,     setShow]     = useState(false);
  const [typeId,   setTypeId]   = useState('');
  const [name,     setName]     = useState('');
  const [practice, setPractice] = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const reset = () => {
    setTypeId(''); setName(''); setPractice(''); setPhone(''); setShow(false);
  };

  const save = useCallback(async () => {
    if (!typeId) return;
    setSaving(true);
    try {
      const provider = await createProvider(supabase, {
        provider_type_id: Number.parseInt(typeId),
        provider_name:    name.trim()     || null,
        practice_name:    practice.trim() || null,
        phone:            phone.trim()    || null,
      });
      onAdded(provider);
      reset();
    } finally {
      setSaving(false);
    }
  }, [supabase, typeId, name, practice, phone, onAdded]);

  if (!show) {
    return (
      <div className="manage-add-row">
        <Button variant="ghost" size="sm" onClick={() => setShow(true)}>
          + Add Provider
        </Button>
      </div>
    );
  }

  return (
    <div className="form-panel">
      <div className="field-grid">
        <InputField label="Type" id="provider-type">
          <select
            id="provider-type"
            value={typeId}
            onChange={e => setTypeId(e.target.value)}
          >
            <option value="">Select type…</option>
            {providerTypes.map(t => (
              <option key={t.id} value={t.id}>{t.type_name}</option>
            ))}
          </select>
        </InputField>
        <InputField label="Provider name" id="provider-name">
          <input
            id="provider-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Dr. Smith"
          />
        </InputField>
        <InputField label="Practice" id="provider-practice">
          <input
            id="provider-practice"
            type="text"
            value={practice}
            onChange={e => setPractice(e.target.value)}
            placeholder="Helena Family Medicine"
          />
        </InputField>
        <InputField label="Phone" id="provider-phone">
          <input
            id="provider-phone"
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(406) 555-1234"
          />
        </InputField>
      </div>
      <div className="form-row form-row--actions">
        <Button
          variant="accent"
          size="sm"
          onClick={save}
          disabled={saving || !typeId}
        >
          {saving ? 'Saving…' : 'Add Provider'}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Edit form (inline per-row) ────────────────────────────────────────────────

interface EditFormState {
  provider_type_id: string;
  provider_name:    string;
  practice_name:    string;
  phone:            string;
}

interface ProviderRowItemProps {
  provider:      ProviderRow;
  providerTypes: ProviderTypeRow[];
  onUpdated:     (provider: ProviderRow) => void;
  onToggled:     (id: number, isActive: boolean) => void;
}

function ProviderRowItem({
  provider, providerTypes, onUpdated, onToggled,
}: Readonly<ProviderRowItemProps>) {
  const supabase = createClient();

  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState<EditFormState>({
    provider_type_id: String(provider.provider_type_id),
    provider_name:    provider.provider_name  ?? '',
    practice_name:    provider.practice_name  ?? '',
    phone:            provider.phone          ?? '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof EditFormState, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await updateProvider(supabase, provider.id, {
        provider_type_id: Number.parseInt(form.provider_type_id),
        provider_name:    form.provider_name.trim()  || null,
        practice_name:    form.practice_name.trim()  || null,
        phone:            form.phone.trim()           || null,
      });
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [supabase, provider.id, form, onUpdated]);

  const cancel = () => {
    setForm({
      provider_type_id: String(provider.provider_type_id),
      provider_name:    provider.provider_name  ?? '',
      practice_name:    provider.practice_name  ?? '',
      phone:            provider.phone          ?? '',
    });
    setEditing(false);
  };

  const typeName = providerTypes.find(t => t.id === provider.provider_type_id)?.type_name ?? '';

  return (
    <div className={`manage-item${provider.is_active ? '' : ' manage-item--inactive'}`}>
      {editing ? (
        <>
          <select
            value={form.provider_type_id}
            onChange={e => setField('provider_type_id', e.target.value)}
            style={{ width: 130 }}
          >
            {providerTypes.map(t => (
              <option key={t.id} value={t.id}>{t.type_name}</option>
            ))}
          </select>
          <input
            type="text"
            value={form.provider_name}
            onChange={e => setField('provider_name', e.target.value)}
            placeholder="Provider name"
            style={{ flex: 1 }}
          />
          <input
            type="text"
            value={form.practice_name}
            onChange={e => setField('practice_name', e.target.value)}
            placeholder="Practice"
            style={{ flex: 1 }}
          />
          <input
            type="text"
            value={form.phone}
            onChange={e => setField('phone', e.target.value)}
            placeholder="Phone"
            style={{ width: 140 }}
          />
          <div className="manage-item__actions">
            <Button size="sm" variant="accent" onClick={save} disabled={saving}>✓</Button>
            <Button size="sm" variant="ghost"  onClick={cancel}>✕</Button>
          </div>
        </>
      ) : (
        <>
          <div className="manage-item__name">
            {provider.provider_name ?? provider.practice_name ?? 'Unnamed'}
            {provider.practice_name && provider.provider_name && (
              <span className="manage-item__meta">{provider.practice_name}</span>
            )}
            {typeName && <span className="badge">{typeName}</span>}
          </div>
          <div className="manage-item__actions">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
            <Button
              size="sm"
              variant={provider.is_active ? 'ghost' : 'accent'}
              onClick={() => onToggled(provider.id, !provider.is_active)}
            >
              {provider.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface ProviderSettingsProps {
  providers:     ProviderRow[];
  providerTypes: ProviderTypeRow[];
}

export function ProviderSettings({
  providers: initial,
  providerTypes,
}: Readonly<ProviderSettingsProps>) {
  const supabase = createClient();

  const [providers, setProviders] = useState<ProviderRow[]>(initial);

  const handleUpdated = (updated: ProviderRow) =>
    setProviders(prev => prev.map(p => p.id === updated.id ? updated : p));

  const handleToggled = useCallback(async (id: number, isActive: boolean) => {
    await toggleProviderActive(supabase, id, isActive);
    setProviders(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));
  }, [supabase]);

  const handleAdded = (provider: ProviderRow) =>
    setProviders(prev => [...prev, provider]);

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <span className="settings-section__title">Providers</span>
      </div>
      <p className="settings-section__desc">
        Healthcare providers linked to appointments and prescriptions.
      </p>

      {providers.length === 0 && (
        <p className="empty-state">No providers yet.</p>
      )}

      {providers.map(p => (
        <ProviderRowItem
          key={p.id}
          provider={p}
          providerTypes={providerTypes}
          onUpdated={handleUpdated}
          onToggled={handleToggled}
        />
      ))}

      <AddProviderForm
        providerTypes={providerTypes}
        onAdded={handleAdded}
      />
    </div>
  );
}