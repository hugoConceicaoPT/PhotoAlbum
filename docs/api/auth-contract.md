# Backend Auth and API Contract (Stage 3)

_Date: 2026-11-15 · Status: implemented in `backend/`, unit/integration tests passing with mocked Stack Auth and DB. Not yet verified against a real Stack Auth project or a real database._

Audience: Frontend Engineer. The backend now enforces authentication and authorization; the frontend must send a Stack Auth access token on every request.

## 1. Authentication

Every endpoint except `GET /` requires:

```
Authorization: Bearer <Stack Auth access token>
```

Get the token on the frontend (`@stackframe/react`, custom Login/Registar screens are fine):

```ts
const user = await stackClientApp.getUser({ or: "redirect" });
const { accessToken } = await user.getAuthJson(); // short-lived JWT; call it per request, do not cache
headers.Authorization = `Bearer ${accessToken}`;
```

Notes:
- The snippet is based on the `getAuthJson()` / `getAccessToken()` signatures in the installed `@stackframe/js` typings; confirm the exact call against the `@stackframe/react` version in the frontend.
- Do not send the refresh token to the backend. Do not send `x-stack-auth`.
- Access tokens are short-lived; fetch a fresh one for each request (the SDK refreshes it).
- Anonymous Stack users are rejected (401).
- `credentials: "include"` is not needed and not allowed by CORS (no cookies are used).
- The backend identifies the user ONLY from the token `sub` claim (equal to `neon_auth.users_sync.id`, which is `Album.user_id`). Any user id in a body, URL or query is ignored or checked against the token.

## 2. Error shape

All errors: `{ "error": "<message>" }`. Messages are generic and safe to display.

| Status | Meaning |
|---|---|
| 400 | Invalid or missing input |
| 401 | No token, malformed header, or invalid/expired token. Frontend: refresh token once, else send to Login |
| 403 | Only on the legacy `/user/:userId` routes when `userId` is not the caller |
| 404 | Resource does not exist OR belongs to another user (indistinguishable on purpose); also non-UUID ids |
| 409 | `POST /albums`: the user's profile row has not been synced to the DB yet (retry in a few seconds) |
| 413 | JSON body over 100 kb, or an uploaded file over 10 MB |
| 429 | Rate limited. Respect the `RateLimit-*` / `Retry-After` headers |
| 500 | Unexpected server error |

## 3. Endpoints

Ids are UUID strings. Response bodies are otherwise unchanged from before.

### Albums
| Method and path | Change | Notes |
|---|---|---|
| `GET /albums` | NEW | Albums of the authenticated user. Preferred. |
| `GET /albums/user/:userId` | DEPRECATED, kept | `:userId` must equal the caller's Stack user id, otherwise 403. Frontend should migrate to `GET /albums` and stop using `userId = 1`. |
| `POST /albums` | changed | Body `{ name }` (string, 1 to 200 chars after trim). `user_id` in the body is ignored. 201 returns the album. |
| `PUT /albums/:id` | changed | Body `{ name }`. 404 if not yours. |
| `DELETE /albums/:id` | changed | 404 if not yours. |

### Collections
| Method and path | Change | Notes |
|---|---|---|
| `GET /collections` | NEW | All collections of the caller's albums. |
| `GET /collections/user/:userId` | DEPRECATED, kept | Same rule as albums (403 on mismatch). |
| `GET /collections/album/:albumId` | changed | 404 if the album is not yours (previously returned data for any album). |
| `GET /collections/:id` | changed | 404 if not yours. |
| `POST /collections` | changed | Body `{ album_id, name, description?, beginDate?, endDate? }`. `album_id` must be a UUID of one of your albums (404 otherwise). Dates `YYYY-MM-DD`. `description` up to 2000 chars. Response body is currently empty (pre-existing behavior; see open points). |
| `PUT /collections/:id` | changed | Any of `name, description, beginDate, endDate`; unknown fields are ignored. At least one required. |
| `DELETE /collections/:id` | changed | 404 if not yours. |

