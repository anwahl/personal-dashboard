import { redirect }     from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSelfPerson } from '@/lib/dal/people';
import { toSlug } from '@/lib/utils/strings';

export default async function PeoplePage() {
  const supabase = await createClient();
  const self     = await getSelfPerson(supabase);
  redirect(`/people/${toSlug(self?.person_name ?? 'annie')}`);
}
