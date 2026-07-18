'use client';

import { useState, useCallback } from 'react';
import { createClient }    from '@/lib/supabase/client';
import { updateDailyEntry, toggleHabitEntry, toggleTagEntry, upsertBrainDump } from '@/lib/dal/daily';
import { Card, CardHeader, CardTitle, CardBody, CardFooter, CardSection, CardSectionLabel } from '@/components/ui/Card';
import { Button }          from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { SliderField }     from '@/components/ui/SliderField';
import { SaveStatus, Field, InputField } from '@/components/ui/Display';
import type { SaveState }  from '@/components/ui/Display';
import type { DailyEntryDetail } from '@/types/dal';
import type { HabitRow, TagRow } from '@/types/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'view' | 'input';

interface Props {
  entry:       DailyEntryDetail;
  date:        string;
  habits:      HabitRow[];
  tags:        TagRow[];
  defaultMode: Mode;
}

// ── View mode ─────────────────────────────────────────────────────────────────

function DailyLogView({
  entry,
  habits,
  tags,
}: Pick<Props, 'entry' | 'habits' | 'tags'>) {
  const completedHabits = habits.filter(h => entry.habit_ids.includes(h.id));
  const activeTags      = tags.filter(t => entry.tag_ids.includes(t.id));

  return (
    <div>
      {/* Mood + Energy */}
      <CardSection>
        <CardSectionLabel>Mood &amp; Energy</CardSectionLabel>
        <div className="metric-display">
          <span className="metric-display__emoji">😊</span>
          <span className="metric-display__label">Mood</span>
          <span className={`metric-display__value${entry.mood == null ? ' metric-display__value--empty' : ''}`}>
            {entry.mood ?? '–'}
          </span>
        </div>
        <div className="metric-display">
          <span className="metric-display__emoji">⚡</span>
          <span className="metric-display__label">Energy</span>
          <span className={`metric-display__value${entry.energy == null ? ' metric-display__value--empty' : ''}`}>
            {entry.energy ?? '–'}
          </span>
        </div>
      </CardSection>

      {/* Summary */}
      {entry.summary && (
        <CardSection>
          <CardSectionLabel>Summary</CardSectionLabel>
          <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: 0 }}>{entry.summary}</p>
        </CardSection>
      )}

      {/* Habits */}
      <CardSection>
        <CardSectionLabel>Habits</CardSectionLabel>
        {habits.length === 0 ? (
          <p className="empty-state">No habits configured.</p>
        ) : (
          <div className="habit-grid">
            {habits.map(h => (
              <div
                key={h.id}
                className={`habit-btn${entry.habit_ids.includes(h.id) ? ' habit-btn--done' : ''}`}
                style={{ cursor: 'default' }}
              >
                <span className="habit-btn__emoji">{h.emoji ?? '•'}</span>
                <span className="habit-btn__label">{h.habit_name}</span>
              </div>
            ))}
          </div>
        )}
      </CardSection>

      {/* Word */}
      <CardSection>
        <div className="summary-row">
          <span className="summary-row__label">Word</span>
          <span className={`summary-row__value${!entry.word ? ' summary-row__value--empty' : ''}`}>
            {entry.word || 'none'}
          </span>
        </div>
        <div className="summary-row">
          <span className="summary-row__label">Emoji</span>
          <span className={`summary-row__value${!entry.daily_emoji ? ' summary-row__value--empty' : ''}`}>
            {entry.daily_emoji || '—'}
          </span>
        </div>
      </CardSection>

      {/* Tags */}
      {activeTags.length > 0 && (
        <CardSection>
          <CardSectionLabel>Tags</CardSectionLabel>
          <ChipGroup>
            {activeTags.map(t => (
              <Chip key={t.id} active small style={{ cursor: 'default' }}>
                {t.tag_value}
              </Chip>
            ))}
          </ChipGroup>
        </CardSection>
      )}

      {/* Brain dump preview */}
      {entry.brain_dump?.body_md && (
        <CardSection>
          <CardSectionLabel>Brain Dump</CardSectionLabel>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
            {entry.brain_dump.body_md.slice(0, 120)}{entry.brain_dump.body_md.length > 120 ? '…' : ''}
          </p>
        </CardSection>
      )}
    </div>
  );
}

// ── Input mode ────────────────────────────────────────────────────────────────

