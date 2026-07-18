'use client';

import { useState, useCallback } from 'react';
import { createClient }       from '@/lib/supabase/client';
import { togglePrescriptionEntry } from '@/lib/dal/daily';
import type { PrescriptionDetail } from '@/types/dal';

interface Props {
  entryId:       number;
  prescriptions: PrescriptionDetail[];
  takenIds:      number[];
}

export function MedsTab({ entryId, prescriptions, takenIds: initialTakenIds }: Props) {
  const supabase = createClient();
  const [takenIds, setTakenIds] = useState<number[]>(initialTakenIds);
  const [pending,  setPending]  = useState<Set<number>>(new Set());

  const toggle = useCallback(async (prescriptionId: number) => {
    if (pending.has(prescriptionId)) return;

    const nowTaken = !takenIds.includes(prescriptionId);
    setTakenIds(prev => nowTaken ? [...prev, prescriptionId] : prev.filter(id => id !== prescriptionId));
    setPending(prev => new Set(prev).add(prescriptionId));

    try {
      await togglePrescriptionEntry(supabase, entryId, prescriptionId, nowTaken);
    } catch {
      // Revert optimistic update on failure
      setTakenIds(prev => nowTaken ? prev.filter(id => id !== prescriptionId) : [...prev, prescriptionId]);
    } finally {
      setPending(prev => { const next = new Set(prev); next.delete(prescriptionId); return next; });
    }
  }, [supabase, entryId, takenIds, pending]);

  if (prescriptions.length === 0) {
    return <p className="empty-state">No active prescriptions found.</p>;
  }

  return (
    <div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
        Tap to mark as taken today.
      </p>

      {prescriptions.map(rx => {
        const taken = takenIds.includes(rx.id);
        const busy  = pending.has(rx.id);

        return (
          <button
            key={rx.id}
            type="button"
            className={`prescription-item${taken ? ' prescription-item--taken' : ''}`}
            onClick={() => toggle(rx.id)}
            disabled={busy}
          >
            <div className="prescription-item__check">
              {taken && '✓'}
            </div>
            <div>
              <div className="prescription-item__name">
                {rx.alias ?? rx.medication.medication_name}
              </div>
              <div className="prescription-item__timing">
                {rx.dose ? `${rx.dose} · ` : ''}{rx.timing_type?.timing_name ?? ''}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
