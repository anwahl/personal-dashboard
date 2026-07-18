'use client';

import { useState, useCallback } from 'react';
import { createClient }     from '@/lib/supabase/client';
import { upsertSymptomEntry, toggleDailySymptomEntry, upsertCrash, deleteCrash, upsertAnxiety, deleteAnxiety } from '@/lib/dal/symptoms';
import { CardSection, CardSectionLabel } from '@/components/ui/Card';
import { SliderField }      from '@/components/ui/SliderField';
import { Chip, ChipGroup }  from '@/components/ui/Chip';
import { Toggle }           from '@/components/ui/Controls';
import { Button }           from '@/components/ui/Button';
import { InputField, SaveStatus } from '@/components/ui/Display';
import type { SaveState }   from '@/components/ui/Display';
import type { SymptomEntryDetail, ReferenceData } from '@/types/dal';
import type { SymptomEntryRow } from '@/types/schema';

type Mode = 'view' | 'input';

interface Props {
  entryId:  number;
  symptoms: SymptomEntryDetail | null;
  reference: ReferenceData;
  mode:     Mode;
}

// ── View ──────────────────────────────────────────────────────────────────────

function SymptomsView({ symptoms, reference }: Omit<Props, 'entryId' | 'mode'>) {
  if (!symptoms) return <p className="empty-state">Symptoms not logged yet.</p>;

  const activeSymptomNames = reference.symptomCategories.flatMap(cat =>
    cat.types.filter(t => symptoms.symptom_entries.some(s => s.symptom_type_id === t.id))
      .map(t => t.symptom_name)
  );

  return (
    <div>
      {[
        { emoji: '🤕', label: 'Pain',       value: symptoms.pain_level },
        { emoji: '🌫️', label: 'Brain Fog',  value: symptoms.brain_fog_level },
        { emoji: '😴', label: 'Fatigue',    value: symptoms.fatigue_level },
      ].map(m => (
        <div key={m.label} className="metric-display">
          <span className="metric-display__emoji">{m.emoji}</span>
          <span className="metric-display__label">{m.label}</span>
          <span className={`metric-display__value${m.value == null ? ' metric-display__value--empty' : ''}`}>
            {m.value ?? '–'}
          </span>
        </div>
      ))}

      {symptoms.crash && (
        <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: '8px 0 0' }}>
          ⚡ Crash{symptoms.crash.severity != null ? ` (${symptoms.crash.severity}/10)` : ''}
          {symptoms.crash.timing ? ` · ${symptoms.crash.timing}` : ''}
        </p>
      )}

      {symptoms.anxiety && (
        <p style={{ fontSize: '0.85rem', color: 'var(--warn)', margin: '6px 0 0' }}>
          😰 Anxiety{symptoms.anxiety.severity != null ? ` (${symptoms.anxiety.severity}/10)` : ''}
        </p>
      )}

      {activeSymptomNames.length > 0 && (
        <CardSection>
          <CardSectionLabel>Symptoms</CardSectionLabel>
          <ChipGroup>
            {activeSymptomNames.map(name => (
              <Chip key={name} active small style={{ cursor: 'default' }}>{name}</Chip>
            ))}
          </ChipGroup>
        </CardSection>
      )}

      {symptoms.flag_for_provider && (
        <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: 8 }}>
          🚩 Flagged for provider
        </p>
      )}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

