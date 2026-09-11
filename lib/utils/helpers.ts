import { AppointmentDetail } from "@/types/dal";
import { formatMediumDate } from "./dates";

export function apptLabel(a: AppointmentDetail): string {
  return [
    a.appointment_type?.type_name,
    a.person?.person_name ? `for ${a.person.person_name}` : null,
    `on ${formatMediumDate(a.appointment_date)}`,
    a.provider?.provider_name || a.provider?.practice_name
      ? `with ${a.provider.provider_name ?? a.provider.practice_name}`
      : null,
  ].filter(Boolean).join(' ');
}