# Backend proposals (2026-11)

**STATUS UPDATE (2026-11-15, after owner approval).** The sections below were written as proposals. The owner has since approved the items marked below; this table records what was done. Items not in the "approved" rows remain PROPOSALS and are NOT applied. Evidence for each section is kept as originally written (line numbers refer to the earlier working tree).

| Item | Status | Where / tests |
|---|---|---|
| 1. multer upgrade | IMPLEMENTED: `multer@^2.5.0` (installed 2.5.0; node >= 10.16.0, no peer dependencies). Advisory and breaking-change review is section 1. Real multipart tests exist | `tests/upload.test.ts` (multer not mocked: valid PNG/JPEG/GIF/WebP, size 413, type 400, more than 10 files, unexpected field) |
| 2. `@stackframe/js` | REMOVED. Re-checked: no import in `backend/` source, tests or config (only prose comments remain); not in `package.json` or `package-lock.json`; `npm ls` shows `jose@5.10.0` as a direct dependency (token verification is `jose`, so authentication does not depend on the SDK); frontend uses its own Stack package | `tests/stackAuth.test.ts`, `tests/hardening.test.ts` (verifier with local keys). Not tested against a real Stack project |
| L1 | IMPLEMENTED (per-field flags, null clears, undefined keeps) | `models/collection.ts`; `tests/hardening.test.ts`, `tests/models.test.ts` (SQL parameters captured, not run on PostgreSQL) |
| L2 | IMPLEMENTED (`isRealIsoDate` round trip) | `lib/validation.ts`; `tests/hardening.test.ts` |
| L6 SEC | IMPLEMENTED, AMENDED: `requiredClaims` set; positively identified key-source outage gives 503 + `Retry-After: 5` (not counted by the 401 limiter); everything else stays 401 | `lib/stackAuth.ts`, `middleware/auth.ts`; `tests/hardening.test.ts` |
| L7 SEC | IMPLEMENTED: no body parser before auth; JSON parsed per router after `protect`; urlencoded removed | `app.ts`; `tests/hardening.test.ts` |
| L8 SEC | IMPLEMENTED: single `protect` chain for `/images`; upload limiter moved into the image router and placed before multer | `app.ts`, `routes/imageRoute.ts`; `tests/upload.test.ts` (token verified once per upload) |
| M3 SEC | IMPLEMENTED: magic-byte check on the temp files before any storage call; temp files removed before responding on EVERY exit path (success, 400, 404, 500, mid-loop failure); multer-level rejections are cleaned by multer and tested | `lib/imageSignature.ts`, `routes/imageRoute.ts`; `tests/upload.test.ts` |
| M4 | NOT APPLIED (owner did not approve the startup warning) | n/a |
| Email verification | NOT APPLIED (proposal only, section 4) | n/a |
| Not approved, not applied | F4 (Cloudinary delete type), F5 (owner-scoped deleteImage), express transitive `npm update`, removal of the deprecated `/user/:userId` routes | n/a |
| `GET /albums/summaries` | IMPLEMENTED, see `albums-summaries-contract.md` | `tests/albumSummaries.test.ts`, `tests/models.test.ts` |

Residual note on M3: the check reads the first 12 bytes only. It stops type spoofing, not polyglot files.

---

## 1. multer 2.0.2 upgrade (audit finding H1)

**How it is used:** `backend/routes/imageRoute.ts` only (`multer({ dest: "uploads/", limits: { fileSize, files: 10 }, fileFilter })`, `upload.array("images", 10)` on `POST /images/upload/:collectionId`, disk storage, temp files unlinked after the Cloudinary upload). `errorHandler` in `middleware/security.ts` maps `MulterError` (`LIMIT_FILE_SIZE` to 413, others to 400).

**Advisories affecting 2.0.2** (`npm audit` reports "multer <= 2.4.0", severity high; details from the GitHub advisory API):

| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| GHSA-xf7r-hgr6-v32p (CVE-2026-3304) | high | DoS, incomplete cleanup | 2.1.0 |
| GHSA-v52c-386h-88mc (CVE-2026-2359) | high | DoS, resource exhaustion | 2.1.0 |
| GHSA-5528-5vmv-3xc2 (CVE-2026-3520) | high | DoS, uncontrolled recursion | 2.1.1 |
| GHSA-72gw-mp4g-v24j (CVE-2026-5079) | high | DoS, deeply nested field names | 2.2.0 |
| GHSA-3p4h-7m6x-2hcm (CVE-2026-5038) | medium | DoS, aborted uploads not cleaned up | 2.2.0 |
| GHSA-wc9g-mqfw-jrwm (CVE-2026-77078) | high | DoS, crafted field names | 2.3.0 |
| GHSA-qvfw-j98x-7q72 (CVE-2026-77063) | low | file size limit bypass with async fileFilter | 2.3.0 |
| GHSA-535w-7cp7-47q4 (CVE-2026-82333) | high | DoS, oversized array index in field names | 2.3.0 |
| GHSA-q7qp-rjg7-q26m (CVE-2026-113872) | high | DoS, pending async fileFilter after request teardown | 2.5.0 |

