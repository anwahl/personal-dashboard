'use client';

/**
 * /brain-dump — Landing page for all brain dumps.
 *
 * - Paginated list (20/page), date-desc by default
 * - Toggle date asc/desc
 * - Search by content (client-side filter on loaded page, server-side via URL for deep searches)
 * - Quick-add at the top
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient }                     from '@/lib/supabase/client';
import { getBrainDumps, deleteBrainDump }   from '@/lib/dal/daily';
import { BrainDumpQuickAdd }                from '@/components/brain-dump/BrainDumpQuickAdd';
import { Button, Markdown }                 from '@/components/ui';
import type { BrainDumpWithEntry }          from '@/lib/dal/daily';

function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function BrainDumpCard({ dump, onDelete }: Readonly<{ 
    dump: BrainDumpWithEntry; 
    onDelete: (id: number) => void }>) {
  const [expanded,   setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  const body = dump.body_md ?? '';
  const preview = body.slice(0, 200) + (body.length > 200 ? '…' : '');

  return (
    <div className="brain-dump-card">
      <div className="brain-dump-card__header">
        <div className="brain-dump-card__date">{fmtDate(dump.dump_date)}</div>
        {dump.entry_date && dump.entry_date !== dump.dump_date && (
          <a href={`/daily/${dump.entry_date}`} className="brain-dump-card__entry-link">
            → {dump.entry_date}
          </a>
        )}
        <div className="brain-dump-card__actions">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => {
            if (confirming) { onDelete(dump.id); setConfirming(false); }
            else { setConfirming(true); setTimeout(() => setConfirming(false), 3000); }
          }}>
            {confirming ? 'Sure?' : '✕'}
          </Button>
        </div>
      </div>
      <div className="brain-dump-card__body">
        {expanded ? <Markdown>{body}</Markdown> : <p className="brain-dump-card__preview">{preview}</p>}
      </div>
    </div>
  );
}

export default function BrainDumpPage() {
  const supabase = createClient();
  const [dumps,     setDumps]     = useState<BrainDumpWithEntry[]>([]);
  const [hasMore,   setHasMore]   = useState(false);
  const [page,      setPage]      = useState(0);
  const [ascending, setAscending] = useState(false);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);

  const LIMIT = 20;

  const load = useCallback(async (pg: number, asc: boolean, q: string, replace: boolean) => {
    setLoading(true);
    try {
      const result = await getBrainDumps(supabase, {
        limit: LIMIT, offset: pg * LIMIT, ascending: asc, search: q,
      });
      setDumps(prev => replace ? result.dumps : [...prev, ...result.dumps]);
      setHasMore(result.hasMore);
    } finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    setPage(0);
    load(0, ascending, search, true);
  }, [ascending, search]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteBrainDump(supabase, id);
    setDumps(prev => prev.filter(d => d.id !== id));
  }, [supabase]);

  const handleSaved = useCallback((bodyMd: string, date: string) => {
    // Reload to show newly added dump
    load(0, ascending, search, true);
    setPage(0);
  }, [ascending, search, load]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, ascending, search, false);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-header__title">🧠 Brain Dump</h1>
      </div>

      {/* Quick add */}
      <div className="brain-dump-page__quickadd">
        <BrainDumpQuickAdd onSaved={handleSaved} />
      </div>

      {/* Controls */}
      <div className="brain-dump-page__controls">
        <input
          type="text"
          className="brain-dump-page__search"
          placeholder="Search dumps…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Button variant="ghost" size="sm" onClick={() => setAscending(a => !a)}>
          {ascending ? '↑ Oldest first' : '↓ Newest first'}
        </Button>
      </div>

      {/* List */}
      {loading && dumps.length === 0 && (
        <p className="empty-state">Loading…</p>
      )}
      {!loading && dumps.length === 0 && (
        <p className="empty-state">{search ? `No dumps match "${search}".` : 'No brain dumps yet.'}</p>
      )}

      <div className="brain-dump-list">
        {dumps.map(d => (
          <BrainDumpCard key={d.id} dump={d} onDelete={handleDelete} />
        ))}
      </div>

      {hasMore && (
        <div className="brain-dump-page__more">
          <Button variant="ghost" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
