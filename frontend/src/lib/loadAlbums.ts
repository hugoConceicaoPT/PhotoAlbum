import type { AlbumId, AlbumSummary } from "./albums";

/** Data sources, injected so the loader can be tested without the network. */
export interface AlbumSources {
  /** `userId` is optional and unused by the real source: the backend identifies the user from the token. */
  getAlbums(userId?: AlbumId): Promise<{ id?: AlbumId; name: string; created_at?: string }[]>;
  getCollectionIds(albumId: AlbumId): Promise<(number | string | undefined)[]>;
  getImageUrls(collectionId: string): Promise<string[]>;
}

/**
 * Loads albums with their image URLs.
 * - Failure to list albums rejects (the page shows the error state).
 * - Failure for one album's collections/images is tolerated: that album shows no photos
 *   instead of failing the whole page.
 */
export async function loadAlbumSummaries(
  sources: AlbumSources,
  userId?: AlbumId,
): Promise<AlbumSummary[]> {
  const albums = await sources.getAlbums(userId);
  const valid = albums.filter((a): a is { id: AlbumId; name: string; created_at?: string } =>
      typeof a.id === "number" || (typeof a.id === "string" && a.id !== ""));

  const settled = await Promise.allSettled(
    valid.map(async (album) => {
      const collectionIds = await sources.getCollectionIds(album.id);
      const perCollection = await Promise.allSettled(
        collectionIds
          .filter((id): id is number | string => id !== undefined && id !== null)
          .map((id) => sources.getImageUrls(String(id))),
      );
      return perCollection.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    }),
  );

  return valid.map((album, i) => {
    const result = settled[i];
    return {
      id: album.id,
      name: album.name,
      createdAt: album.created_at,
      images: result.status === "fulfilled" ? result.value : [],
    };
  });
}