The release notes also list GHSA-qfvm-cv95-jqjf (fixed 2.3.0) and GHSA-3pph-fpjx-jg34 (fixed 2.4.0), which `npm audit` did not flag for 2.0.2 (not investigated further).

**Recommended:** `multer@^2.5.0` (npm `latest`; first version with no known advisory in the list above). Not 3.0.0-alpha (pre-release).

**Compatibility:** 2.5.0 declares `engines.node >= 10.16.0` (local Node is 22.19.0) and has no Express peer dependency (plain middleware), so Express 5 is not a constraint. Its dependencies shrink (xtend, mkdirp, concat-stream, object-assign dropped; remaining: busboy, type-is, append-field). `@types/multer@^2.0.0` should still apply; confirm with `tsc`.

**Behavior changes 2.0.2 to 2.5.0 relevant here** (GitHub release notes; no major bump):
- Files exactly at the `fileSize` limit are now accepted (previously rejected). Irrelevant in practice for a 10 MB cap.
- Limits are validated at construction; a non-integer `fileSize` is rejected. Ours comes from `intFrom()` (integer).
- `maxCount` is not consumed by files skipped by `fileFilter`; a fileFilter calling its callback twice no longer crashes the process.
- Error wording for `LIMIT_UNEXPECTED_FILE` and filenames in file errors changed (our handler returns generic text).
- Stricter handling of field names (nesting and array index); the upload form uses only the field `images`.

**Risk:** low. Smallest change: `npm install multer@^2.5.0`, then `tsc`, `npm test`. Caveat: no existing test exercises real multipart parsing (tests mock Cloudinary and the models); add a multipart supertest case (valid image 201 with mocked Cloudinary, over-limit file 413, disallowed MIME 400) to verify the upgrade. See also M3 below.

## 2. `@stackframe/js` in the backend

- **Imported anywhere?** No. A grep for `stackframe` over `backend/` (excluding node_modules, dist and the lockfile) matches only `package.json:35` and a comment in `lib/stackAuth.ts:20`. Token verification uses `jose` directly.
- **Required by anything?** `npm ls @stackframe/js` shows it only as a direct dependency of the root project; nothing else depends on it. It pulls in `@stackframe/stack-shared`, `cookie` and a second `jose`. The root project also depends on `jose@^5.10.0` directly, so `jose` stays.
- **Effect of removing it** (measured on a scratch copy of `package.json` and `package-lock.json` using `npm uninstall @stackframe/js --package-lock-only`; the project itself was not changed): lockfile packages 578 to 395; `npm audit` total 37 to 13 (low 4 to 1, moderate 20 to 2, high 11 to 9, critical 2 to 1). Findings that disappear include `@stackframe/js`, `@stackframe/stack-shared`, `elliptic`, `bn.js`, `cookie`, `uuid` and `fast-xml-parser` (critical, transitive). Remaining: multer, the Express chain (body-parser, path-to-regexp, proxy-addr critical) and dev tooling.
- **Proposal:** remove it (`npm uninstall @stackframe/js`), then `tsc`, `npm test`, `npm run build`. Risk: low since unused. The frontend uses its own Stack package; this does not affect it.

## 3. Small fixes (not applied)

Items marked SEC need Security Engineer review before implementation.

