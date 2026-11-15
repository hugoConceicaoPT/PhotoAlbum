import sql from "../config/db.js";

export interface AlbumSummaryCover {
  id: string;
  /** Stored provider key (today the Cloudinary public_id). Backend-internal: NEVER serialized to clients. */
  objectKey: string;
}

export interface AlbumSummaryRow {
  id: string;
  name: string;
  createdAt: Date | string | null;
  /** Null only when album, collections and images have no timestamps at all. */
  lastActivityAt: Date | string | null;
  photoCount: number;
  /** Microsecond-precision UTC ISO text of the ordering key; used only to build the keyset cursor. */
  sortKey: string;
  /** Newest first, at most `coverLimit` entries. */
  covers: AlbumSummaryCover[];
}

export interface AlbumSummaryPage {
  /** Number of albums the user owns (independent of the cursor). */
  total: number;
  rows: AlbumSummaryRow[];
}

export interface AlbumSummaryQuery {
  /** Number of rows to fetch (the route asks for limit + 1 to detect a next page). */
  limit: number;
  coverLimit: number;
  /** Keyset position: rows strictly after (sortKey, id) in (sortKey DESC, id DESC) order. */
  after?: { sortKey: string; id: string } | undefined;
}

/**
 * One owner-scoped statement for the whole page (no N+1):
 * - the user is applied once at the root (Album.user_id = userId); collections and images are
 *   reached only from those albums;
 * - lastActivityAt = GREATEST(album.updated_at, album.created_at, MAX(collection.updated_at),
 *   MAX(image.created_at)); photoCount = COUNT(images) over all collections of the album;
 * - covers = the newest `coverLimit` images album-wide (created_at DESC, id DESC);
 * - ordering (sort key DESC, id DESC) with keyset pagination;
 * - the outer SELECT always returns at least one row (total is present even for an empty page).
 * Every value is a bound parameter.
 */
export async function getAlbumSummaries(userId: string, q: AlbumSummaryQuery): Promise<AlbumSummaryPage> {
  const afterSortKey = q.after?.sortKey ?? null;
  const afterId = q.after?.id ?? null;

  const raw = (await sql`
    WITH ranked AS (
      SELECT a.id, a.name, a.created_at,
             COALESCE(s.photo_count, 0)::int AS photo_count,
             GREATEST(a.updated_at, a.created_at, s.last_collection_at, s.last_image_at) AS last_activity_at,
             COALESCE(
               GREATEST(a.updated_at, a.created_at, s.last_collection_at, s.last_image_at),
               'epoch'::timestamptz
             ) AS sort_key
      FROM Album a
      LEFT JOIN LATERAL (
        SELECT COUNT(i.id)       AS photo_count,
               MAX(i.created_at) AS last_image_at,
               MAX(c.updated_at) AS last_collection_at
        FROM Collection c
        LEFT JOIN Image i ON i.collection_id = c.id
        WHERE c.album_id = a.id
      ) s ON true
      WHERE a.user_id = ${userId}
    ),
    page AS (
      SELECT *
      FROM ranked
      WHERE ${afterSortKey}::timestamptz IS NULL
         OR (sort_key, id) < (${afterSortKey}::timestamptz, ${afterId}::uuid)
      ORDER BY sort_key DESC, id DESC
      LIMIT ${q.limit}::int
    )
    SELECT (SELECT COUNT(*)::int FROM Album WHERE user_id = ${userId}) AS total,
           p.id, p.name, p.created_at, p.photo_count, p.last_activity_at,
           to_char(p.sort_key AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS sort_key_text,
           cv.covers
    FROM (SELECT 1) one
    LEFT JOIN page p ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object('id', x.id, 'objectKey', x.public_id)
                      ORDER BY x.created_at DESC, x.id DESC) AS covers
      FROM (
        SELECT i.id, i.public_id, i.created_at
        FROM Image i
        JOIN Collection c ON c.id = i.collection_id
        WHERE c.album_id = p.id
        ORDER BY i.created_at DESC, i.id DESC
        LIMIT ${q.coverLimit}::int
      ) x
    ) cv ON p.id IS NOT NULL
    ORDER BY p.sort_key DESC NULLS LAST, p.id DESC;
  `) as Array<Record<string, unknown>>;

  const total = raw.length > 0 ? Number(raw[0]?.total ?? 0) : 0;
  const rows: AlbumSummaryRow[] = [];
  for (const r of raw) {
    if (r.id === null || r.id === undefined) continue; // the "no albums on this page" row
    const covers = typeof r.covers === "string" ? (JSON.parse(r.covers) as unknown) : r.covers;
    rows.push({
      id: String(r.id),
      name: String(r.name),
      createdAt: (r.created_at as Date | string | null) ?? null,
      lastActivityAt: (r.last_activity_at as Date | string | null) ?? null,
      photoCount: Number(r.photo_count ?? 0), // COUNT is cast to int in SQL; Number() guards a string driver result
      sortKey: String(r.sort_key_text),
      covers: Array.isArray(covers) ? (covers as AlbumSummaryCover[]) : [],
    });
  }
  return { total, rows };
}

/**
 * Indexes for the summaries query and the existing owner-scoped lookups. Idempotent.
 * Called from migrations/migrate.ts (NOT executed by the application at runtime).
 */
export async function createSummaryIndexes() {
  await sql`CREATE INDEX IF NOT EXISTS album_user_id_idx ON Album (user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS collection_album_id_idx ON Collection (album_id);`;
  await sql`CREATE INDEX IF NOT EXISTS image_collection_created_idx ON Image (collection_id, created_at DESC, id DESC);`;
  console.log("✅ Indexes for album summaries ready");
}
