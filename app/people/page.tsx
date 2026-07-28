import { redirect }     from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSelfPerson, personSlug } from '@/lib/dal/people';

export default async function PeoplePage() {
  const supabase = await createClient();
  const self     = await getSelfPerson(supabase);
  redirect(`/people/${personSlug(self?.person_name ?? 'annie')}`);
}
