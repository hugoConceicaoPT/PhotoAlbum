# Contract: `GET /albums/summaries` and image URL fields

_Date: 2026-11-15 · Status: implemented in `backend/` and covered by tests with mocked models and a mocked URL signer. NOT verified against a real PostgreSQL database, a real Stack Auth project or real Cloudinary. Based on `docs/api/albums-aggregate-proposal.md` (owner approved implementation); where this document differs, this document is final._

Every value marked **ASSUMPTION** is a default chosen by the backend that the owner has not yet confirmed.

## 1. Request

`GET /albums/summaries?limit=<1..100>&cursor=<opaque>`

- Requires `Authorization: Bearer <Stack access token>` (see `auth-contract.md` section 1). The owner is ALWAYS the token user; no user or album id is read from the query, headers or body.
- `limit`: digits only, 1 to 100, default **50** (ASSUMPTION). Anything else (0, 101, negative, decimal, repeated parameter, empty) gives 400 `{ "error": "Invalid limit" }`.
- `cursor`: the `nextCursor` of the previous page, passed back unchanged. Malformed or tampered values give 400 `{ "error": "Invalid cursor" }`. The cursor carries no authority: it only repositions within the caller's own albums.
- Rate limiting: the general per-IP limiter (default 300 per 15 min) applies. No dedicated limiter (ASSUMPTION: one query and no writes per request does not justify one; confirm or ask for a per-user read limiter).

