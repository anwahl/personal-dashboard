import { redirect }        from 'next/navigation';
import { createClient }    from '@/lib/supabase/server';

export default async function PeoplePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('people')
    .select('person_name')
    .eq('is_self', true)
    .maybeSingle();

  redirect(`/people/${(data?.person_name ?? 'annie').toLowerCase()}`);
}
