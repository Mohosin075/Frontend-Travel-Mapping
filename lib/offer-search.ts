const searchable = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const translated = value as { en?: unknown; es?: unknown };
    return [translated.en, translated.es].filter(v => typeof v === 'string').join(' ');
  }
  return '';
};

/** Supports both legacy plain text and translated offer/location fields. */
export function offerMatchesSearch(offer: any, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [
    offer?.title, offer?.description,
    offer?.place?.name, offer?.place?.address, offer?.place?.country,
    offer?.business?.name, offer?.business?.location?.address,
    offer?.business?.location?.city, offer?.business?.location?.country,
  ].some(value => searchable(value).toLowerCase().includes(term));
}
