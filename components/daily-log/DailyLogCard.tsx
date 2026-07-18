import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody, CardSection, CardSectionLabel } from '@/components/ui/Card';
import { SliderField }     from '@/components/ui/SliderField';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { InputField, Field } from '@/components/ui/Display';
import type { DailyLogState } from './DailyPageClient';
import type { HabitRow, TagRow } from '@/types/schema';

type Mode = 'view' | 'input';

interface Props {
  mode:         Mode;
  state:        DailyLogState;
  setState:     React.Dispatch<React.SetStateAction<DailyLogState>>;
  habits:       HabitRow[];
  habitIds:     number[];
  toggleHabit:  (id: number) => void;
  tags:         TagRow[];
  tagIds:       number[];
  toggleTag:    (id: number) => void;
  addNewTag:    (value: string) => Promise<void>;
}

// ── View mode ─────────────────────────────────────────────────────────────────

function DailyLogView({ state, habits, habitIds, tags, tagIds }: Omit<Props, 'mode' | 'setState' | 'toggleHabit' | 'toggleTag' | 'addNewTag'>) {
  const activeTags = tags.filter(t => tagIds.includes(t.id));

  return (
    <div>
      <CardSection>
        <div className="metric-display">
          <span className="metric-display__emoji">😊</span>
          <span className="metric-display__label">Mood</span>
          <span className={`metric-display__value${state.mood == null ? ' metric-display__value--empty' : ''}`}>
            {state.mood ?? '–'}
          </span>
        </div>
        <div className="metric-display">
          <span className="metric-display__emoji">⚡</span>
          <span className="metric-display__label">Energy</span>
          <span className={`metric-display__value${state.energy == null ? ' metric-display__value--empty' : ''}`}>
            {state.energy ?? '–'}
          </span>
        </div>
      </CardSection>

      {state.summary && (
        <CardSection>
          <CardSectionLabel>Summary</CardSectionLabel>
          <p style={{ fontSize: '0.9rem', color: 'var(--text)', margin: 0 }}>{state.summary}</p>
        </CardSection>
      )}

      <CardSection>
        <CardSectionLabel>Habits</CardSectionLabel>
        <div className="habit-grid">
          {habits.map(h => (
            <div key={h.id} className={`habit-btn${habitIds.includes(h.id) ? ' habit-btn--done' : ''}`} style={{ cursor: 'default' }}>
              <span className="habit-btn__emoji">{h.emoji ?? '•'}</span>
              <span className="habit-btn__label">{h.habit_name}</span>
            </div>
          ))}
        </div>
      </CardSection>

      {(state.word || state.dailyEmoji) && (
        <CardSection>
          <div className="summary-row">
            <span className="summary-row__label">Word</span>
            <span className={`summary-row__value${!state.word ? ' summary-row__value--empty' : ''}`}>{state.word || '—'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-row__label">Emoji</span>
            <span className={`summary-row__value${!state.dailyEmoji ? ' summary-row__value--empty' : ''}`}>{state.dailyEmoji || '—'}</span>
          </div>
        </CardSection>
      )}

      {activeTags.length > 0 && (
        <CardSection>
          <CardSectionLabel>Tags</CardSectionLabel>
          <ChipGroup>
            {activeTags.map(t => <Chip key={t.id} active small style={{ cursor: 'default' }}>{t.tag_value}</Chip>)}
          </ChipGroup>
        </CardSection>
      )}

      {state.brainDump && (
        <CardSection>
          <CardSectionLabel>Brain Dump</CardSectionLabel>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
            {state.brainDump.slice(0, 160)}{state.brainDump.length > 160 ? '…' : ''}
          </p>
        </CardSection>
      )}
    </div>
  );
}

// ── Input mode ────────────────────────────────────────────────────────────────

function DailyLogInput({ state, setState, habits, habitIds, toggleHabit, tags, tagIds, toggleTag, addNewTag }: Omit<Props, 'mode'>) {
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [addingTag, setAddingTag] = useState(false);

  const set = <K extends keyof DailyLogState>(key: K, val: DailyLogState[K]) =>
    setState(prev => ({ ...prev, [key]: val }));

  const submitCustomTag = async () => {
    if (!customTagInput.trim()) return;
    setAddingTag(true);
    await addNewTag(customTagInput);
    setCustomTagInput('');
    setShowCustomInput(false);
    setAddingTag(false);
  };

  return (
    <div>
      <CardSection>
        <CardSectionLabel>Summary</CardSectionLabel>
        <textarea
          value={state.summary}
          onChange={e => set('summary', e.target.value)}
          placeholder="How was your day?"
        />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Mood &amp; Energy</CardSectionLabel>
        <SliderField emoji="😊" label="Mood"   value={state.mood}   min={1} max={10} onChange={v => set('mood', v)} />
        <SliderField emoji="⚡" label="Energy" value={state.energy} min={1} max={10} onChange={v => set('energy', v)} />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Habits</CardSectionLabel>
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
      </CardSection>

      <CardSection>
        <CardSectionLabel>Words</CardSectionLabel>
        <div className="field-grid">
          <InputField label="Word" id="daily-word">
            <input id="daily-word" type="text" value={state.word} onChange={e => set('word', e.target.value)} placeholder="one word…" />
          </InputField>
          <InputField label="Emoji" id="daily-emoji">
            <input id="daily-emoji" type="text" value={state.dailyEmoji} onChange={e => set('dailyEmoji', e.target.value)} placeholder="🌿" maxLength={4} />
          </InputField>
        </div>
      </CardSection>

      <CardSection>
        <CardSectionLabel>Brain Dump</CardSectionLabel>
        <textarea
          value={state.brainDump}
          onChange={e => set('brainDump', e.target.value)}
          placeholder="Stream of consciousness…"
          style={{ minHeight: 100 }}
        />
      </CardSection>

      <CardSection>
        <CardSectionLabel>Tags</CardSectionLabel>
        <ChipGroup>
          {tags.map(t => (
            <Chip key={t.id} active={tagIds.includes(t.id)} onClick={() => toggleTag(t.id)}>
              {t.tag_value}
            </Chip>
          ))}

          {/* Custom tag */}
          {showCustomInput ? (
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <input
                type="text"
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitCustomTag(); if (e.key === 'Escape') { setShowCustomInput(false); setCustomTagInput(''); }}}
                placeholder="new tag…"
                autoFocus
                autoCapitalize="off"
                style={{ width: 110, padding: '6px 10px', borderRadius: 20, fontSize: '0.8rem' }}
                disabled={addingTag}
              />
              <Chip small onClick={submitCustomTag} disabled={addingTag || !customTagInput.trim()}>
                {addingTag ? '…' : '✓'}
              </Chip>
              <Chip small onClick={() => { setShowCustomInput(false); setCustomTagInput(''); }}>✕</Chip>
            </span>
          ) : (
            <Chip small onClick={() => setShowCustomInput(true)}>+ Custom</Chip>
          )}
        </ChipGroup>
      </CardSection>
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

export function DailyLogCard(props: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📝 Daily Log</CardTitle>
      </CardHeader>
      <CardBody>
        {props.mode === 'view'
          ? <DailyLogView {...props} />
          : <DailyLogInput {...props} />
        }
      </CardBody>
    </Card>
  );
}
