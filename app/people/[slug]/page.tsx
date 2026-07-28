import { notFound }           from 'next/navigation';
import { createClient }       from '@/lib/supabase/server';
import { getPersonBySlug, getAllPeople, getPersonPageData } from '@/lib/dal/people';
import { getPeopleCategories } from '@/lib/dal/reference';
import { PeoplePageClient }   from '@/components/people/PeoplePageClient';

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
      {/* People nav */}
      <nav style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {allPeople.map(p => {
          const pSlug = p.person_name.toLowerCase();
          const active = pSlug === slug;
          return (
            <a
              key={p.id}
              href={`/people/${pSlug}`}
              className={`badge${active ? ' badge--accent' : ''}`}
              style={{ textDecoration: 'none', padding: '5px 14px', fontSize: '0.82rem' }}
            >
              {p.person_name}
            </a>
          );
        })}
      </nav>

      <PeoplePageClient data={pageData} peopleCategories={peopleCategories} />
    </div>
  );
}
