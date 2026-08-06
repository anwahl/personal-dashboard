/** Strip XML declaration and DOCTYPE so the string is safe for innerHTML. */
export function cleanSvg(raw: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .trim();
}