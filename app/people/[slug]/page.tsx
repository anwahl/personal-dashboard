import { notFound }           from 'next/navigation';
import { createClient }       from '@/lib/supabase/server';
import { getPersonBySlug, getAllPeople, getPersonPageData } from '@/lib/dal/people';
import { getPeopleCategories } from '@/lib/dal/reference';
import { PeoplePageClient }   from '@/components/people/PeoplePageClient';
import { PeopleNavTabs }       from '@/components/people/PeopleNavTabs';
import { PageBody } from '@/components/layout';

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
    <PageBody>
      <PeopleNavTabs
        people={allPeople}
        categories={peopleCategories}
        currentSlug={slug}
        initialCategory={person.category_id ?? null}
      />

      <PeoplePageClient data={pageData} peopleCategories={peopleCategories} />
    </PageBody>
  );
}