## 2. Response 200

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Verão 2026",
      "createdAt": "2026-09-02T10:15:30.123Z",
      "lastActivityAt": "2026-11-12T18:40:02.654Z",
      "photoCount": 37,
      "coverImages": [
        { "id": "uuid", "url": "https://...", "expiresAt": "2026-11-15T20:00:00.000Z" }
      ]
    }
  ],
  "total": 123,
  "nextCursor": "opaque-string-or-null"
}
```

| Field | Type | Notes |
|---|---|---|
| `items[].id`, `name` | string | Album id and name |
| `items[].createdAt` | ISO 8601 UTC string or null | `Album.created_at` |
| `items[].lastActivityAt` | ISO 8601 UTC string or null | See section 4 (ASSUMPTION). Null only if the album has no timestamps at all |
| `items[].photoCount` | number | All images in all collections of the album. Always present, 0 when empty |
| `items[].coverImages` | array, length 0 to `ALBUM_COVER_IMAGES` | Ordered; **the first element is the main cover**. May be shorter than `photoCount` and may be empty |
| `coverImages[].id` | string (UUID) | Image id (usable as a React key and for `DELETE /images/:id`) |
| `coverImages[].url` | string (absolute URL) | Time-limited read URL. Opaque to the client |
| `coverImages[].expiresAt` | ISO 8601 UTC string | After this time `url` is not guaranteed to work (enforcement depends on the storage provider) |
| `total` | number | Albums owned by the caller, independent of the cursor |
| `nextCursor` | string or null | Null on the last page |

Never returned: `user_id`, `public_id`, stored `image_url`, `collection_id`, storage provider, bucket or key names. The response is an explicit allow-list built in `routes/albumSummaryRoute.ts`, and a test scans the whole JSON for these strings.

Headers: `Cache-Control: private, no-store` (the body contains time-limited URLs).

Errors, always `{ "error": string }`: 400 (limit or cursor), 401 (no or invalid token), 503 (the token key source is unreachable; see section 7), 500 `{ "error": "Failed to fetch album summaries" }` (database failure). A cover whose URL cannot be signed is dropped from `coverImages` and the page still returns 200 with an unchanged `photoCount`.

## 3. Configuration and limits

| Setting | Default | Maximum | Notes |
|---|---|---|---|
| `ALBUM_COVER_IMAGES` | **5** (ASSUMPTION; the proposal said 4, the owner asked for up to 5) | 10 hard ceiling in code | Bounds payload and signing work; values above the ceiling are clamped, invalid values fall back to 5 |
| `limit` | **50** (ASSUMPTION) | 100 | per request |
| URL lifetime | **1 hour** (unchanged from the previous per-image signing) | n/a | ASSUMPTION |

## 4. Definitions (all ASSUMPTIONS to confirm)

- **`lastActivityAt`**: `GREATEST(album.updated_at, album.created_at, MAX(collection.updated_at), MAX(image.created_at))` over the album and its collections and images. It is derived from existing columns, so no schema change is needed. Limitation: deleting an image or collection does not bump any column, so the value does not move on deletion. `Album.updated_at` itself keeps its old meaning and is not exposed.
- **Cover selection**: the newest `ALBUM_COVER_IMAGES` images of the album across all its collections, `ORDER BY created_at DESC, id DESC`; the newest is the main cover. Consequence: the main cover changes when a newer photo is uploaded. Alternative if the owner prefers a stable mosaic: oldest first.
- **Ordering**: `lastActivityAt` descending (null treated as the epoch), then `id` descending.
- **Pagination**: keyset (not offset). The cursor encodes the microsecond-precision sort key and the id; there is no page number. Concurrent uploads can move an album between pages; this is inherent to keyset paging on a changing sort key.
- **Image size**: URLs point to the original upload. Resized renditions or thumbnails are not provided (ASSUMPTION; owner question).

## 5. Query design and indexes

- One statement per page, no per-album queries: `getAlbumSummaries` in `models/albumSummary.ts`. The user is bound once at the root (`Album.user_id = $userId`); collections and images are reached only from those albums, and the total is counted with the same filter. All values, including the cursor, are bound parameters.
- Indexes, created by `createSummaryIndexes()` from `migrations/migrate.ts` with `CREATE INDEX IF NOT EXISTS` (safe to re-run): `album_user_id_idx (Album.user_id)`, `collection_album_id_idx (Collection.album_id)`, `image_collection_created_idx (Image.collection_id, created_at DESC, id DESC)`. **Not run against any database yet.** `migrate.ts` runs automatically only when `NODE_ENV=development`; other environments must run it explicitly (owner decision). Nothing has been measured with `EXPLAIN`; check on a real database.

## 6. Image URL fields: resolving `image_url` vs `signed_url`

Before: `GET /images/collection/:collectionId` returned `{ id, collection_id, image_url, public_id, signed_url }`. The frontend read only `image_url`, which is the stored upload URL of an asset uploaded with `type: "authenticated"`; the signed `signed_url` was never used.

Now (additive, nothing removed):

| Field | Status |
|---|---|
| `url`, `expiresAt` | NEW, provider-neutral, same value and lifetime as the old `signed_url`. **Use these.** |
| `signed_url` | Deprecated alias of `url` (same value) |
| `image_url`, `public_id`, `collection_id` | Deprecated, kept for existing consumers. They name the storage provider; remove after the frontend migrates |

So the contract the frontend should code against everywhere is `{ id, url, expiresAt }`, matching `coverImages[]`. Image responses also now carry `Cache-Control: private, no-store`.

Open check for the owner (cannot be tested without Cloudinary): whether the stored `image_url` of an authenticated asset loads without a signature. If it does, the asset is not actually protected and that is a separate security finding.

## 7. Related changes in the same release (for the frontend)

- `POST /images/upload/:collectionId`: file content is now checked by magic bytes (JPEG, PNG, GIF, WebP); a mismatch gives 400 `{ "error": "Invalid image file" }` and nothing is stored. Existing 400/413 responses are unchanged.
- Any authenticated request can now get 503 `{ "error": ... }` with `Retry-After: 5` when the token key source (JWKS) is unreachable. Treat it as retryable; do NOT sign the user out (401 still means "invalid or expired token").
- `PUT /collections/:id`: `null` for `description`, `beginDate` or `endDate` now clears the field (before, it silently kept the old value). Omitting a field still keeps it; `name: null` is 400.
- Calendar-invalid dates (for example `2026-02-31`) now give 400 instead of 500.
- JSON bodies are no longer parsed before authentication (unauthenticated oversize bodies give 401, not 413); `application/x-www-form-urlencoded` bodies are no longer parsed (no route used them).
- `GET /albums` is unchanged. The deprecated `/albums/user/:userId` and `/collections/user/:userId` routes are still present.

## 8. Compatibility and migration

- Existing consumers keep working: no existing endpoint lost a field. The new endpoint is additive.
- The Frontend Engineer's migration (from `albums-aggregate-proposal.md` section 7): replace the N+1 loader with `GET /albums/summaries`, follow `nextCursor`, map `coverImages[].url`, use `photoCount` and `lastActivityAt`, refetch when the earliest `expiresAt` is near or on an image load error.
- Database: the three indexes above are the only schema change for this feature; `terms_consents` is unrelated (`auth-contract.md` section 7).
