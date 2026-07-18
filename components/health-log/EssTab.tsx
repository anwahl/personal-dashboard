'use client';

import { useState, useCallback } from 'react';
import { createClient }   from '@/lib/supabase/client';
import { setEssResponse } from '@/lib/dal/ess';
import { CardSection }    from '@/components/ui/Card';
import type { EssEntryDetail } from '@/types/dal';
import type { EssQuestionTypeRow, EssAnswerTypeRow } from '@/types/schema';

type Mode = 'view' | 'input';

interface Props {
  entryId:       number;
  ess:           EssEntryDetail | null;
  questionTypes: EssQuestionTypeRow[];
  answerTypes:   EssAnswerTypeRow[];
  mode:          Mode;
}

function essInterpretation(total: number, answerTypes: EssAnswerTypeRow[]): { label: string; color: string } {
  if (total <= 10) return { label: 'Normal range',         color: 'var(--success)' };
  if (total <= 15) return { label: 'Mild sleepiness',      color: 'var(--warn)' };
  if (total <= 20) return { label: 'Moderate sleepiness',  color: 'var(--danger)' };
  return              { label: 'Severe sleepiness',        color: 'var(--danger)' };
}

// ── View ──────────────────────────────────────────────────────────────────────

function EssView({ ess, answerTypes }: Pick<Props, 'ess' | 'answerTypes'>) {
  if (!ess || ess.responses.length === 0) {
    return <p className="empty-state">ESS not completed yet.</p>;
  }

  const maxScore = answerTypes.reduce((sum, a) => sum + a.answer_value, 0);
  const { label, color } = essInterpretation(ess.total, answerTypes);

  return (
    <div className="ess-score">
      <div className="ess-score__number" style={{ color }}>{ess.total}</div>
      <div className="ess-score__label">{label} · out of {maxScore}</div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

function EssInput({ entryId, ess, questionTypes, answerTypes }: Omit<Props, 'mode'>) {
  const supabase = createClient();

  // Map: question_type_id → answer_type_id
  const initialResponses: Record<number, number> = {};
  ess?.responses.forEach(r => { initialResponses[r.question_type_id] = r.answer_type_id; });
  const [responses, setResponses] = useState<Record<number, number>>(initialResponses);
  const [saving,    setSaving]    = useState<Set<number>>(new Set()); // question ids being saved

  const selectAnswer = useCallback(async (questionTypeId: number, answerTypeId: number) => {
    if (saving.has(questionTypeId)) return;

    setResponses(prev => ({ ...prev, [questionTypeId]: answerTypeId }));
    setSaving(prev => new Set(prev).add(questionTypeId));

    try {
      await setEssResponse(supabase, entryId, questionTypeId, answerTypeId);
    } catch {
      // Revert on failure
      setResponses(prev => {
        const next = { ...prev };
        if (ess?.responses.find(r => r.question_type_id === questionTypeId)) {
          const prior = ess.responses.find(r => r.question_type_id === questionTypeId)!;
          next[questionTypeId] = prior.answer_type_id;
        } else {
          delete next[questionTypeId];
        }
        return next;
      });
    } finally {
      setSaving(prev => { const next = new Set(prev); next.delete(questionTypeId); return next; });
    }
  }, [supabase, entryId, ess, saving]);

  // Compute live total
  const liveTotal = Object.entries(responses).reduce((sum, [qId, aId]) => {
    const answer = answerTypes.find(a => a.id === aId);
    return sum + (answer?.answer_value ?? 0);
  }, 0);

  const maxScore = questionTypes.length * Math.max(...answerTypes.map(a => a.answer_value), 0);
  const { label, color } = essInterpretation(liveTotal, answerTypes);

  // Sort answer types by value for display
  const sortedAnswers = [...answerTypes].sort((a, b) => a.answer_value - b.answer_value);

  return (
    <div>
      {/* Live score */}
      <div className="ess-score">
        <div className="ess-score__number" style={{ color }}>{liveTotal}</div>
        <div className="ess-score__label">
          {label} · {Object.keys(responses).length}/{questionTypes.length} answered
        </div>
      </div>

      {/* Questions — fully data-driven */}
      {questionTypes.map(q => {
        const selectedAnswerId = responses[q.id];
        const answered = selectedAnswerId != null;

        return (
          <div
            key={q.id}
            className={`ess-question${answered ? ' ess-question--answered' : ''}`}
          >
            <p className="ess-question__text">{q.question_label}</p>
            <div className="ess-answer-grid">
              {sortedAnswers.map(a => (
                <button
                  key={a.id}
                  type="button"
                  className={`ess-answer${selectedAnswerId === a.id ? ' ess-answer--selected' : ''}`}
                  onClick={() => selectAnswer(q.id, a.id)}
                  disabled={saving.has(q.id)}
                >
                  <span className="ess-answer__value">{a.answer_value}</span>
                  <span className="ess-answer__label">{a.answer_label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 12, textAlign: 'center' }}>
        Answers save automatically on selection.
      </p>
    </div>
  );
}

// ── Tab export ────────────────────────────────────────────────────────────────

export function EssTab({ mode, ...props }: Props) {
  return mode === 'view'
    ? <EssView ess={props.ess} answerTypes={props.answerTypes} />
    : <EssInput {...props} />;
}
