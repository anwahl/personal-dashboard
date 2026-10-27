'use client';

/**
 * LayoutCard — one card from Settings → Layout, drawn as a card (titled or
 * not) holding its items in order: trackable categories (TrackableInputs)
 * and components (ModuleView).
 *
 * On the daily page, categories use the page's values and its Save button
 * (`pageActions`). Elsewhere (Home, Quick add) the card keeps the context
 * day's values itself: tap-to-save types save on tap, the rest with the
 * card's own Save button.
 */

import type { ReactNode } from 'react';
import {
  Button, Card, CardBody, CardFooter, CardHeader, CardTitle, SaveStatus, SubCard, SubCardBody,
} from '@/components/ui';
import { CategoryTrackables, type TrackableActions } from '@/components/daily-log/TrackableInputs';
import { useTrackableValues } from '@/components/daily-log/useTrackableValues';
import { ModuleView } from './ModuleView';
import { useDay } from './DayContext';
import type { CardDetail, DayValues, TrackableDetail, TrackableRefs } from '@/types/dal';
import type { ModuleData } from '@/lib/dal/modules';

/** A category's active trackables, in the category's order. */
function trackablesOf(refs: TrackableRefs, categoryId: number): TrackableDetail[] {
  const byId = new Map(refs.trackables.filter(t => t.is_active).map(t => [t.id, t]));
  return refs.trackableLinks
    .filter(l => l.category_id === categoryId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .flatMap(l => byId.get(l.trackable_id) ?? []);
}

/** The card's items, drawing categories with `actions`. */
function Items({ card, moduleData, refs, actions, onDone, inSheet }: Readonly<{
  card: CardDetail; moduleData: ModuleData; refs: TrackableRefs | undefined;
  actions: TrackableActions | null; onDone?: (message: string) => void; inSheet?: boolean;
}>) {
  return (
    <>
      {card.items.map(item => {
        if (item.kind === 'module') {
          return (
            <div key={`m${item.placement_id}`} className="layout-card__module">
              <ModuleView module={item.module} data={moduleData} onDone={onDone} inSheet={inSheet} />
            </div>
          );
        }
        const category = refs?.trackableCategories.find(c => c.id === item.category_id);
        if (!refs || !actions || !category?.is_active) return null;
        return (
          <CategoryTrackables key={`c${item.placement_id}`} label={category.category_name}
            trackables={trackablesOf(refs, item.category_id)} a={actions} />
        );
      })}
    </>
  );
}

/** Categories outside the daily page: the card keeps its own values. */
function OwnValues({ refs, values, children }: Readonly<{
  refs:     TrackableRefs;
  values:   DayValues | null;
  children: (actions: TrackableActions, footer: ReactNode) => ReactNode;
}>) {
  const day = useDay();
  const { actions, save, saveState } = useTrackableValues({
    initial: values, getEntryId: day.getEntryId, mode: day.mode,
    icons: refs.icons, tags: refs.tags, prescriptions: refs.prescriptions,
  });
  const footer = (
    <>
      <Button variant="accent" size="sm" onClick={() => save().catch(() => {})} busy={saveState === 'saving'}>Save</Button>
      <SaveStatus state={saveState} />
    </>
  );
  return <>{children(actions, footer)}</>;
}

export function LayoutCard({ card, moduleData, refs, pageActions, onDone, inSheet }: Readonly<{
  card:         CardDetail;
  moduleData:   ModuleData;
  /** What categories draw with (the daily page's reference data, or moduleData.trackables). */
  refs?:        TrackableRefs;
  /** The daily page's values and actions; without them the card keeps its own. */
  pageActions?: TrackableActions;
  onDone?:      (message: string) => void;
  /** In the Quick add sheet: a sub-card. */
  inSheet?:     boolean;
}>) {
  const hasCategories = card.items.some(i => i.kind === 'category');

  const frame = (body: ReactNode, footer?: ReactNode) => inSheet ? (
    <SubCard className="layout-card">
      {card.title && <CardHeader><CardTitle>{card.title}</CardTitle></CardHeader>}
      <SubCardBody>{body}{footer && <CardFooter>{footer}</CardFooter>}</SubCardBody>
    </SubCard>
  ) : (
    <Card className="layout-card">
      {card.title && <CardHeader><CardTitle>{card.title}</CardTitle></CardHeader>}
      <CardBody>{body}</CardBody>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );

  if (hasCategories && !pageActions && refs) {
    return (
      <OwnValues refs={refs} values={moduleData.trackables?.values ?? null}>
        {(actions, footer) => frame(
          <Items card={card} moduleData={moduleData} refs={refs} actions={actions} onDone={onDone} inSheet={inSheet} />,
          footer,
        )}
      </OwnValues>
    );
  }

  return frame(
    <Items card={card} moduleData={moduleData} refs={refs} actions={pageActions ?? null} onDone={onDone} inSheet={inSheet} />,
  );
}