### Images
| Method and path | Change | Notes |
|---|---|---|
| `GET /images/collection/:collectionId` | changed | 404 if the collection is not yours. |
| `POST /images/upload/:collectionId` | changed | multipart field `images`, up to 10 files, each up to 10 MB, content type must be `image/jpeg`, `image/png`, `image/webp` or `image/gif` (else 400). Stricter rate limit (30 / 15 min / user). 404 if the collection is not yours. |
| `DELETE /images/:id` | changed | 404 if not yours. |

### Other
- `GET /` public text response.
- `GET /db-version` removed outside `NODE_ENV=development` (it leaked the PostgreSQL version to anonymous callers).

## 4. CORS

Allowlist from `CORS_ALLOWED_ORIGINS` (exact origins, comma separated). The frontend origin must be in that list. Allowed methods: GET, POST, PUT, DELETE. Allowed request headers: `Authorization`, `Content-Type`. No credentials.

## 5. Configuration the frontend must fix

- Backend listens on port **5000** by default (`PORT` env). Frontend `config.ts` defaults to `http://localhost:8080`; set `VITE_API_URL=http://localhost:5000` (or change the default).
- `Album.tsx` hard-codes `userId = 1`; replace with `GET /albums` (no user id needed).

## 6. Rate limits (per 15 minutes)

| Scope | Default |
|---|---|
| All requests, per IP | 300 |
| 401 responses, per IP | 20 |
| Upload requests, per user | 30 |

## 7. Terms consent (added 2026-11-15)

Server-side record that the authenticated user accepted a version of the terms. Both endpoints require the Bearer token (section 1). The user is derived ONLY from the verified token; a user id in the body or query is ignored, so one user can never read or write another user's consent.

Configuration: the current version comes from the backend environment variable `TERMS_VERSION` (default placeholder `placeholder-0`). There is no Terms/Privacy document yet; the version string is opaque to the backend. The frontend should read `currentTermsVersion` from `GET /me/consent` rather than hard-coding it.

### `GET /me/consent`
200:
```json
{ "currentTermsVersion": "placeholder-0", "accepted": false, "acceptedVersion": null, "acceptedAt": null }
```
`accepted` is true only if the user accepted the CURRENT version; then `acceptedVersion` equals `currentTermsVersion` and `acceptedAt` is an ISO 8601 UTC timestamp set by the server. A user who accepted only an older version gets `accepted: false` and nulls.

### `POST /me/consent`
Body: `{ "termsVersion": "<string>" }`

| Status | Body | When |
|---|---|---|
| 201 | `{ "termsVersion": string, "acceptedAt": string }` | Newly recorded |
| 200 | same shape, original `acceptedAt` | Already recorded for this user and version (idempotent) |
| 400 | `{ "error": string }` | `termsVersion` missing, not a string, empty, or not the current version |
| 401 | `{ "error": string }` | No or invalid token |
| 409 | `{ "error": string }` | The user's profile row is not synced to the DB yet (retry shortly), same as `POST /albums` |
| 429 | `{ "error": string }` | Write rate limit (default 60 per 15 min per user; `RATE_LIMIT_WRITE`). GET is not counted |

Storage: table `terms_consents (id, user_id, terms_version, accepted_at, UNIQUE (user_id, terms_version))`, `user_id` references `neon_auth.users_sync(id)` with `ON DELETE CASCADE` (same type as `Album.user_id`). No IP or other personal data is stored. The table is created by `backend/migrations/migrate.ts`, which today runs automatically only when `NODE_ENV=development`; any other environment must run it explicitly (owner decision).

Not enforced: other endpoints do NOT currently reject users who have not accepted the terms. Whether to block usage server-side is an open owner question.

## 8. Later changes (see `albums-summaries-contract.md`)

New `GET /albums/summaries`, new `url` and `expiresAt` fields on `GET /images/collection/:id`, upload magic-byte check (400 "Invalid image file"), 503 with `Retry-After` when the token key source is unreachable, `null` now clears collection fields, calendar-invalid dates give 400. The final contract and its assumptions are in `albums-summaries-contract.md`.
