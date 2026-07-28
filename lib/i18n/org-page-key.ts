/** Map org registry slug → messages.org.pages key (slashes/hyphens → underscores). */
export function orgPageMessageKey(slug: string): string {
  return slug.replace(/[/-]/g, "_");
}
