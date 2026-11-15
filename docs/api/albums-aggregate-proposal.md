# Proposal: aggregate albums endpoint for the Álbuns page

**PROPOSAL. NOT IMPLEMENTED. AWAITING OWNER APPROVAL.** No code, test, schema, index or frontend file has been changed. Nothing here is a contract until the owner approves it and it is added to `docs/api/auth-contract.md`.

_Date: 2026-11-15 · Author: Backend Engineer · Audience: project owner, Orchestrator, Frontend Engineer, Security Engineer._

Evidence labels used below:
- **CONFIRMED** = read directly in the code (file:line, working tree of 2026-11-15).
- **REASONED** = derived from the code and general PostgreSQL / driver knowledge. Not measured.
- **UNVERIFIED** = depends on something that cannot be checked here (real database, Cloudinary, OCI, a real token).

Not measured: no database was available, so **no `EXPLAIN`, no timing and no payload measurement was run**. Every performance statement in this document is REASONED, not a measurement.

---

## 1. Current behavior and cost

### 1.1 Request chain (CONFIRMED)

`frontend/src/pages/Album.tsx:28-35` wires three sources into `loadAlbumSummaries` (`frontend/src/lib/loadAlbums.ts:82-111`):

| Step | Frontend call | Backend handler | DB statements (each is one `sql` tagged call) |
|---|---|---|---|
| 1 | `GET /albums` (`Album.ts:166-168`) | `albumRoute.ts:10-19` -> `models/album.ts:32-38` (`SELECT * FROM Album WHERE user_id = $1`) | 1 |
| 2, once per album | `GET /collections/album/:id` (`Collection.ts:259-274`) | `collectionRoute.ts:41-53`: `isAlbumOwnedBy` (`:47`) then `getCollectionsByAlbumId` (`:48`) | 2 |
| 3, once per collection | `GET /images/collection/:id` (`Image.ts:392-408`) | `imageRoute.ts:32-56`: `getCollectionById` (`:37`) then `getImagesByCollectionId` (`:40`), then one local signing call per image (`:42-49`) | 2 |

Steps 2 and 3 run in parallel inside their step (`Promise.allSettled`, `loadAlbums.ts:90-100`), but step 3 cannot start before step 2 returns, and step 2 cannot start before step 1 returns. Minimum latency is therefore 3 sequential round trips, however many albums there are.

With A albums and C collections in total:

- HTTP requests = 1 + A + C (plus `GET /me/consent`, which is a separate gate).
- DB statements = 1 + 2A + 2C.
- Every request also runs `authFailureLimiter` + `requireAuth` (JWT verification, `app.ts:37-43`).

