import { notFound }           from 'next/navigation';
import { createClient }       from '@/lib/supabase/server';
import { getPersonBySlug, getAllPeople, getPersonPageData } from '@/lib/dal/people';
import { getPeopleCategories } from '@/lib/dal/reference';
import { PeoplePageClient }   from '@/components/people/PeoplePageClient';
import { TabBar }              from '@/components/ui/Controls';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PersonPage({ params }: Readonly<Props>) {
  const { slug }   = await params;
  const supabase   = await createClient();

  const [person, allPeople, peopleCategories] = await Promise.all([
    getPersonBySlug(supabase, slug),
    getAllPeople(supabase),
    getPeopleCategories(supabase),
  ]);

  if (!person) notFound();

  const pageData = await getPersonPageData(supabase, person);

  return (
    <div className="page-content">
      {/* People nav — grouped by category */}
      <nav style={{ marginBottom: 20 }}>
        {peopleCategories.map(cat => {
          const inCat = allPeople.filter(p => p.category_id === cat.id);
          if (!inCat.length) return null;
          return (
            <div key={cat.id} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-faint)', margin: '0 0 6px' }}>
                {cat.category_name}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {inCat.map(p => {
                  const pSlug = p.person_name.toLowerCase();
                  const active = pSlug === slug;
                  return (
                    <a key={p.id} href={`/people/${pSlug}`}
                      className={`badge${active ? ' badge--accent' : ''}`}
                      style={{ textDecoration: 'none', padding: '5px 14px', fontSize: '0.82rem' }}>
                      {p.person_name}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Uncategorized people */}
        {allPeople.filter(p => !p.category_id).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-faint)', margin: '0 0 6px' }}>Other</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {allPeople.filter(p => !p.category_id).map(p => {
                const pSlug = p.person_name.toLowerCase();
                const active = pSlug === slug;
                return (
                  <a key={p.id} href={`/people/${pSlug}`}
                    className={`badge${active ? ' badge--accent' : ''}`}
                    style={{ textDecoration: 'none', padding: '5px 14px', fontSize: '0.82rem' }}>
                    {p.person_name}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <PeoplePageClient data={pageData} peopleCategories={peopleCategories} />
    </div>
  );
}