function SymptomsInput({ entryId, symptoms, reference }: Omit<Props, 'mode'>) {
  const supabase = createClient();

  const [painLevel,      setPainLevel]      = useState<number | null>(symptoms?.pain_level ?? null);
  const [brainFogLevel,  setBrainFogLevel]  = useState<number | null>(symptoms?.brain_fog_level ?? null);
  const [fatigueLevel,   setFatigueLevel]   = useState<number | null>(symptoms?.fatigue_level ?? null);
  const [backgroundNotes,setBackgroundNotes]= useState(symptoms?.background_notes ?? '');
  const [whatHelped,     setWhatHelped]     = useState(symptoms?.what_helped ?? '');
  const [flagProvider,   setFlagProvider]   = useState(symptoms?.flag_for_provider ?? false);

  // Crash
  const [hadCrash,     setHadCrash]     = useState(!!symptoms?.crash);
  const [crashTiming,  setCrashTiming]  = useState(symptoms?.crash?.timing ?? '');
  const [crashSeverity,setCrashSeverity]= useState<number | null>(symptoms?.crash?.severity ?? null);

  // Anxiety
  const [hadAnxiety,     setHadAnxiety]     = useState(!!symptoms?.anxiety);
  const [anxietySeverity,setAnxietySeverity]= useState<number | null>(symptoms?.anxiety?.severity ?? null);
  const [anxietyDetail,  setAnxietyDetail]  = useState(symptoms?.anxiety?.detail ?? '');

  // Which symptom types are active (id list)
  const [symptomTypeIds, setSymptomTypeIds] = useState<number[]>(
    symptoms?.symptom_entries.map(s => s.symptom_type_id) ?? []
  );

  const [saveState, setSaveState] = useState<SaveState>('idle');

  const toggleSymptom = useCallback(async (symptomTypeId: number, symptomEntryId: number) => {
    const nowActive = !symptomTypeIds.includes(symptomTypeId);
    setSymptomTypeIds(prev =>
      nowActive ? [...prev, symptomTypeId] : prev.filter(id => id !== symptomTypeId)
    );
    await toggleDailySymptomEntry(supabase, symptomEntryId, symptomTypeId, nowActive);
  }, [symptomTypeIds, supabase]);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      const fields: Partial<SymptomEntryRow> = {
        pain_level:        painLevel,
        brain_fog_level:   brainFogLevel,
        fatigue_level:     fatigueLevel,
        background_notes:  backgroundNotes || null,
        what_helped:       whatHelped      || null,
        flag_for_provider: flagProvider,
      };

      const symptomRow = await upsertSymptomEntry(supabase, entryId, fields);

      await Promise.all([
        hadCrash
          ? upsertCrash(supabase, entryId, { timing: crashTiming || null, severity: crashSeverity })
          : deleteCrash(supabase, entryId),

        hadAnxiety
          ? upsertAnxiety(supabase, entryId, { severity: anxietySeverity, detail: anxietyDetail || null })
          : deleteAnxiety(supabase, entryId),
      ]);

      setSaveState('ok');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, [supabase, entryId, painLevel, brainFogLevel, fatigueLevel, backgroundNotes, whatHelped, flagProvider, hadCrash, crashTiming, crashSeverity, hadAnxiety, anxietySeverity, anxietyDetail]);

  return (
    <div>
      {/* Core severity sliders */}
      <CardSection>
        <SliderField emoji="🤕" label="Pain Level"  value={painLevel}     min={0} max={10} onChange={setPainLevel} />
        <SliderField emoji="🌫️" label="Brain Fog"   value={brainFogLevel} min={0} max={10} onChange={setBrainFogLevel} />
        <SliderField emoji="😴" label="Fatigue"     value={fatigueLevel}  min={0} max={10} onChange={setFatigueLevel} />
      </CardSection>

      {/* Crash */}
      <CardSection>
        <Toggle label="Crash" checked={hadCrash} onChange={() => setHadCrash(v => !v)} />
        {hadCrash && (
          <div className="conditional-block">
            <SliderField emoji="⚡" label="Severity" value={crashSeverity} min={0} max={10} onChange={setCrashSeverity} />
            <InputField label="Timing" id="crash-timing">
              <input id="crash-timing" type="text" value={crashTiming} onChange={e => setCrashTiming(e.target.value)} placeholder="Morning, afternoon…" />
            </InputField>
          </div>
        )}
      </CardSection>

      {/* Anxiety */}
      <CardSection>
        <Toggle label="Notable anxiety" checked={hadAnxiety} onChange={() => setHadAnxiety(v => !v)} />
        {hadAnxiety && (
          <div className="conditional-block">
            <SliderField emoji="😰" label="Severity" value={anxietySeverity} min={0} max={10} onChange={setAnxietySeverity} />
            <InputField label="Detail" id="anxiety-detail">
              <textarea id="anxiety-detail" value={anxietyDetail} onChange={e => setAnxietyDetail(e.target.value)} placeholder="What triggered it, how it presented…" style={{ minHeight: 60 }} />
            </InputField>
          </div>
        )}
      </CardSection>

      {/* Symptom types per category — fully data-driven */}
      {reference.symptomCategories.map(cat => (
        <CardSection key={cat.id}>
          <CardSectionLabel>{cat.category_name}</CardSectionLabel>
          {cat.types.length === 0 ? (
            <p className="empty-state">No types in this category.</p>
          ) : (
            <ChipGroup>
              {cat.types.map(t => (
                <Chip
                  key={t.id}
                  active={symptomTypeIds.includes(t.id)}
                  onClick={async () => {
                    if (!symptoms) return; // need symptom entry first; will be created on save
                    // For immediate toggle, we need symptom_entry_id
                    // Since we may not have a symptom entry yet, we batch-save instead
                    setSymptomTypeIds(prev =>
                      prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                    );
                  }}
                >
                  {t.symptom_name}
                </Chip>
              ))}
            </ChipGroup>
          )}
        </CardSection>
      ))}

      {/* Notes */}
      <CardSection>
        <CardSectionLabel>Notes</CardSectionLabel>
        <InputField label="Background / context" id="background-notes">
          <textarea id="background-notes" value={backgroundNotes} onChange={e => setBackgroundNotes(e.target.value)} placeholder="What was happening…" />
        </InputField>
        <InputField label="What helped" id="what-helped">
          <textarea id="what-helped" value={whatHelped} onChange={e => setWhatHelped(e.target.value)} placeholder="What helped?" style={{ minHeight: 60 }} />
        </InputField>
      </CardSection>

      {/* Flag */}
      <CardSection>
        <Toggle label="Flag for provider" checked={flagProvider} onChange={() => setFlagProvider(v => !v)} />
      </CardSection>

      <Button variant="accent" full onClick={save} disabled={saveState === 'saving'}>
        {saveState === 'saving' ? 'Saving…' : '💾 Save Symptoms'}
      </Button>
      <SaveStatus state={saveState} />
    </div>
  );
}

// ── Tab export ────────────────────────────────────────────────────────────────

export function SymptomsTab({ mode, ...props }: Props) {
  return mode === 'view'
    ? <SymptomsView symptoms={props.symptoms} reference={props.reference} />
    : <SymptomsInput {...props} />;
}
