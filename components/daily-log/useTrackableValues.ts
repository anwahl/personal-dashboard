'use client';

/**
 * useTrackableValues — a day's trackable values being edited, and the actions
 * TrackableInputs draws with.
 *
 * Yes/no tiles, prescriptions, tags and aggregate answers save as soon as
 * they're tapped. Everything else is kept here until save() writes what
 * changed. Used by the daily page (one Save for the page) and by a layout
 * card with categories placed on Home or in Quick add (a Save per card).
 */

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { findOrCreateTag } from '@/lib/dal/daily';
import {
  emptyDayValues, saveDayValues, setBooleanEntry, setTagEntry, setAggregateAnswer,
} from '@/lib/dal/trackables';
import type { SaveState } from '@/components/ui';
import type { DayValues, PrescriptionDetail } from '@/types/dal';
import type { IconRow, TagRow } from '@/types/schema';
import type { EditedKind, Mode, TrackableActions } from './TrackableInputs';

export function useTrackableValues({ initial, getEntryId, mode, icons, tags: initialTags, prescriptions }: {
  /** The day's saved values (null = nothing saved yet). */
  initial:       DayValues | null;
  /** The day's entry id, creating the entry if needed. */
  getEntryId:    () => Promise<number>;
  mode:          Mode;
  icons:         IconRow[];
  tags:          TagRow[];
  prescriptions: PrescriptionDetail[];
}): { actions: TrackableActions; save: () => Promise<void>; saveState: SaveState } {
  const supabase = createClient();

  // Values as edited, and as last saved (save writes the difference).
  const [values, setValues] = useState<DayValues>(() => initial ?? emptyDayValues());
  const savedRef = useRef<DayValues>(initial ?? emptyDayValues());
  const [tags, setTags] = useState(initialTags);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // ── Values saved with save() ──────────────────────────────────────────────

  const setValue = useCallback(<K extends EditedKind>(kind: K, trackableId: number, value: DayValues[K][number] | undefined) => {
    setValues(prev => {
      const next = { ...prev[kind] } as Record<number, unknown>;
      if (value === undefined) delete next[trackableId]; else next[trackableId] = value;
      return { ...prev, [kind]: next };
    });
  }, []);

  // ── Values saved as soon as they're tapped ────────────────────────────────

  const toggleBoolean = useCallback(async (trackableId: number) => {
    const yes  = !values.boolean.includes(trackableId);
    const flip = (on: boolean) => setValues(prev => ({
      ...prev,
      boolean: on ? [...prev.boolean, trackableId] : prev.boolean.filter(id => id !== trackableId),
    }));
    flip(yes);
    try {
      await setBooleanEntry(supabase, await getEntryId(), trackableId, yes);
    } catch {
      flip(!yes);
    }
  }, [values.boolean, supabase, getEntryId]);

  const setTagOn = useCallback((trackableId: number, tagId: number, on: boolean) =>
    setValues(prev => {
      const current = prev.tags[trackableId] ?? [];
      const next    = on ? [...current.filter(id => id !== tagId), tagId] : current.filter(id => id !== tagId);
      return { ...prev, tags: { ...prev.tags, [trackableId]: next } };
    }), []);

  const toggleTag = useCallback(async (trackableId: number, tagId: number) => {
    const on = !(values.tags[trackableId] ?? []).includes(tagId);
    setTagOn(trackableId, tagId, on);
    try {
      await setTagEntry(supabase, await getEntryId(), trackableId, tagId, on);
    } catch {
      setTagOn(trackableId, tagId, !on);
    }
  }, [values.tags, setTagOn, supabase, getEntryId]);

  const addTag = useCallback(async (trackableId: number, value: string) => {
    const trimmed = value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed) return;

    const tag = await findOrCreateTag(supabase, trimmed);
    // A brand-new tag isn't in the tag list yet; add it so it shows.
    setTags(prev => prev.some(t => t.id === tag.id) ? prev : [...prev, tag]);

    if (!(values.tags[trackableId] ?? []).includes(tag.id)) {
      setTagOn(trackableId, tag.id, true);
      await setTagEntry(supabase, await getEntryId(), trackableId, tag.id, true);
    }
  }, [values.tags, setTagOn, supabase, getEntryId]);

  const answer = useCallback(async (questionId: number, optionId: number | null) => {
    const before = values.aggregate[questionId];
    const put = (id: number | null | undefined) => setValues(prev => {
      const next = { ...prev.aggregate };
      if (id == null) delete next[questionId]; else next[questionId] = id;
      return { ...prev, aggregate: next };
    });
    put(optionId);
    try {
      await setAggregateAnswer(supabase, await getEntryId(), questionId, optionId);
    } catch {
      put(before);
    }
  }, [values.aggregate, supabase, getEntryId]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      await saveDayValues(supabase, await getEntryId(), savedRef.current, values);
      savedRef.current = values;
      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveState('error');
      throw err;
    }
  }, [supabase, getEntryId, values]);

  return {
    actions: { mode, values, icons, tags, prescriptions, setValue, toggleBoolean, toggleTag, addTag, answer },
    save,
    saveState,
  };
}
