// Pure helpers for the Álbuns screen. No React, no network: unit-testable with plain Vitest.

/** Numeric in the legacy API, UUID string in the current backend (docs/api/auth-contract.md). */
export type AlbumId = number | string;

export interface AlbumSummary {
  id: AlbumId;
  name: string;
  /** ISO timestamp (created_at) when the API provides it. */
  createdAt?: string;
  /** Image URLs (image_url from the API) across all collections of the album. */
  images: string[];
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatPhotoCount(count: number): string {
  return pluralize(count, "foto", "fotos");
}

export function formatAlbumCount(count: number): string {
  return pluralize(count, "álbum", "álbuns");
}

/** Desktop: "3 álbuns · ordenados por mais recentes". Compact (mobile): "3 álbuns · mais recentes". */
export function albumsSubtitle(count: number, compact = false): string {
  return `${formatAlbumCount(count)} · ${compact ? "mais recentes" : "ordenados por mais recentes"}`;
}

/** Live-region text for search results: "1 álbum encontrado", "3 álbuns encontrados". */
export function albumsFoundMessage(count: number): string {
  return `${formatAlbumCount(count)} ${count === 1 ? "encontrado" : "encontrados"}`;
}

/** Lower-cases, trims and strips diacritics so "ferias" matches "Férias". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function filterAlbumsByName<T extends { name: string }>(albums: T[], term: string): T[] {
  const needle = normalizeText(term);
  if (needle === "") return albums;
  return albums.filter((album) => normalizeText(album.name).includes(needle));
}

/**
 * "Mais recentes". The API exposes no usable date, so recency is approximated by id
 * (higher id = created later). Returns a new array.
 */
export function sortMostRecent<T extends { id: AlbumId; createdAt?: string }>(albums: T[]): T[] {
  const time = (a: T) => (a.createdAt ? Date.parse(a.createdAt) : NaN);
  return [...albums].sort((a, b) => {
    // Prefer the real creation time when the API provides it (UUID ids carry no order).
    if (!Number.isNaN(time(a)) && !Number.isNaN(time(b))) return time(b) - time(a);
    // Legacy numeric ids: higher id = created later.
    if (typeof a.id === "number" && typeof b.id === "number") return b.id - a.id;
    return 0;
  });
}
