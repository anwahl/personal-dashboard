'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button }   from '@/components/ui/Button';
import { TabBar }   from '@/components/ui/Controls';
import { SleepTab } from './SleepTab';
import { SymptomsTab } from './SymptomsTab';
import { MedsTab }  from './MedsTab';
import { EssTab }   from './EssTab';
import type { DailyEntryDetail, SleepEntryDetail, SymptomEntryDetail, EssEntryDetail, PrescriptionDetail, PriorSleepContext, ReferenceData } from '@/types/dal';

type Mode = 'view' | 'input';
type Tab  = 'sleep' | 'symptoms' | 'meds' | 'ess';

const TABS = [
  { id: 'sleep',    label: '💤 Sleep'    },
  { id: 'symptoms', label: '🩺 Symptoms' },
  { id: 'meds',     label: '💊 Meds'     },
  { id: 'ess',      label: '😴 ESS'      },
] as const;

interface Props {
  entry:         DailyEntryDetail;
  sleep:         SleepEntryDetail | null;
  priorSleep:    PriorSleepContext | null;
  symptoms:      SymptomEntryDetail | null;
  ess:           EssEntryDetail | null;
  prescriptions: PrescriptionDetail[];
  reference:     ReferenceData;
  date:          string;
  defaultMode:   Mode;
}

export function HealthLog({
  entry, sleep, priorSleep, symptoms, ess,
  prescriptions, reference, date, defaultMode,
}: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [tab,  setTab]  = useState<Tab>('sleep');

  return (
    <Card>
      <CardHeader>
        <CardTitle>🩺 Health Log</CardTitle>
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
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'sleep' && (
          <SleepTab
            entryId={entry.id}
            date={date}
            sleep={sleep}
            priorSleep={priorSleep}
            reference={reference}
            mode={mode}
          />
        )}

        {tab === 'symptoms' && (
          <SymptomsTab
            entryId={entry.id}
            symptoms={symptoms}
            reference={reference}
            mode={mode}
          />
        )}

        {tab === 'meds' && (
          <MedsTab
            entryId={entry.id}
            prescriptions={prescriptions}
            takenIds={entry.prescription_ids}
          />
        )}

        {tab === 'ess' && (
          <EssTab
            entryId={entry.id}
            ess={ess}
            questionTypes={reference.essQuestionTypes}
            answerTypes={reference.essAnswerTypes}
            mode={mode}
          />
        )}
      </CardBody>
    </Card>
  );
}
