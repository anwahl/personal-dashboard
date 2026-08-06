import { redirect } from 'next/navigation';
import { currentWeekStart } from '@/lib/utils/dates';

/** Root /journal/weekly → redirect to the current week's Sunday. */
export default function WeeklyJournalRoot() {
  redirect(`/journal/weekly/${currentWeekStart()}`);
}