| ID | Current behavior (file:line) | Proposed minimal change | Risk | Test to add |
|---|---|---|---|---|
| L1 | `models/collection.ts:85-88` uses `COALESCE(param, column)`, so `null` keeps the old value; `PUT /collections/:id` accepts `null` for description and dates (`lib/validation.ts` `optionalText`/`optionalDate`) but cannot clear them | Build the SET clause per provided key with a parameterized flag (`CASE WHEN ${hasX} THEN ${x} ELSE col END`) so `null` clears and `undefined` keeps; `name` stays non-nullable | Low; intended behavior change, note it in the contract | Route test: `PUT {description: null}` reaches the model as `null`. The SQL itself cannot be tested without a real database |
| L2 | `lib/validation.ts` `optionalDate` checks shape by regex and `Date.parse`, which does not reliably reject calendar-invalid dates such as `2026-02-31`; PostgreSQL then rejects it and the route's catch returns 500 | After the regex, round-trip check `new Date(v + "T00:00:00Z").toISOString().slice(0,10) === v`, else `"invalid"` (route returns 400) | Very low | `POST` and `PUT /collections` with `2026-02-31` and `2026-13-01` return 400 |
| L6 SEC | `lib/stackAuth.ts:30-35` `jwtVerify` has no `requiredClaims`; `middleware/auth.ts:19-23` maps every verifier error, including a JWKS fetch failure or timeout, to 401 | Add `requiredClaims: ["sub","exp","iss","aud"]`; identify jose JWKS outage errors (for example `ERR_JWKS_TIMEOUT`, network failures) and return 503 `{error}` so the frontend does not sign users out during an outage; keep 401 for everything else | Medium: misclassifying an auth failure as 503 would bypass `authFailureLimiter`, which counts 401s. Default to 401 unless the error is positively an outage | Verifier test with a key getter that throws a network error expects a typed outage error; middleware test expects 503; existing bad-token tests stay 401 |
| L7 SEC | `app.ts:28-29` `express.json` and `express.urlencoded` run before `requireAuth` (`app.ts:37`), so unauthenticated clients make the server parse bodies up to 100 kb; no route uses urlencoded | Remove `express.urlencoded`. Mount `express.json` after auth, per router (`app.use("/albums", ...protect, express.json(...), albumRoutes)`) | Low to medium: all routes still need parsed bodies and the 400/413 mapping in `errorHandler` must still apply; oversize bodies from unauthenticated callers become 401 instead of 413 (intended) | Unauthenticated oversize POST returns 401; authenticated oversize still 413; existing body tests pass |
| L8 SEC | `app.ts:42-43`: `/images/upload` mounts `protect` plus `uploadLimiter`, then the request falls through to `/images`, which mounts `protect` again, so uploads run `authFailureLimiter` and token verification twice | Move `uploadLimiter` into `routes/imageRoute.ts` on the upload route only and keep a single `app.use("/images", ...protect, imageRoutes)` | Low | `verify` mock is called once per upload request; the per-user 429 on uploads still works |
| M3 SEC | `routes/imageRoute.ts:14-19` `fileFilter` checks only the client-declared `file.mimetype`; file content is never inspected before it is sent to Cloudinary | After multer writes the temp file, read the first 12 bytes and check magic numbers (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, GIF `GIF87a`/`GIF89a`, WebP `RIFF....WEBP`); reject mismatches with 400 and unlink. No new dependency. Also unlink the remaining temp files when `addImage` fails mid-loop (the loop returns 400 without discarding later files) | Low; stops simple spoofing, not polyglot files (re-encoding by the storage provider is the real defence) | Text file declared as `image/png` gets 400 and its temp file is removed; a valid 1x1 PNG passes (multipart supertest with real buffers) |
| M4 SEC (notes) | `app.ts:19` trust proxy is set only when `TRUST_PROXY_HOPS > 0` (default 0). Behind an ingress with 0, `req.ip` is the proxy, so the per-IP limiters share one bucket for all users; a value that is too large lets clients spoof `X-Forwarded-For` | No code change. Document that `TRUST_PROXY_HOPS` must equal the exact hop count of the deployment (owner knows the ingress chain). Optional: log a warning at start when `NODE_ENV=production` and the value is 0. The per-user upload and write limiters do not depend on it | Docs: none. Warning: low | Config test for the warning condition |

## 4. Email verification (backend side)

**How it is exposed.** In the installed `@stackframe/stack-shared@2.8.48`, `AccessToken.payload` (`dist/sessions.d.ts`) is typed with `email: string | null`, `email_verified: boolean`, `is_anonymous: boolean`, `role: "authenticated"`, `sub`, `selected_team_id`. A verified token therefore carries a required boolean `email_verified` claim. The backend verifies the JWT with `jose`, so it can read `payload.email_verified` directly (no SDK needed). Not verified against a real token from a real Stack project.

**What `requireVerifiedEmail` needs.**
1. `TokenVerifier` (`lib/stackAuth.ts`) returns `{ userId, emailVerified: payload.email_verified === true }` (missing or non-boolean means false).
2. `requireAuth` stores it on `req.auth` (type declaration in `middleware/auth.ts`).
3. New middleware `requireVerifiedEmail`: if `!req.auth.emailVerified`, respond `403 { error: "Email verification required" }` (distinct from 401 so the frontend shows the verify-email screen instead of signing the user out).
4. Caveat: the claim is a snapshot at token issue time. After the user verifies, the current short-lived access token still says false until it is refreshed, so the frontend must refresh the token after verification. The alternative (reading the synced user row in `neon_auth.users_sync`) costs a DB query per request and is not proposed.
5. Tests: token with `email_verified: false` gets 403 on gated routes and 200 on ungated routes; missing claim is treated as false.

**Proposed gating (for Security Engineer review).**

| Action | Require verified email? | Reasoning |
|---|---|---|
| `GET /me/consent`, `POST /me/consent` | No | Needed during onboarding, before or while verifying; about the account, not content |
| `GET /albums`, `GET /collections`, `GET /images/collection/:id` (own data) | No | Reads of the user's own data; nothing is exposed to others; gating would lock users out of their data |
| Sign-out, token refresh | No | Handled by Stack Auth, not this backend |
| `POST /albums`, `POST /collections` (create) | Optional (owner decision) | Low abuse impact; gating reduces throwaway-account spam at the cost of friction. Suggest gating create only |
| `PUT` and `DELETE` on albums and collections | No | Own-data management must stay possible |
| `POST /images/upload/:collectionId` | Yes | Consumes paid storage and bandwidth; the main abuse vector |
| `DELETE /images/:id` | No | Own-data cleanup must always be possible |
| Future sharing or public link feature | Yes | Exposes content to third parties; needs an accountable identity |
| Future email change or data export | Yes (plus recent sign-in) | Sensitive account actions |

Enforcement is NOT implemented. Open owner question: is email verification mandatory in the Stack project settings? If so, the claim is always true for valid sessions and the middleware is defense in depth.
