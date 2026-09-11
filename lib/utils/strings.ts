



export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function fromSlug(slug: string): string {
  return slug.replaceAll('-', ' ');
}