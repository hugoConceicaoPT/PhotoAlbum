# AI Team Assessment — PhotoAlbum (PhotoMemory)

_Date: 2026-11-14 · Method: read-only analysis (file reads, `git` history, `npm audit`, `tsc --noEmit`). No application code was changed and no agents/skills were created._

> **Status: PROPOSAL — awaiting approval.** Nothing in `.claude/` exists yet.

---

## 1. Current architecture

### 1.1 Repository structure
Two independent npm projects in one repo (no workspaces, no root `package.json`):

```
PhotoAlbum/
├── backend/    Express 5 + TypeScript (ESM), Neon/Postgres, Cloudinary, multer
│   ├── server.ts            app creation + listen(5000) in the same file
│   ├── config/db.ts         neon() client from DATABASE_URL
│   ├── models/              album.ts, collection.ts, image.ts (SQL + table creation)
│   ├── routes/              albumRoute, collectionRoute, imageRoute, userRoute (empty)
│   ├── migrations/migrate.ts  calls the three createXTable() functions
│   └── uploads/             multer temp dir — 3 real image files are committed to git
├── frontend/   React 19 + Vite (rolldown-vite) + TypeScript + Bootstrap 5
│   └── src/ App.tsx, main.tsx, stack.ts, config.ts, Album.ts/Collection.ts/Image.ts (API clients),
│           pages/{Home,Album}.tsx, components/{Navbar,AlbumCard}.tsx, css/index.css
├── assets/architecture0.1.jpg
└── .github/workflows/  backend-ci.yml, fronted-ci.yml (exist on origin/main; see note below)
```
Branches: `main`, `dev`, `feature/*`. PRs target `dev`. 23 commits. Current checkout is a **detached HEAD** that does not contain `.github/` (it is on `origin/main`).

### 1.2 Backend
- Express 5, `"type": "module"`, compiled with `tsc` to `dist/`, run with `nodemon dist/server.js`.
- **No layering**: routes call model functions that contain raw SQL directly. No services, validation layer, error middleware, or logger (uses `console.log`).
- Port **hard-coded to 5000** (README says `PORT` env var — not used).
- DB access through **`@neondatabase/serverless` `neon()`** (HTTP driver, tagged-template queries → parameterised, so SQL injection is not a concern). `pg` is a dependency but is **unused**.
- Images: multer saves to `uploads/` → uploaded to Cloudinary as `type: "authenticated"` → row stored in `Image`; local temp file deleted in `finally`.
- Unused: `@stackframe/js` (Neon Auth server SDK) is installed but not imported anywhere.

### 1.3 Frontend
- React 19, `react-router-dom` 7, Bootstrap 5 + a 255-line global CSS file. No state library, no data-fetching library.
- Routes: `/*` → Stack Auth `StackHandler` (sign-in/up pages), `/` → Home, `/Albums` → Album page.
- API access via classes `WorkerAlbum / WorkerCollection / WorkerImage` using `fetch` (naming and pattern are consistent; keep it).
- Auth: **Neon Auth / Stack Auth** (`@stackframe/react`, cookie token store).
- Navbar and Home are static (login/register links are `href="#"`, not wired to Stack).