Example, 3 albums with 1 collection each: 7 requests (as the owner observed) and 13 DB statements. `neon()` from `@neondatabase/serverless` is the DB client (`config/db.ts:7`); in its HTTP mode each tagged-template call is its own HTTP round trip to the database (REASONED from the driver's documented behavior; not measured here).

### 1.2 Rate-limit exposure (CONFIRMED arithmetic)

`generalLimiter` allows 300 requests per 15 minutes per IP by default (`config/env.ts:42`; applied to everything at `app.ts:26`). The N+1 page load costs 1 + A + C requests. With 50 albums and 100 collections that is 151 requests per page load: a second visit within 15 minutes can hit 429. With the aggregate endpoint a load costs 1 request (plus pagination follow-ups).

### 1.3 Data the design needs vs. what exists today

The design (`assets/Álbuns – proposed.png`, `assets/Mobile · Álbuns.png`) shows per album: a 2x2 mosaic (up to 4 images), the name, "N fotos" and "atualizado a <date>".

- Photo count: the frontend derives it as `album.images.length` (`AlbumCard.tsx:482`), which requires downloading and signing every image of every collection just to count them. CONFIRMED.
- Mosaic: `AlbumCard.tsx:463` takes the first 4 of `album.images`; the other images were fetched for nothing. CONFIRMED.
- "Updated" date: not available. `Album.updated_at` is set only by `updateAlbum` on rename (`models/album.ts:43`). `Collection.updated_at` is set by `updateCollection` (`models/collection.ts:89`); `Image` has only `created_at` (`models/image.ts:18`). CONFIRMED. The card omits the date (`AlbumCard.tsx:481`).
- Ordering: "mais recentes" is computed on the client from `createdAt` (`albums.ts:56-65`), but the design's sample dates (12 nov, 3 out, 20 set) are consistent with sorting by an updated/activity date. REASONED from the screenshot; owner to confirm (section 9).

### 1.4 Existing indexes (CONFIRMED from the DDL)

`models/album.ts:11-18`, `models/collection.ts:14-23` and `models/image.ts:13-19` define only primary keys. PostgreSQL does not index foreign key columns automatically, so there is **no index on `album.user_id`, `collection.album_id` or `image.collection_id`**. Whether the owner created indexes by hand in Neon is UNVERIFIED (only the repository DDL was inspected). `migrations/migrate.ts` is a list of `CREATE TABLE IF NOT EXISTS` calls; there is no versioned migration framework.

---

## 2. Options

| | A. Extend `GET /albums` (`?include=summary`, or always-on additive fields) | **B. New `GET /albums/summaries`, `GET /albums` unchanged (recommended)** | C. Keep N+1, add batch endpoints |
|---|---|---|---|
| Requests per page load | 1 | 1 (plus cursor follow-ups) | 3 (albums, batched collections, batched images) or 2 if folded together |
| Backward compatibility | Always-on: payload of every existing caller grows and signing cost is paid by callers that do not need images. `?include`: safe, but one handler with two very different cost profiles | Old clients and the deprecated `/albums/user/:userId` (`albumRoute.ts:22-27`) are untouched | Existing endpoints untouched; new batch routes are additive |
| Payload | Raw album rows (`SELECT *`, includes `user_id`) plus summary fields: mixes row passthrough with a DTO | Purpose-built DTO, no `user_id`, no storage-provider fields | Large: all images of the batch, each signed, unless covers are limited, which a generic batch image endpoint should not do |
| Caching | `Cache-Control` has to differ by query string on one route (signed URLs expire; plain rows do not) | Own route, own `Cache-Control: private, no-store`-style policy (section 4.4) | Image batch is signed and short-lived; collection batch is cacheable. Mixed |
| API consistency | Overloads a resource that is currently a plain collection read; `include` has no precedent in this API | One more read route next to `GET /albums`; consistent with `/me/consent` style DTOs | Adds two list endpoints with id-list query parameters (`?albumIds=a,b,c`), which need validation and limits |
| Count and "updated" date | Possible | Possible | Not possible without extra aggregation anyway |
| Cost of being wrong | Hard to undo (changes a shared route) | Easy to remove or rename | Medium |

**Recommendation: Option B.** It is the only option that gives the page everything in one request without changing a route other consumers use, and it lets the response carry a neutral image `url` instead of provider fields (section 4). Option A with `?include=summary` is acceptable if the owner prefers fewer routes; the response shape in section 3 would then be returned as an `items`-style envelope only when the parameter is present, which is the awkward part (the same URL returns two shapes). Option C is not recommended: it still needs 3 sequential requests and does not provide the count or the date.

The route name `summaries` is a placeholder; the owner may prefer another (for example `GET /albums?view=summary`).

---

## 3. Recommended response shape (PROPOSAL)

### 3.1 Request

```
GET /albums/summaries?limit=<int 1..100, default 50>&cursor=<opaque string, optional>
Authorization: Bearer <Stack Auth access token>
```

No user id, album id or other identifier is accepted. Unknown query parameters are ignored.

### 3.2 Response 200

```json
{
  "items": [
    {
      "id": "4f0c2c0e-6b1b-4b64-9d5e-0a6e9d6c1a11",
      "name": "Férias",
      "createdAt": "2026-09-02T10:15:30.123456Z",
      "lastActivityAt": "2026-11-12T18:40:02.654321Z",
      "photoCount": 24,
      "coverImages": [
        { "id": "a1b2c3d4-0000-4000-8000-000000000001", "url": "https://...", "expiresAt": "2026-11-15T20:00:00.000Z" },
        { "id": "a1b2c3d4-0000-4000-8000-000000000002", "url": "https://...", "expiresAt": "2026-11-15T20:00:00.000Z" }
      ]
    }
  ],
  "total": 3,
  "nextCursor": null
}
```

### 3.3 Field list

| Field | Type | Nullable | Derivation (exact) |
|---|---|---|---|
| `items` | array of album summaries | no (may be `[]`) | Page of the caller's albums, ordered as in 5.3 |
| `items[].id` | string (UUID) | no | `album.id` |
| `items[].name` | string | no | `album.name` |
| `items[].createdAt` | string, ISO 8601 UTC | **yes** | `album.created_at`. The column is `DEFAULT NOW()` but not `NOT NULL` (`models/album.ts:15`), so legacy rows may be null |
| `items[].lastActivityAt` | string, ISO 8601 UTC | **yes** | `GREATEST(album.updated_at, album.created_at, MAX(collection.updated_at), MAX(image.created_at))` over this album's collections and images. `GREATEST` ignores NULL arguments in PostgreSQL, so it is null only if every input is null |
| `items[].photoCount` | integer >= 0 | no | `COUNT(image.id)` over all images of all collections of the album; `0` when there are no collections or images |
| `items[].coverImages` | array, 0 to 4 elements | no (may be `[]`) | The 4 most recent images of the album (`ORDER BY image.created_at DESC, image.id DESC LIMIT 4`), across all its collections |
| `coverImages[].id` | string (UUID) | no | `image.id` (useful as a React key; also the id for the existing `DELETE /images/:id`) |
| `coverImages[].url` | string (absolute URL) | no | Time-limited read URL produced by the storage service (section 4). Opaque to the client |
| `coverImages[].expiresAt` | string, ISO 8601 UTC | no | Time after which `url` is not guaranteed to work (section 4.3) |
| `total` | integer >= 0 | no | Number of albums the caller owns (independent of the cursor). The UI subtitle "3 álbuns" needs it |
| `nextCursor` | string | **yes** | Opaque cursor for the next page; `null` on the last page |

Fields deliberately **not** returned: `user_id`, `updated_at` (see 3.5), `public_id`, `image_url` (stored provider URL), `collection_id`, any storage provider name, bucket, region or key.

### 3.4 Naming and casing

Existing responses are mixed (CONFIRMED): album and image rows are snake_case database passthrough (`user_id`, `created_at`, `image_url`, `public_id`; `models/album.ts:3-7`, `models/image.ts:3-8`, `SELECT *`), while the newer consent endpoints are camelCase (`currentTermsVersion`, `acceptedAt`; `docs/api/auth-contract.md` section 7). Collection rows are returned as `SELECT c.*` (snake_case `begin_date`), whereas request bodies and the frontend `ICollection` use `beginDate` (`models/collection.ts:19`, `Collection.ts:7-8`); I believe this is an existing mismatch (REASONED from reading; not run).

Decision: **camelCase**, because this is an explicit DTO mapped in the route (not a row passthrough), it matches the consent endpoints, and it matches the frontend's own `AlbumSummary` (`albums.ts:6-13`: `createdAt`). The mapping from SQL snake_case happens in one place in the model/route. The envelope (`items`, `total`, `nextCursor`) is a deliberate departure from the bare arrays other list endpoints return, because pagination needs somewhere to put the cursor; the alternative (bare array plus an `X-Next-Cursor` header) would require exposing that header in CORS (`middleware/security.ts:12-23` has no `exposedHeaders`).

### 3.5 "Atualizado a": proposed meaning and interaction with `updated_at`

Options for what "atualizado a" means:

1. Rename only (what `album.updated_at` is today). Misleading: adding photos would not change the date, and the design shows the date next to the photo count.
2. Last photo upload only.
3. **Last activity (recommended)**: the latest of album creation/rename, any collection creation/edit, and any photo upload. This is what a user reads as "this album was last touched".

Proposed definition: `lastActivityAt` as in 3.3, computed in SQL from columns that already exist. **No schema change is needed for the first version.** `album.updated_at` keeps its current meaning (rename) and is not modified; the new field is a different, derived value, which is why it has a different name and why `updated_at` is not exposed.

Known limitations (CONFIRMED by reading the delete paths; the date can move backwards or stay put):
- Deleting an image, a collection or changing nothing about the album does not bump any column, so after a deletion the derived date can go back to an older value or stay the same. `collection.created_at` is also not part of the formula, but a new collection normally also has `updated_at = created_at` from its default (`models/collection.ts:20-21`), so it is covered.
- `PUT /collections/:id` sets `updated_at = NOW()` (`models/collection.ts:89`), so edits are covered.

Optional follow-up (needs owner approval and is NOT part of this proposal): bump `album.updated_at` (or a new `last_activity_at` column) from the collection/image write and delete routes, or via a trigger, and then index and sort on it. That removes the aggregation cost described in 5.4 and makes deletions count, at the price of a migration and write-path changes.

---

## 4. Image URLs

### 4.1 What happens today (CONFIRMED)

- Upload stores Cloudinary's `secure_url` in `image.image_url` and the Cloudinary `public_id` in `image.public_id` (`imageRoute.ts:89-99`, `models/image.ts:13-19`), with `type: "authenticated"`.
- `GET /images/collection/:id` returns `{ ...img, signed_url }` (`imageRoute.ts:42-49`): so each element carries `id`, `collection_id`, `image_url`, `public_id` **and** `signed_url`, where `signed_url` is `cloudinary.url(public_id, { type: "authenticated", sign_url: true, expires_at: now + 3600 })`.
- **The exact mismatch:** the frontend never reads `signed_url`. `IImage` declares `image_url` and `public_id` only (`Image.ts:5-8`), and `Album.tsx:34` maps `img.image_url`. A grep of `frontend/src` finds no `signed_url`. So the UI displays the stored upload URL, not the signed one.
- Consequence (UNVERIFIED, needs a look at the browser network tab or a Cloudinary check): either the stored `secure_url` of an authenticated asset already contains a permanent signature (then the 1 hour expiry is moot and a copied URL works indefinitely), or it does not load without a signature (then thumbnails are broken in a real environment). I cannot determine which from the code. The Security Engineer already flags that `expires_at` may not be an enforced delivery expiry in Cloudinary (S-06 in `docs/security/security-review-2026-11-15.md`, PLAUSIBLE).
- The existing response also exposes `public_id` and `image_url`, which name the storage provider.

### 4.2 Proposed behavior

The aggregate endpoint returns only `{ id, url, expiresAt }` per cover. The backend produces `url` through a small storage-service interface (CLAUDE.md section 6: keep storage behind an abstraction), for example:

```ts
interface ImageUrlSigner {
  // objectKey is the stored provider key (today image.public_id); never sent to the client.
  getReadUrl(objectKey: string, ttlSeconds: number): Promise<{ url: string; expiresAt: Date }>;
}
```

The route never sees provider details; swapping the adapter (Cloudinary today, OCI later) changes no response field. This proposal does not design the migration.

### 4.3 Cost per request

Signing is needed for at most 4 images per album, so at most `4 x page size` (default page 50 -> at most 200) signings per request, instead of one per image in the library.

- Cloudinary adapter: `cloudinary.url(..., sign_url: true)` builds and hashes a URL locally with no network call (REASONED from SDK behavior). 200 signings are CPU-trivial, and the call can stay synchronous inside the `Promise`.
- OCI adapter (design constraint, not a proposal to migrate): a pre-authenticated request (PAR) is created by an API call to OCI per object (REASONED; not verified against the SDK here). That would be up to 4 x N network calls on every list request and would create PAR objects that then exist in the bucket. Because that scales badly, the contract is a neutral `url` + `expiresAt`, which also permits a different implementation: the backend signing its own short-lived token (HMAC, local, no OCI call) for an authorized backend read route that streams or redirects the object. The choice belongs to the OCI migration design; the response shape does not depend on it.
- A signing failure for one cover must not fail the request: log server-side without the key or URL, drop that cover from `coverImages` and keep `photoCount` unchanged.

### 4.4 Expiry and caching

- Proposed TTL: 1 hour, as today. `expiresAt` is reported per cover so the client can refetch when close to it. The contract states `url` is "not guaranteed to work after `expiresAt`", because actual enforcement depends on the provider (S-06).
- Response header: `Cache-Control: private, no-store` (or `private, max-age=0, must-revalidate`) on the JSON, so a shared cache or browser never serves expired URLs.
- Browser image caching: URLs that embed a per-request expiry change on every call, so the browser re-downloads every cover on every visit. Optional mitigation: round the expiry up to a fixed window (for example the next 15-minute boundary plus the TTL) so the same object yields the same URL within the window. REASONED; needs owner agreement because it extends effective exposure by up to one window.
- Size: today `url` points at the original upload (up to 10 MB, `config/env.ts` `maxUploadBytes`, `imageRoute.ts:16`). A grid of up to 4 originals per album is heavy for a thumbnail slot. The contract allows `url` to later point to a resized variant without a field change; creating thumbnails is a separate decision (open question 5).
- Interaction with deletes: `ON DELETE CASCADE` removes image rows when an album or collection is deleted, so covers disappear from this endpoint, but the storage objects remain (S-09), and a URL issued earlier stays usable until it expires or is revoked at the provider. This is the existing behavior and is not made worse, but it is not solved here.

---

## 5. Query design and efficiency

### 5.1 Proposed SQL (PARAMETERIZED; to be written with the project's `sql` tagged template, so values become parameters)

`$1` = token user id, `$2`/`$3` = cursor timestamp (text) and id, both NULL on the first page, `$4` = limit + 1.

```sql
WITH ranked AS (
  SELECT a.id, a.name, a.created_at,
         COALESCE(s.photo_count, 0)::int AS photo_count,
         COALESCE(
           GREATEST(a.updated_at, a.created_at, s.last_collection_at, s.last_image_at),
           'epoch'::timestamptz
         ) AS sort_key
  FROM album a
  LEFT JOIN LATERAL (
    SELECT COUNT(i.id)        AS photo_count,
           MAX(i.created_at)  AS last_image_at,
           MAX(c.updated_at)  AS last_collection_at
    FROM collection c
    LEFT JOIN image i ON i.collection_id = c.id
    WHERE c.album_id = a.id
  ) s ON true
  WHERE a.user_id = $1
),
page AS (
  SELECT *
  FROM ranked
  WHERE $2::timestamptz IS NULL OR (sort_key, id) < ($2::timestamptz, $3::uuid)
  ORDER BY sort_key DESC, id DESC
  LIMIT $4
)
SELECT p.id, p.name, p.created_at, p.photo_count,
       p.sort_key::text AS sort_key_text,          -- full microsecond precision for the cursor
       (SELECT COUNT(*)::int FROM album WHERE user_id = $1) AS total,
       COALESCE(cv.covers, '[]'::json) AS covers
FROM page p
LEFT JOIN LATERAL (
  SELECT json_agg(json_build_object('id', x.id, 'objectKey', x.public_id)
                  ORDER BY x.created_at DESC, x.id DESC) AS covers
  FROM (
    SELECT i.id, i.public_id, i.created_at
    FROM image i
    JOIN collection c ON c.id = i.collection_id
    WHERE c.album_id = p.id
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT 4
  ) x
) cv ON true
ORDER BY p.sort_key DESC, p.id DESC;
```

Notes on the query (REASONED; not run):
- The user is scoped once, at the root (`a.user_id = $1`). Collections and images are reached only through `c.album_id = a.id` and `i.collection_id = c.id` from those albums, so rows of other users cannot appear (no id is accepted from the client).
- `COUNT(i.id)` with a `LEFT JOIN` counts images, not collections; collections without images and albums without collections yield `0` through the lateral subquery returning one all-NULL aggregate row (aggregates without `GROUP BY` always return one row).
- `::int` is required: `COUNT` is `bigint`, and the Neon driver returns `bigint` as a string (REASONED from the node-postgres/Neon type handling; to be checked in the first implementation test against a real database).
- `sort_key` is coalesced to epoch so the sort and the keyset comparison never meet NULL. The API field `lastActivityAt` is returned as `null` when the underlying value was the epoch sentinel.
- `objectKey` is selected only inside the backend; the route replaces it by `url` + `expiresAt` and never serializes it.
- The `page` CTE fetches `limit + 1` rows (`$4`); the route drops the extra row and uses it only to decide `nextCursor`. The cursor is the base64url of `{ t: sort_key_text, id }` taken from the last returned row; `t` stays text so microsecond precision is preserved (JavaScript `Date` would truncate to milliseconds and could repeat or skip rows).
- Cover choice: newest 4 images album-wide. Alternative (oldest 4) keeps the mosaic stable when photos are added; owner preference (question 6).
- A window-function version (`ROW_NUMBER() OVER (PARTITION BY album_id ...)` over all of the user's images) would read the images once instead of once per album in the cover lateral; it is equivalent for results, less readable, and not clearly better without `EXPLAIN`. Kept as an implementation-time alternative to compare on a real database.

### 5.2 Indexes (schema change; NOT part of the endpoint itself, needs owner approval)

None of these exist in the repository DDL (1.4).

```sql
CREATE INDEX IF NOT EXISTS album_user_id_idx       ON album (user_id);
CREATE INDEX IF NOT EXISTS collection_album_id_idx ON collection (album_id);
CREATE INDEX IF NOT EXISTS image_collection_created_idx
  ON image (collection_id, created_at DESC, id DESC);
```

- `album (user_id)`: the root filter; also used by every existing owner-scoped query (`models/*.ts`).
- `collection (album_id)`: both laterals and the existing `getCollectionsByAlbumId`.
- `image (collection_id, created_at DESC, id DESC)`: lets `COUNT`/`MAX(created_at)` per collection be answered from the index alone (index-only scan when the visibility map is current), and gives ordered access for the cover top-4 per collection. Because covers are album-wide (several collections), PostgreSQL still has to merge or sort across the album's collections: reading at most (images in the album) index entries, then a top-4. REASONED.
- They would be added through `migrations/migrate.ts` using `CREATE INDEX IF NOT EXISTS` (the existing pattern). `CONCURRENTLY` cannot run inside a transaction; at this table size a plain `CREATE INDEX` lock is expected to be negligible, but that is REASONED and the table sizes are unknown. The indexes would also speed up the existing N+1 endpoints, so they are worth doing even if this endpoint is not approved.

### 5.3 Ordering and pagination

- Order: `sort_key DESC, id DESC`, where `sort_key` is the last-activity timestamp (3.3) and `id` (UUID) is the tie-breaker. `id` is unique, so the order is total and deterministic.
- Keyset (cursor) pagination: `(sort_key, id) < (cursor_t, cursor_id)`. Default `limit` 50, maximum 100; `limit` outside 1..100 or non-integer -> `400 { "error": "Invalid limit" }`; a malformed or tampered cursor -> `400 { "error": "Invalid cursor" }`.
- Caveat: `sort_key` can change between page requests (a photo is uploaded). An album may then appear twice or be skipped across pages; the client dedups by `id`. Acceptable for this use.
- Offset pagination was rejected (instability and cost grow with the offset, and it gives no benefit at these sizes).
- Interaction with the page: the Álbuns screen searches and sorts on the client over the loaded albums (`Album.tsx`, `filterAlbumsByName`). With pagination the frontend must either follow `nextCursor` until `null` or move search server-side (not proposed). `total` lets the subtitle stay correct.

### 5.4 Behavior at 10, 1,000 and 10,000 albums (REASONED, not measured)

- **10 albums:** negligible work; one HTTP round trip to Neon dominates (versus 13 round trips today in the example of 1.1).
- **1,000 albums with the indexes (5.2):** about 1,000 index probes on `collection` and the matching `image` index ranges; the work is proportional to the number of the user's images, not to the page size, because the sort key needs the aggregates of every album before ordering. Expected to be in the tens-to-low-hundreds of milliseconds range for plausible personal-library sizes, but that is an estimate. Without the indexes, the planner has to scan `album`/`collection`/`image` heaps (sequential scans or hash joins), which gets worse with total table size across all users (the tables are shared by every user, so another user's data also costs time).
- **10,000 albums:** the full aggregation per request becomes the bottleneck and `limit` does not reduce it (it only reduces payload and signing). If this scale is realistic, the options are (a) order by `album.created_at` instead (an index `(user_id, created_at DESC, id DESC)` makes top-N cheap and only page rows are aggregated), or (b) maintain `last_activity_at` and `photo_count` on `album` (denormalized, needs a migration and write-path changes). A personal photo app is not expected to reach this size, so neither is proposed now; the escape hatch is documented.
- Response size (REASONED estimate): about 0.3 KB per cover (`id`, a signed URL of roughly 150-250 characters, `expiresAt`) and about 0.2 KB per album: a full page of 100 albums with 4 covers is on the order of 150 KB uncompressed. Not measured.
- Neon specifics supported by the code: the client is the `@neondatabase/serverless` `neon()` function (`config/db.ts:7`), not a pooled `pg` connection; so a request is best served by one statement (this design) rather than several, and no transaction is needed because the query is a single read.

---

## 6. Authorization and security

- **Identity:** `currentUserId(req)` from the verified token only (`middleware/auth.ts:29-33`). The route is mounted behind `authFailureLimiter` + `requireAuth` like `/albums` (`app.ts:37-38`). No user id in the path, query or body is read; the endpoint has no `:userId` variant.
- **Ownership in SQL:** `a.user_id = $1` at the root; collections and images are joined from those albums (5.1). No client-supplied album, collection or image id exists, so there is no IDOR surface. The cursor carries no authority: a forged cursor can only reposition within the caller's own result set (validated as base64url JSON with an ISO timestamp and a UUID; anything else is 400).
- **Output minimization:** no `user_id`, no storage keys or provider names, no database internals. Unlike `GET /albums` (`SELECT *`) this is a field allow-list.
- **Errors:** `{ "error": string }` only (`docs/api/auth-contract.md` section 2). 401 from `requireAuth` (generic messages). 400 for invalid `limit`/`cursor`. 500 `{ "error": "Failed to fetch album summaries" }` with details logged server-side only (same pattern as `albumRoute.ts:13-16`). No 403 and no 404 exist for this route.
- **Rate limiting class:** a read, so only the existing `generalLimiter` (per IP, 300 per 15 min) and `authFailureLimiter`; no `writeLimiter` (it skips GET anyway, `security.ts:61`) and no upload limiter. It replaces `1 + A + C` calls with 1, so it lowers pressure on the limiter. A dedicated per-user read limiter is not proposed; the heavier aggregate query is bounded by `limit <= 100` and by the 300-request ceiling. The existing limiter caveats (S-01 trust proxy, S-16 per-replica memory) apply unchanged.
- **Email verification and consent:** do not gate. A read of the user's own data must not require a verified email (`docs/api/backend-proposals-2026-11.md` section 4, and the Security Engineer's gating table agree: own-data reads are ungated). The endpoint is also not gated on consent (S-08 remains the owner's open decision).
- **Relevant findings in `docs/security/security-review-2026-11-15.md`:**
  - S-06 (signed URL expiry may not be enforced by Cloudinary): this endpoint hands out more URLs per request. Mitigation in the proposal: return `expiresAt` with a "not guaranteed after" contract, minimal TTL, `Cache-Control: private, no-store`, and a provider-neutral signer so the OCI expiry is real when it replaces Cloudinary. The aggregate endpoint does not make S-06 worse (it signs fewer objects than the N+1 chain), but it does not fix it.
  - S-09 (deletes leave storage objects): see 4.4. Not made worse.
  - S-10 (object keys derived from names): not touched; the endpoint never builds keys.
  - S-01/S-16 (rate-limit configuration): unchanged.
  - Frontend note: the current UI loads `image_url` rather than `signed_url` (4.1). Moving to this endpoint makes the UI use the signed `url`; if the stored URL works indefinitely today, that is a behavior difference worth a Security Engineer look.
- **Logging:** never log the signed URLs, object keys, tokens or the cursor; log only the user id (already an opaque id) and an error code on failure, per the `application-logging` guidance.

---

## 7. Compatibility with the existing frontend (describe only; no frontend file was edited)

### 7.1 Mapping

| New field | Current frontend location | Change needed |
|---|---|---|
| `items[].id` | `AlbumSummary.id` (`albums.ts:7`) | none (`AlbumId = number | string`; backend returns a UUID string) |
| `items[].name` | `AlbumSummary.name` | none |
| `items[].createdAt` | `AlbumSummary.createdAt?` (`albums.ts:9`) | now filled directly (today mapped from `created_at`, `loadAlbums.ts:107`); may be null |
| `items[].lastActivityAt` | none | new optional field on `AlbumSummary`; used for the "atualizado a ..." text and for sorting |
| `items[].photoCount` | derived `album.images.length` (`AlbumCard.tsx:482`) | **new field `photoCount: number`; `AlbumCard` must use it.** If the card keeps `images.length`, it would show at most 4 |
| `items[].coverImages[].url` | `AlbumSummary.images: string[]` (`albums.ts:12`) | `images = coverImages.map(c => c.url)`: the card's mosaic code (`AlbumCard.tsx:463-476`) keeps working |
| `coverImages[].expiresAt` | none | optional: refetch the page when the earliest `expiresAt` is near, or on image load error |
| `total` | `albumsSubtitle(albums.length)` (`Album.tsx`) | use `total` for the subtitle if several pages exist |
| `nextCursor` | none | follow until `null` (loop in the loader) |

### 7.2 Exact contract changes the Frontend Engineer would make (after approval)

1. `lib/albums.ts`: add `photoCount: number` and `lastActivityAt?: string | null` to `AlbumSummary`; keep `images: string[]`. Update `sortMostRecent` to prefer `lastActivityAt`, then `createdAt`, and keep the existing numeric-id fallback. Add a formatter for "atualizado a 12 nov" (check the pt-PT `Intl.DateTimeFormat` output for the abbreviated month, since punctuation differs by runtime). The page can keep sorting on the client for the search/filter flow; the server order is the default.
2. `lib/loadAlbums.ts`: add a new source `getAlbumSummaries(): Promise<{ items, total, nextCursor }>` and a loader that follows `nextCursor`; map `coverImages -> images` and copy `photoCount`, `lastActivityAt`. The existing N+1 loader stays until the new one is verified, then is removed.
3. `Album.ts` (`WorkerAlbum`): new method for `GET /albums/summaries` using `apiJson` (`apiClient.ts:62-66`); keep the existing 401 pass-through behavior (`Album.ts:170-171`) so the page can redirect to Login.
4. `components/AlbumCard.tsx`: line 482 `formatPhotoCount(album.images.length)` -> `formatPhotoCount(album.photoCount)`; render "· atualizado a <date>" when `lastActivityAt` is present, otherwise keep the current text (the comment at `:481` can then go). An `onError` fallback for broken cover URLs (expired or missing object) should show the neutral placeholder tile already used (`pm-mosaic-empty`).
5. `pages/Album.tsx`: switch `sources` to the new call; keep loading/error/empty states unchanged (the 401 -> Login handling stays).
6. Tests: update `loadAlbums` and `AlbumCard` tests; the 7-request mock sequence becomes one mocked response.

### 7.3 Coexistence and migration plan

- Pure addition: Option B adds a route. `GET /albums`, `/albums/user/:userId`, `GET /collections/album/:id` and `GET /images/collection/:id` do not change, so old clients keep working unmodified.
- Order: (1) owner approves; (2) backend ships the route and tests (and the indexes, if approved); (3) frontend switches the Álbuns page; (4) after verification against a real backend, remove the N+1 loader code. No feature flag is required because the server change is additive. If the owner wants a safety net, the new loader can fall back to the old one on a 404 (an older backend) for one release.
- The Album detail page and the Collections pages still use the per-collection endpoints and are not affected.

---

## 8. Test plan

The existing suite uses Vitest + Supertest with the models mocked (`backend/tests/api.test.ts`, `helpers.ts`: `mockVerifier`, `ALICE`/`BOB`, `authz()`). The new route tests would follow that pattern. **None of these tests has been written or run.**

Mocked-model tests (Vitest + Supertest):

| # | Case | Expectation |
|---|---|---|
| 1 | No header / non-Bearer / invalid token | 401 `{ error }`, model not called |
| 2 | Ownership isolation | the model is called with the token user id only; query string `userId`, header or body ids are ignored; Alice's token never receives Bob's mocked rows |
| 3 | Ordering determinism | model returns rows with equal `sort_key`; the route preserves the order and `nextCursor` is derived from the last returned row |
| 4 | Covers limit | even if the mock returns 5 covers for one album, the response has at most 4 |
| 5 | Empty state | user with zero albums -> `{ items: [], total: 0, nextCursor: null }` |
| 6 | Album with no collections/images | `photoCount: 0`, `coverImages: []`, `lastActivityAt` falls back to `createdAt` |
| 7 | Pagination | default limit applied; `limit=0`, `101`, `abc` -> 400; extra row (limit+1) is trimmed and sets `nextCursor`; malformed/tampered cursor -> 400 `{ error: "Invalid cursor" }` |
| 8 | Large counts | `photoCount` of 100000 is serialized as a number, not a string |
| 9 | URL fields present | each cover has `id`, `url`, `expiresAt` (ISO), and no `public_id`, `objectKey`, `image_url`, `user_id` anywhere in the JSON (deep scan) |
| 10 | Signer failure on one cover | cover dropped, `photoCount` unchanged, status 200, nothing sensitive logged |
| 11 | DB failure | 500 `{ error: "Failed to fetch album summaries" }`, no internal text |
| 12 | Headers | `Cache-Control` contains `no-store` (or the agreed value) |
| 13 | Not gated by email verification | a token with `email_verified: false` (when that gating exists) still gets 200 |

Needs a real PostgreSQL (cannot be proven with mocks; CLAUDE.md section 10 requires a test database that is not production):
- the SQL itself: counts with images in several collections, collections without images, albums without collections, `bigint -> int` handling through the Neon driver, `GREATEST` with NULL inputs, microsecond-precision cursor round trip, tie-breaking with identical timestamps, cross-user isolation with two users' rows;
- index use and plan shape (`EXPLAIN (ANALYZE, BUFFERS)`) at roughly 10, 1,000 and 10,000 albums;
- behavior of the migration (`CREATE INDEX IF NOT EXISTS` re-run).

---

## 9. Risks, open questions and recommended decision

### 9.1 Risks

- **Ordering/aggregation cost grows with the user's image count** (5.4). Mitigation: indexes; escape hatch (order by `created_at`, or denormalize).
- **Date semantics mismatch:** deletions do not move `lastActivityAt` (3.5).
- **Signed URL enforcement is UNVERIFIED** (4.1, S-06): `expiresAt` may be advisory with Cloudinary.
- **Existing stored `image_url` vs signed URL:** switching the UI to signed URLs could reveal that either set of URLs behaves differently from what the owner sees today (4.1).
- **Original-size images in thumbnail slots** can make the page heavy.
- **Indexes are a schema change** and the owner's Neon database may already contain hand-made indexes (UNVERIFIED).
- **`photoCount` and a date are new product-visible data** that the owner had not approved before this proposal.

### 9.2 Open questions for the owner

1. Approve a new aggregate endpoint at all? And is `GET /albums/summaries` an acceptable name/shape (Option B), or do you prefer `?include=summary` on `GET /albums` (Option A)?
2. Approve exposing `photoCount` and "atualizado a" now (the design shows both)?
3. Meaning of "atualizado a": last activity (recommended), last upload only, or rename only? And is "mais recentes" ordered by last activity (as the design's dates suggest) or by creation date?
4. Approve the three indexes in 5.2 (separately from the endpoint; they also help existing routes)? Are there indexes already in the Neon database?
5. Cover images: full-size originals for now, or should thumbnails be planned (not part of this proposal)?
6. Covers: newest 4 (recommended) or oldest 4 (stable mosaic)?
7. Do you want pagination from the first version (the page searches on the client), or should v1 return all albums up to a hard cap of 100 and add the cursor later? (The response shape above already has `nextCursor`, so the first can be introduced later without a break.)
8. Approve the optional write-path change that bumps album activity on collection/image writes and deletes (removes the aggregation cost and makes deletions count; needs a migration)?
9. Please check in a real environment whether the stored `image_url` of an authenticated Cloudinary asset loads and whether signed URLs expire (S-06), because it changes how much the new `expiresAt` can promise.

### 9.3 Recommended decision

Approve **Option B** with this scope: the new read-only `GET /albums/summaries` with the response shape in section 3 (`photoCount`, `lastActivityAt` defined as last activity, up to 4 `coverImages` with neutral `url`/`expiresAt`), `limit` default 50 / max 100 with a keyset cursor, a provider-neutral `ImageUrlSigner` adapter, and the three indexes added through `migrations/migrate.ts` as a separate approval item. Defer the activity-bump write-path change, thumbnails, server-side search and denormalization until measurements on a real database show they are needed. After approval, the Backend Engineer would implement with the test plan in section 8 and update `docs/api/auth-contract.md`; the Frontend Engineer would apply section 7.2.

Items that need explicit owner approval before any work: the endpoint, the new visible data (`photoCount`, `lastActivityAt`), the indexes, and any activity-bump change.
