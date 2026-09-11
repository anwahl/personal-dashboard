'use client';

import {
    BrainDumpWithEntry, deleteBrainDump,
    getBrainDumps }                             from "@/lib/dal/daily";
import { createClient }                         from "@/lib/supabase/client";
import { useCallback, useEffect, useState }     from "react";
import { Button, Card, CardActions,
    CardBody, CardHeader,CardTitle,
    ExpandPreview, FieldActions, Item,
    Markdown, SubCard }                         from "../ui";
import { formatMediumDate }                     from "@/lib/utils/dates";
import Link                                     from "next/link";
import { BrainDumpForm } from "./BrainDumpForm";

function BrainDumpCard({ dump, onDelete }: Readonly<{ 
    dump: BrainDumpWithEntry; 
    onDelete: (id: number) => void }>) {
    const [confirming, setConfirming] = useState(false);

    const body = dump.body_md ?? '';
    const preview = body.slice(0, 100) + (body.length > 100 ? '…' : '');
    const isLong = body.length > preview.length;

  return (
    <SubCard>
        <CardHeader>
            <CardTitle>
                {formatMediumDate(dump.dump_date)}
                {dump.entry_date && (
                    <Item itemType="meta"
                        value={
                            <Link className='link__generic' href={`/daily/${dump.entry_date}`}>
                                → Entry
                            </Link>
                        }
                    />
                )}
            </CardTitle>
            <CardActions>
                <Button variant="danger" size="sm" onClick={() => {
                    if (confirming) { onDelete(dump.id); setConfirming(false); }
                    else { setConfirming(true); setTimeout(() => setConfirming(false), 3000); }
                }}>
                    {confirming ? 'Sure?' : '✕'}
                </Button>
            </CardActions>
        </CardHeader>
        <CardBody>
            {isLong && (
                <ExpandPreview
                    previewChildren = {
                        <>
                            <Markdown>{preview}</Markdown>
                            <Item itemType="meta" value='Expand to see more...' />
                        </>
                    }
                    hiddenChildren = {
                        <Markdown>{body}</Markdown>
                    }
                />
            )}
            {!isLong && (
                <Markdown>{body}</Markdown>
            )}
      </CardBody>
    </SubCard>
  );
}

export default function BrainDumpList({
  withForm = false }: Readonly<{ withForm?: boolean; }>) {
  const supabase = createClient();
  const [dumps,     setDumps]     = useState<BrainDumpWithEntry[]>([]);
  const [hasMore,   setHasMore]   = useState(false);
  const [page,      setPage]      = useState(0);
  const [ascending, setAscending] = useState(false);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);

  const LIMIT = 15;

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

  const handleSaved = useCallback(() => {
    load(0, ascending, search, true);
    setPage(0);
  }, [ascending, search, load]);


  const handleDelete = useCallback(async (id: number) => {
    await deleteBrainDump(supabase, id);
    setDumps(prev => prev.filter(d => d.id !== id));
  }, [supabase]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, ascending, search, false);
  };

  return (
    <>
    {withForm && (
      <BrainDumpForm onSaved={handleSaved} />
    )}
    <Card>
        <CardHeader>
            <CardTitle>Past Brain Dumps</CardTitle>
        </CardHeader>
        <CardBody>
            <FieldActions>
                <input
                    type="text"
                    placeholder="Search dumps…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <Button variant="ghost" size="sm" onClick={() => setAscending(a => !a)}>
                    {ascending ? '↑ Oldest first' : '↓ Newest first'}
                </Button>
            </FieldActions>

            {loading && dumps.length === 0 && (
                <Item itemType='info' value='Loading…' />
            )}
            {!loading && dumps.length === 0 && (
                <Item itemType='info' value={search ? `No dumps match "${search}".` : 'No brain dumps yet.'} />
            )}
            
            {dumps.map(d => (
                <BrainDumpCard key={d.id} dump={d} onDelete={handleDelete} />
            ))}

            {hasMore && (
                <FieldActions alignment="right">
                    <Button variant="ghost" onClick={loadMore} disabled={loading}>
                        {loading ? 'Loading…' : 'Load more'}
                    </Button>
                </FieldActions>
            )}
        </CardBody>
    </Card>
    </>
  );
}