### 1.4 TypeScript configuration
| | Backend | Frontend |
|---|---|---|
| strict | ✅ (+`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | ✅ (+`noUnusedLocals/Parameters`, `erasableSyntaxOnly`) |
| module resolution | `node` with `module: ESNext` (inconsistent for ESM — `NodeNext` is the correct pairing; currently works because imports use `.js` suffixes) | `bundler` |
| target | ES6 (old) | ES2022 |
| oddities | `"types": []` while using Node globals; `jsx` set though unused; no `rootDir` | project references (app + node) |
| Type-check result | ✅ `tsc --noEmit` clean | ✅ `tsc -b --noEmit` clean |

Weak typing in practice: model interfaces say `id: number` but DB uses UUID (`string`); `Collection.album_id: number`; frontend interfaces have the same number-vs-UUID mismatch; `req.body` is untyped `any`.

### 1.5 Database schema & migrations
Postgres on **Neon**. Tables (all `CREATE TABLE IF NOT EXISTS`):

```
neon_auth.users_sync (managed by Neon Auth)   id TEXT
   └─< Album(id UUID PK, name, user_id TEXT FK→users_sync ON DELETE CASCADE, created_at, updated_at)
        └─< Collection(id UUID PK, album_id FK ON DELETE CASCADE, name, description, begin_date, end_date, ...)
             └─< Image(id UUID PK, collection_id FK ON DELETE CASCADE, image_url, public_id, created_at)
```
Migration "system": `migrate.ts` runs the create-table functions, and `server.ts` imports it **only when `NODE_ENV=development`**. Consequences: no versioning, no history, no down/rollback, no way to alter a column, **no production migration path**, and the schema depends on `neon_auth.users_sync` already existing (a plain local Postgres will fail). No indexes on FK columns (`album.user_id`, `collection.album_id`, `image.collection_id`). No unique/length constraints.

### 1.6 Authentication & authorization (summary — details in §4)
- Authentication exists **only in the browser** (Stack Auth). The backend never verifies a token.
- Authorization: **none**. `user_id` is taken from the request body/URL.

### 1.7 API endpoints
Base: `http://localhost:5000` (no `/api` prefix, no versioning).

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/` | hello | none |
| GET | `/db-version` | returns Postgres version | none (information disclosure) |
| POST | `/albums` | create `{name, user_id}` | none |
| GET | `/albums/user/:userId` | list user's albums | none |
| PUT | `/albums/:id` | rename | none |
| DELETE | `/albums/:id` | delete | none |
| GET | `/collections/album/:albumId` | list | none |
| GET | `/collections/user/:userId` | list all for user | none |
| GET | `/collections/:id` | get one | none |
| POST | `/collections` | create | none |
| PUT | `/collections/:id` | partial update | none |
| DELETE | `/collections/:id` | delete | none |
| GET | `/images/collection/:collectionId` | list + 1h signed Cloudinary URLs | none |
| POST | `/images/upload/:collectionId` | multi-upload (≤10) | none |
| DELETE | `/images/:id` | delete | none |

`/users` router file exists but is empty and unmounted.

### 1.8 Dependencies (notable)
- **Backend:** express 5.1, cors, dotenv 17, multer 2, cloudinary 2, @neondatabase/serverless, pg (unused), @stackframe/js (unused). Dev: jest 30 + **ts-jest 29** (major-version mismatch), nodemon, eslint 9, ts-node.
- **Frontend:** react 19, react-router-dom 7, bootstrap 5, @stackframe/react + **@stackframe/stack** (the latter is the Next.js package; likely unnecessary and pulls in `next`, `sharp`, AWS SDK), vitest 4, rolldown-vite 7.1.14 (experimental Vite replacement, pinned via `overrides`).

### 1.9 Build, CI/CD and deployment
- **CI (GitHub Actions, two workflows):** on push to `feature/**` and PRs to `dev`, path-filtered; Node 22; `npm ci` → lint → test (`--if-present`) → build. Workflow file `fronted-ci.yml` has a typo in its name ("fronted").
- **Gaps:** no CI on PRs to `main`; no `npm audit`/CodeQL/secret scanning; no DB service; tests are effectively skipped (`jest --passWithNoTests`, `vitest run --passWithNoTests`).
- **Deployment: none defined** (no Dockerfile, no deploy workflow, no hosting config). The frontend's `config.ts` hard-codes `http://localhost:8080`.
- Local tooling available on this machine: Node 22, npm 10, **Docker** and **PostgreSQL 17 client** both installed.

---

## 2. Existing functionality

- Backend CRUD for Album / Collection / Image exists and type-checks.
- Cloudinary upload of up to 10 images, stored as authenticated assets; signed URLs generated on read; DB row ↔ Cloudinary asset deletion; empty-folder cleanup.
- Frontend: Stack Auth sign-in/up handler routes; Home landing page; Albums page rendering a collage card per album (1–5 image layouts) assembled from albums → collections → images.

## 3. Missing functionality / defects found

**Missing (relative to a usable product; confirm against Figma):**
1. Backend auth verification and ownership checks (the single biggest gap).
2. Frontend: create/rename/delete album UI, collections pages, image upload/gallery UI, drag-and-drop reordering (advertised on Home but there is no `position` column or endpoint), login/register/logout wiring in the Navbar, protected routes, loading/error/empty states, accessibility (alt text, labels).
3. Backend: pagination, input validation, `GET /albums/:id`, image reorder, deployment config, versioned migrations, `PORT` env.
4. Tests of any kind (see §5), API docs, Dockerfile/deploy pipeline, `.env.example` files.

**Concrete bugs / inconsistencies (found by reading, not yet reproduced):**
| # | Where | Issue |
|---|---|---|
| B1 | `frontend/src/config.ts` | API base is `localhost:8080` — that is the **Vite dev server port**; the API listens on 5000. Frontend calls hit itself. |
| B2 | `pages/Album.tsx` | `userId = 1` hard-coded; DB `user_id` is a Stack Auth TEXT id, so no albums will ever match. Page also lacks error handling (`loadAlbums()` unhandled rejection). |
| B3 | `Album.ts: getAlbum` | Calls `GET /albums/:id` which does not exist on the backend. |
| B4 | `models/collection.ts: insertCollection` | Does not `return` the inserted row → `POST /collections` responds `201` with an empty body. |
| B5 | `models/collection.ts: updateCollection` | `COALESCE(param, col)` means a field can never be cleared to `NULL`. |
| B6 | `routes/imageRoute.ts` | Stores `uploadResult.secure_url` as `image_url`, but assets are `type: "authenticated"`; the Album page renders `image_url` (not `signed_url`) → likely broken/forbidden images. |
| B7 | `routes/imageRoute.ts: DELETE` | `cloudinary.uploader.destroy(public_id)` without `{ type: "authenticated" }` likely fails to delete the asset; DB row is deleted anyway → orphaned Cloudinary files. Folder name derived via `split("/")[1]` is fragile. |
| B8 | `routes/imageRoute.ts: upload` | `return res.status(400)` inside the loop after partial uploads leaves earlier images uploaded; folder name from user-controlled collection name only replaces whitespace. |
| B9 | `models/*.ts` | UUID columns typed as `number` in TS (backend and frontend). Delete endpoints return success even if nothing was deleted. |
| B10 | `Home.tsx` | JSX uses HTML attributes `stroke-linecap`, `fill-rule` (should be camelCase) → React warnings. `Collection.ts` contains a stray `deleteAlbum`. |
| B11 | `server.ts` | `listen()` at import time and no exported `app` → not testable with supertest. |
| B12 | repo hygiene | Uploaded images committed under `backend/uploads/`; `dist/` ignored only at root pattern; stray root `node_modules/`; README is outdated (root `npm install`, root `.env`, `PORT`). |

---

## 4. Security findings

Severity: 🔴 critical · 🟠 high · 🟡 medium · 🔵 low. Verified by code reading + `npm audit`; none exploited.

### 4.1 Authentication & authorization
- 🔴 **S1 – No backend authentication.** Every endpoint is public. Stack Auth protects only the UI.
- 🔴 **S2 – Broken object-level authorization (IDOR).** `user_id` comes from the body/URL; album/collection/image IDs are never checked against the caller. Anyone can list, create, rename or delete any user's data and delete Cloudinary assets by guessing/obtaining a UUID.
- 🟠 **S3 – Upload/read by collection ID without ownership check**, including signed-URL generation for anybody's collection.
- **Fix direction:** verify the Stack Auth access token (JWT, via `@stackframe/js` or JWKS) in middleware; derive `user_id` from the token only; add ownership joins (`Collection → Album.user_id`) to every query; return 404 for non-owned resources.

### 4.2 API security
- 🟠 **S4 – `cors()` allows every origin**; with future cookie/header auth, restrict to the frontend origin.
- 🟠 **S5 – Upload hardening absent:** no file-size limit, no MIME/magic-byte check, no total count per user, temp files on local disk. (multer `^2` is itself flagged high by `npm audit`.)
- 🟡 **S6 – No input validation** (types, lengths, UUID format, date format); malformed UUIDs cause 500s from Postgres. `PUT /collections/:id` passes the whole `req.body` through.
- 🟡 **S7 – No rate limiting, no `helmet`, no request-size limit** beyond Express defaults.
- 🟡 **S8 – Information disclosure:** `GET /db-version` is public; raw errors logged with `console.error`, no structured logging.
- 🔵 **S9 – Cloudinary folder naming** uses unsanitised user text.

### 4.3 Database security
- 🟡 **S10 – `.env` documents a "Database owner connection string"** — the app should use a least-privilege role, not the owner (DDL rights at runtime).
- 🟡 **S11 – Auto-DDL on boot** in development mode with the owner role; no migration review step.
- 🔵 **S12 – No row-level security**, no indexes, no `CHECK` constraints (e.g. `end_date >= begin_date`, name length).
- ✅ Parameterised queries throughout (tagged templates) — no SQL injection found.

### 4.4 Dependency vulnerabilities (`npm audit`, 2026-11-14)
| Project | Total | Critical | High | Moderate | Low |
|---|---|---|---|---|---|
| backend | 48 | 3 | 12 | 22 | 11 |
| frontend | 45 | 3 | 14 | 22 | 6 |

Direct dependencies flagged: backend → **multer (high)**, `@stackframe/js`, jest, ts-jest; frontend → **react-router-dom (high)**, **vitest (critical, dev-only)**, `@stackframe/react`, `@stackframe/stack`. Transitive critical: `fast-xml-parser`, `handlebars`, `proxy-addr`, `next`. Many are transitive through the Stack SDKs (AWS SDK, `next`, `sharp`) — removing the unneeded `@stackframe/stack` may eliminate a large share. Triage needed (`npm audit` over-reports for dev-only paths) — assign to Security Engineer.

### 4.5 Environment & configuration
- ✅ `.env` is git-ignored and not tracked (checked `git ls-files`; I listed only variable **names**, not values). Backend: `DATABASE_URL`, `NODE_ENV`, `CLOUDINARY_*`. Frontend: `VITE_STACK_*`, and a `STACK_SECRET_SERVER_KEY` line sitting in the **frontend** `.env`.
- 🟠 **S13 – Server secret in the frontend env file.** Vite only exposes `VITE_`-prefixed vars so it is not bundled today, but it is one rename away from being shipped to browsers. Move it to the backend env.
- 🟡 **S14 – `.gitignore` is root-only and minimal** (`/node_modules/`, `.env`, `dist/`, `/backend/node_modules`); `backend/uploads/*` is not ignored and already contains committed user-like files.
- 🟡 **S15 – No `.env.example`, no startup env validation** (`process.env.DATABASE_URL!` crashes obscurely when missing).
- 🔵 **S16 – No secret scanning / Dependabot** configured. Recommend rotating Cloudinary & Stack keys if the repo was ever public with those files.

---

## 5. Testing assessment & recommendations

### 5.1 What exists today
| Layer | Status |
|---|---|
| Unit tests | **None.** Zero `*.test.*`/`*.spec.*` files. |
| Integration tests | **None.** |
| E2E tests | **None** (no Playwright/Cypress). |
| Tooling | Backend: `jest` 30 + `ts-jest` 29 + `@types/jest`, **no jest config** (ESM + ts-jest will not work out of the box). Frontend: `vitest` 4 only — no `jsdom`, no Testing Library, no MSW. |
| CI | Runs `npm test --if-present` → passes vacuously (`--passWithNoTests`). |

### 5.2 Blocking facts for an isolated Postgres test DB
1. **`neon()` speaks HTTP to a Neon proxy, not the Postgres wire protocol.** It cannot connect to a plain `postgres:17` container. Options:
   - **(Recommended)** Make `config/db.ts` pick the driver by environment: `neon()` in dev/prod, `pg` Pool (already installed) for tests — behind one `sql` tagged-template-compatible adapter. Tagged-template syntax can be preserved with a tiny wrapper (`pool.query(text, values)`).
   - Alternative: Neon-compatible local HTTP proxy (`ghcr.io/timowilhelm/local-neon-http-proxy`) — keeps the driver untouched but is a third-party image and extra moving part.
   - Alternative: Neon test branches per CI run — realistic but needs secrets, network and cost.
2. **`neon_auth.users_sync` doesn't exist locally.** The test setup must create a stub schema `neon_auth` with `users_sync(id text primary key, ...)`.
3. **`server.ts` can't be imported without starting a listener**, so split into `app.ts` (exports app) and `server.ts` (listens).
4. Migrations must be callable without `NODE_ENV=development` side-effects.

### 5.3 Recommended architecture (test pyramid)
| Layer | Tool | Scope | DB |
|---|---|---|---|
| Backend unit | Vitest or Jest (ESM) | validators, auth middleware (with mocked JWT), pure helpers | none |
| Backend integration (**main investment**) | Jest/Vitest + **supertest** + real Postgres | every route incl. auth/ownership matrix; Cloudinary mocked | `postgres:17` via **Testcontainers** (local) / GitHub Actions `services: postgres` (CI) |
| Frontend unit/component | **Vitest + @testing-library/react + jsdom** + **MSW** | API client classes, AlbumCard layouts, pages with mocked network | none |
| E2E | **Playwright** | login → create album → upload → view → delete; run against real backend + test DB; Stack Auth test user or a test-only auth bypass | isolated DB |
| Static | `tsc --noEmit`, ESLint, `npm audit` | both packages | — |

Recommendation: **standardise on Vitest in both packages** (the frontend already has it, it handles ESM/TS natively, and it removes the jest 30/ts-jest 29 mismatch and ESM config pain). Keep this decision open for your approval.

**Isolated test DB recipes** (choose one in implementation):
- *Local:* `docker run --rm -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:17` (or Testcontainers, which does this programmatically and picks a random port); `DATABASE_URL_TEST=postgres://postgres:test@localhost:54329/photoalbum_test`. Never reuse the Neon `DATABASE_URL`.
- *Per test-file isolation:* `CREATE DATABASE test_<worker>` from a template DB, or wrap each test in a transaction + rollback / `TRUNCATE ... CASCADE` in `beforeEach`.
- *CI:* `services: postgres:17` in the workflow with a health check; guard in test setup that refuses to run if the URL host isn't `localhost`/`127.0.0.1` (prevents wiping the real DB).

---

## 6. Recommended agent architecture

### 6.1 Concepts (how this maps to Claude Code)
- **Subagent** = a markdown file in `.claude/agents/<name>.md` with YAML frontmatter (`name`, `description`, `tools`, `model`, `skills`) and a system prompt. It runs in its **own context window**, so noisy work (test output, big diffs, audits) doesn't pollute the main conversation, and it can be limited to specific tools. The `description` is what Claude reads to decide when to delegate.
- **Skill** = a folder `.claude/skills/<skill-name>/SKILL.md` (+ optional scripts/templates). It is a **reusable procedure/checklist** loaded on demand (progressive disclosure: only name+description are always in context). Agents *use* skills; skills don't have their own context. Rule of thumb: *agent = who/with which permissions; skill = how to do a specific task well.*
- **MCP (Model Context Protocol)** = external tool servers (Figma, Trello, a Postgres server, Playwright...) that add tools to Claude. Agents get MCP tools through their `tools` list (inherit by default). Skills often *orchestrate* MCP tools (e.g. "design-to-code" uses Figma MCP). Your session already has **Figma** and **Trello** connectors available.
- **Project vs user scope:** put them in `.claude/` (committed) so the team and CI share them; keep personal ones in `~/.claude/`.
- **Hooks/settings** (`.claude/settings.json`) enforce rules deterministically (e.g. block edits to `.env`, run `tsc` after edits) — Skills/prompts are advisory; hooks are enforced.

### 6.2 Agent definitions

| | **frontend-engineer** | **qa-engineer** | **security-engineer** |
|---|---|---|---|
| Mission | Implement Figma designs as React+TS UI wired to the API | Own test strategy, write/maintain tests, find bugs | Find and fix security issues; guard auth/data/dependencies |
| Write scope | `frontend/src/**`, `frontend/public/**` | `**/*.test.*`, `frontend/e2e/**`, `backend/tests/**`, test configs, CI test jobs | Read-everything; may edit auth middleware, config, CI security jobs, dependency versions (after review) |
| Tools | Read, Edit, Write, Glob, Grep, Bash (npm/tsc/vite), Figma MCP, browser/Playwright MCP | Read, Edit, Write, Glob, Grep, Bash (npm, docker, psql) | Read, Grep, Glob, Bash (npm audit, git log, semgrep if installed); Edit limited by instruction + hook |
| Model | Sonnet (default) | Sonnet | Opus for deep review; Sonnet for routine scans |
| Must never | Change backend/DB; invent designs not in Figma; put secrets in `VITE_*` | Edit production code to make tests pass (report a bug instead); hit the real Neon DB | Weaken auth for convenience; print secret values |
| Output | PR-ready components + notes on Figma deviations | Test report: pass/fail, coverage, bug list with repro | Findings table (severity, evidence, fix) + fixes |

### 6.3 Skills per agent
Skills are intentionally small and single-purpose.

**frontend-engineer**
- `figma-to-react` — fetch node via Figma MCP (`get_design_context`, `get_screenshot`, `get_variable_defs`), map to Bootstrap/existing components & CSS tokens, adapt (don't paste) generated code.
- `react-component-conventions` — folder layout, TS strictness (UUID = `string`), Worker-class API pattern, no `any`, a11y checklist (alt, labels, focus), Portuguese UI copy.
- `api-client-integration` — add/modify `WorkerX` classes, base URL from `VITE_API_URL`, auth header from Stack token, error/loading/empty states.
- `frontend-verify` — run `tsc -b`, `eslint`, `vite build`, Vitest; visual check against the Figma screenshot.

**qa-engineer**
- `test-strategy-and-plan` — derive test cases from endpoints/user stories; choose pyramid layer; coverage targets.
- `backend-integration-tests` — supertest + isolated Postgres (Testcontainers/CI service), fixtures, auth matrix (owner / other user / anonymous), Cloudinary mock.
- `frontend-component-tests` — Vitest + Testing Library + MSW patterns for pages/Worker classes.
- `e2e-playwright` — Playwright config, auth state fixtures, seeded DB, trace on failure.
- `test-db-setup` — scripts to start/stop/reset the test DB and the `neon_auth.users_sync` stub; safety guard against real DB URLs.
- `bug-report` — reproducible bug template (steps, expected, actual, evidence, suspected file).

**security-engineer**
- `auth-and-authz-review` — checklist: token verification, ownership on every query, IDOR matrix, CORS.
- `api-hardening` — validation (zod), helmet, rate-limit, upload limits/magic-byte checks, error handling.
- `dependency-audit` — `npm audit` triage (prod vs dev, reachable vs transitive), upgrade plan, Dependabot config.
- `secrets-and-env-review` — scan tracked files/history for secrets, `.env.example`, env validation, key-rotation steps (never prints values).
- `db-security-review` — least-privilege role, migrations review, constraints/indexes, RLS evaluation.
- `security-report` — standard findings format (matches §4).

**Shared:** `repo-conventions` (branching: `feature/*` → PR to `dev`; commit style; CI must be green) — referenced by all three agents.

### 6.4 MCP servers worth connecting
- **Figma** (already available) → frontend-engineer.
- **Playwright MCP** (optional) → lets frontend/QA drive a real browser for visual checks. Playwright CLI/tests work without it.
- **Postgres MCP** — *not recommended* for now; direct `psql`/Docker via Bash against the test DB is simpler and safer. Never point an MCP at the Neon production DB.
- **Trello** (already available) → optional: QA/security can file bugs as cards.

### 6.5 Guardrails (settings/hooks — proposed)
Deny-list `Read(.env*)` for agents and block `Edit` on `.env*`; `permissions` allow only the needed `Bash(npm *)`, `Bash(docker *)`, `Bash(psql *)`; `PostToolUse` hook running `tsc --noEmit` for changed package; per-agent `tools:` allow-lists enforce the write-scope table above.

---

## 7. Recommended implementation sequence

Each phase ends with a human checkpoint (you approve before the next).

| Phase | Work | Why this order |
|---|---|---|
| 0 | **Approve this assessment.** Provide the **Figma file URL** (not found in the repo) and decide: Vitest-in-both vs Jest-in-backend; Neon driver strategy (§5.2). | Decisions shape everything below. |
| 1 | Create `.claude/` scaffolding: `CLAUDE.md` (project facts, commands, conventions), 3 agent files, the shared + per-agent skills, `settings.json` guardrails. **No app code.** | Cheap, reversible, and gives agents context. |
| 2 | **Hygiene PR** (no behaviour change): `.env.example` ×2, root `.gitignore` for `uploads/`, `dist/`, untrack committed uploads, README fix, move `STACK_SECRET_SERVER_KEY`, rename workflow typo, pin/clean unused deps. | Removes landmines before others work. |
| 3 | **Testability refactor** (backend): split `app.ts`/`server.ts`, driver adapter (`neon`↔`pg`), env validation, real versioned migrations (e.g. `node-pg-migrate`) incl. `neon_auth` stub for tests. | Prerequisite for integration tests. |
| 4 | **QA agent:** test DB tooling + backend integration test skeleton + CI Postgres service; characterise current behaviour (incl. the §3 bugs as failing/skipped tests). | Safety net before touching auth. |
| 5 | **Security agent:** JWT verification middleware, ownership checks, CORS, validation, upload limits; dependency upgrades per audit triage. Tests from phase 4 flip from "documenting bug" to "enforcing fix". | Highest-risk gap; protected by tests. |
| 6 | **Frontend agent:** fix B1/B2/B3/B6 plumbing (API URL, real user id, signed URLs), then build screens from Figma page-by-page (Albums → Collections → Upload/Gallery → auth in Navbar). QA adds component tests per screen. | UI needs working authenticated API. |
| 7 | **E2E (Playwright)** for the core journey; add to CI (nightly + on PR to `main`). | E2E last: highest value only once flows are stable. |
| 8 | **Deployment pipeline** (choose host), `npm audit`/CodeQL/Dependabot in CI, protect `main`/`dev` branches. | Operational maturity. |

### Open questions for you
1. Figma file URL / which frames are in scope for the first release?
2. Where will this be deployed (Vercel/Render/Fly/…)? Affects Phase 8 and env handling.
3. Are the Cloudinary/Stack keys ever exposed outside your machine? (decides if rotation is needed.)
4. OK to standardise on Vitest and to introduce a `pg`-based test driver adapter?
5. Should agents be allowed to commit/open PRs, or only prepare changes for you?