function DailyLogInput({
  entry,
  date,
  habits,
  tags,
  onSaved,
}: Pick<Props, 'entry' | 'date' | 'habits' | 'tags'> & { onSaved: (updates: Partial<DailyEntryDetail>) => void }) {
  const supabase = createClient();

  const [mood,       setMood]       = useState<number | null>(entry.mood);
  const [energy,     setEnergy]     = useState<number | null>(entry.energy);
  const [summary,    setSummary]    = useState(entry.summary ?? '');
  const [word,       setWord]       = useState(entry.word ?? '');
  const [dailyEmoji, setDailyEmoji] = useState(entry.daily_emoji ?? '');
  const [brainDump,  setBrainDump]  = useState(entry.brain_dump?.body_md ?? '');
  const [habitIds,   setHabitIds]   = useState<number[]>(entry.habit_ids);
  const [tagIds,     setTagIds]     = useState<number[]>(entry.tag_ids);
  const [saveState,  setSaveState]  = useState<SaveState>('idle');

  const toggleHabit = useCallback(async (habitId: number) => {
    const nowDone = !habitIds.includes(habitId);
    setHabitIds(prev => nowDone ? [...prev, habitId] : prev.filter(id => id !== habitId));
    await toggleHabitEntry(supabase, entry.id, habitId, nowDone);
  }, [habitIds, supabase, entry.id]);

  const toggleTag = useCallback(async (tagId: number) => {
    const nowActive = !tagIds.includes(tagId);
    setTagIds(prev => nowActive ? [...prev, tagId] : prev.filter(id => id !== tagId));
    await toggleTagEntry(supabase, entry.id, tagId, nowActive);
  }, [tagIds, supabase, entry.id]);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      await Promise.all([
        updateDailyEntry(supabase, entry.id, { mood, energy, summary, word, daily_emoji: dailyEmoji }),
        upsertBrainDump(supabase, entry.id, date, brainDump),
      ]);
      setSaveState('ok');
      onSaved({ mood, energy, summary, word, daily_emoji: dailyEmoji });
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [supabase, entry.id, date, mood, energy, summary, word, dailyEmoji, brainDump, onSaved]);

  return (
    <div>
      {/* Summary */}
      <CardSection>
        <CardSectionLabel>Summary</CardSectionLabel>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="How was your day?"
        />
      </CardSection>

      {/* Mood + Energy */}
      <CardSection>
        <CardSectionLabel>Mood &amp; Energy</CardSectionLabel>
        <SliderField emoji="😊" label="Mood"   value={mood}   min={1} max={10} onChange={setMood} />
        <SliderField emoji="⚡" label="Energy" value={energy} min={1} max={10} onChange={setEnergy} />
      </CardSection>

      {/* Habits */}
      <CardSection>
        <CardSectionLabel>Habits</CardSectionLabel>
        {habits.length === 0 ? (
          <p className="empty-state">No habits configured.</p>
        ) : (
          <div className="habit-grid">
            {habits.map(h => (
              <button
                key={h.id}
                type="button"
                className={`habit-btn${habitIds.includes(h.id) ? ' habit-btn--done' : ''}`}
                onClick={() => toggleHabit(h.id)}
              >
                <span className="habit-btn__emoji">{h.emoji ?? '•'}</span>
                <span className="habit-btn__label">{h.habit_name}</span>
              </button>
            ))}
          </div>
        )}
      </CardSection>

      {/* Word + Emoji */}
      <CardSection>
        <CardSectionLabel>Words</CardSectionLabel>
        <div className="field-grid">
          <InputField label="Intention" id="daily-intention">
            <input
              id="daily-intention"
              type="text"
              value={entry.intention?.value ?? ''}
              readOnly
              style={{ opacity: 0.7, cursor: 'default' }}
            />
          </InputField>
          <InputField label="Emoji" id="daily-emoji">
            <input
              id="daily-emoji"
              type="text"
              value={dailyEmoji}
              onChange={e => setDailyEmoji(e.target.value)}
              placeholder="🌿"
              maxLength={4}
            />
          </InputField>
        </div>
        <InputField label="Word" id="daily-word">
          <input
            id="daily-word"
            type="text"
            value={word}
            onChange={e => setWord(e.target.value)}
            placeholder="one word…"
          />
        </InputField>
      </CardSection>

      {/* Brain Dump */}
      <CardSection>
        <CardSectionLabel>Brain Dump</CardSectionLabel>
        <textarea
          value={brainDump}
          onChange={e => setBrainDump(e.target.value)}
          placeholder="Stream of consciousness…"
          style={{ minHeight: 100 }}
        />
      </CardSection>

      {/* Tags */}
      <CardSection>
        <CardSectionLabel>Tags</CardSectionLabel>
        {tags.length === 0 ? (
          <p className="empty-state">No tags configured.</p>
        ) : (
          <ChipGroup>
            {tags.map(t => (
              <Chip
                key={t.id}
                active={tagIds.includes(t.id)}
                onClick={() => toggleTag(t.id)}
              >
                {t.tag_value}
              </Chip>
            ))}
          </ChipGroup>
        )}
      </CardSection>

      <Button variant="accent" full onClick={save} disabled={saveState === 'saving'}>
        {saveState === 'saving' ? 'Saving…' : '💾 Save'}
      </Button>
      <SaveStatus state={saveState} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DailyLog({ entry, date, habits, tags, defaultMode }: Props) {
  const [mode, setMode]       = useState<Mode>(defaultMode);
  const [localEntry, setLocalEntry] = useState(entry);

  const handleSaved = useCallback((updates: Partial<DailyEntryDetail>) => {
    setLocalEntry(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Daily Log</CardTitle>
        <div className="card__header-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode(m => m === 'view' ? 'input' : 'view')}
          >
            {mode === 'view' ? 'Edit' : 'Done'}
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        {mode === 'view' ? (
          <DailyLogView entry={localEntry} habits={habits} tags={tags} />
        ) : (
          <DailyLogInput
            entry={localEntry}
            date={date}
            habits={habits}
            tags={tags}
            onSaved={handleSaved}
          />
        )}
      </CardBody>
    </Card>
  );
}
