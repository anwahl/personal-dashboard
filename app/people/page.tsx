import { redirect }     from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSelfPerson } from '@/lib/dal/people';

export default async function PeoplePage() {
  const supabase = await createClient();
  const self     = await getSelfPerson(supabase);
  redirect(`/people/${(self?.person_name ?? 'annie').toLowerCase()}`);
}
