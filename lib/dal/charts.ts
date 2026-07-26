import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChartDefinitionRow,
  ChartTrackableLinkRow,
} from '@/types/schema';
import type { ChartType, MetricRole } from '@/types/schema';

type Client = SupabaseClient;

// ── Active toggle ─────────────────────────────────────────────────────────────

export async function toggleChartActive(
  client:   Client,
  chartId:  number,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from('chart_definitions')
    .update({ is_active: isActive })
    .eq('id', chartId);
  if (error) throw new Error(`toggleChartActive: ${error.message}`);
}

// ── Category assignment ───────────────────────────────────────────────────────

export async function setChartCategory(
  client:     Client,
  chartId:    number,
  categoryId: number | null,
): Promise<void> {
  const { error } = await client
    .from('chart_definitions')
    .update({ category_id: categoryId })
    .eq('id', chartId);
  if (error) throw new Error(`setChartCategory: ${error.message}`);
}

// ── Trackable links ───────────────────────────────────────────────────────────

export async function addChartLink(
  client:      Client,
  chartId:     number,
  trackableId: number,
  role:        MetricRole,
  sortOrder:   number,
): Promise<ChartTrackableLinkRow> {
  const { data, error } = await client
    .from('chart_trackable_links')
    .insert({ chart_id: chartId, trackable_id: trackableId, metric_role: role, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw new Error(`addChartLink: ${error.message}`);
  return data as ChartTrackableLinkRow;
}

export async function removeChartLink(client: Client, linkId: number): Promise<void> {
  const { error } = await client
    .from('chart_trackable_links')
    .delete()
    .eq('id', linkId);
  if (error) throw new Error(`removeChartLink: ${error.message}`);
}

// ── Create / delete ───────────────────────────────────────────────────────────

export interface CreateChartPayload {
  title:      string;
  chart_type: ChartType;
  sort_order: number;
  category_id: number | null;
}

export async function createChartDefinition(
  client:  Client,
  payload: CreateChartPayload,
): Promise<ChartDefinitionRow> {
  const { data, error } = await client
    .from('chart_definitions')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`createChartDefinition: ${error.message}`);
  return data as ChartDefinitionRow;
}

export async function deleteChartDefinition(client: Client, chartId: number): Promise<void> {
  const { error } = await client
    .from('chart_definitions')
    .delete()
    .eq('id', chartId);
  if (error) throw new Error(`deleteChartDefinition: ${error.message}`);
}

// ── Sort order ────────────────────────────────────────────────────────────────

export async function updateChartSortOrders(
  client:  Client,
  updates: Array<{ id: number; sort_order: number }>,
): Promise<void> {
  await Promise.all(
    updates.map(u =>
      client
        .from('chart_definitions')
        .update({ sort_order: u.sort_order })
        .eq('id', u.id),
    ),
  );
}
