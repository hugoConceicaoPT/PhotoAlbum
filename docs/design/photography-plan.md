# Photographic Direction: Frontend Plan

_Date: 2026-11-15 · Author: Frontend Engineer · Status: **PLAN ONLY. Nothing here is approved for implementation until the owner approves it.** No code, test, asset, dependency or other document was changed to produce it. No Figma MCP call was made (no `get_design_context`); visual facts come from the screenshots in `assets/` and from the code. No browser was run._

Source tags used below: **[screenshot]** read from `assets/`, **[code]** read from `frontend/src`, **[contract]** `docs/api/albums-summaries-contract.md`, **[web]** an official licence page I fetched on 2026-11-15, **[proposal]** engineer proposal (not Figma, needs approval), **[unverified]** could not be checked here.

Dependency: the Backend Engineer's `docs/api/oci-object-storage-plan.md` **did not exist** when this was written. Everything that depends on image hosts, URL lifetime, renditions or upload limits is marked as a dependency (section 9).

---

## 1. Decisions recorded and conflicts check

| # | Owner decision | What it means for the implementation |
|---|---|---|
| 1 | **A: keep the Figma 2x2 album card and use real photographs** | `AlbumCard` keeps the 2x2 mosaic, the 4 px / 6 px gaps, 8 px / `--pm-radius-tile` radii and the aspect ratios (1.2 mobile, 1.3 desktop). Real cover photos fill the tiles. No single-large-cover, collage or carousel variant. |
| 2 | **A: fill the existing frames only, no composition change without approval** | Photos go only where an image or placeholder already exists (hero mock, auth-panel mock, album mosaic). Nothing is added to feature cards, footer, header, buttons or the "Novo álbum" tile. |
| 3 | **A: sample photos are demo content only, never shown as a real user's empty album** | Sample photos appear only in the marketing mock (Home, Login, Registar), which is a labelled-as-illustration mock, never inside `AlbumCard` or any data-driven view. A real album with 0 to 3 photos shows neutral empty tiles, never sample photos. |
| 4 | **A: confirm the proposed sample rules** | Legally usable images only, documented per image in a manifest, no identifiable faces without documented permission (section 4). Undocumentable image: rejected. |

Also valid: preserve approved Figma layouts, colours, typography, spacing and responsive behaviour; photos come from private storage through backend-authorised, short-lived URLs; the frontend never gets permanent public URLs and never hardcodes external image URLs.

### Conflicts check

**Decisions A mean NO deviation from Figma for the album card.** The card composition, tile count, gaps, radii and "N fotos" text stay as designed. The only behavioural additions (empty-tile style when a user has fewer than 4 photos, loading and error tile states) are states Figma does not draw, and are covered by the frontend's existing ownership of loading/empty/error states (`CLAUDE.md` Figma Rules).

Places where real photos could still conflict with the approved designs:

| # | Frame / place | What the design shows | What a real photo changes | Recommendation |
|---|---|---|---|---|
| C1 | Album card, `3:2` / `5:70` | Four tiles, always full, every tile a saturated colourful photo | Real albums with 0 to 3 photos leave empty tiles; real photos will be dull, dark or mixed orientation | Neutral lavender empty tile (section 3.2). Crop with `object-fit: cover` (centre). Accept that real covers will not match the palette. |
| C2 | Album card, `3:2` | Card meta "24 fotos · atualizado a 12 nov" | Existing deviation, not caused by photos: the code shows only "N fotos" because the old API had no date. The summaries contract now returns `lastActivityAt` | Out of photography scope, but the same migration (section 3) can restore the design text with `Intl.DateTimeFormat('pt-PT')`. Offered as an optional add-on in section 10 (Q9). |
| C3 | Hero mock, `2:22` / `5:18`; Login/Registar panel `9:22`, `9:80` | Four tiles with exact proportions: two small portrait tiles, one wide tile, one tall tile with the caption "Verão em Lisboa", each tile a smooth saturated gradient | Photos have detail, uneven brightness and busy edges; the amber panel (`#DF983B`) and white mock card are tuned for smooth gradients | Choose photos whose dominant colours resemble the four gradients (warm sunset, teal sea, deep dusk violet/orange, pink/yellow), soft detail, no text, no people. Compare against the screenshots before approval. |
| C4 | Hero mock caption "Verão em Lisboa" | The caption names a place | A photo that is clearly not Lisbon contradicts the caption | The large tile should be a Lisbon image (rooftops, tram or azulejo detail, no identifiable people). Do not change the caption (copy is design). |
| C5 | Home mobile mock `5:18` | Same four tiles, smaller (about 65 x 92 px portrait tiles, 135 x 65 landscape tile) | Detail in a landscape photo becomes unreadable at that size | Pick images with one clear subject; check at 390 px. |
| C6 | Coleções `3:90`, Criar coleção `4:2`/`6:2`, Editar álbum `4:92`, Ver álbum `4:211` | Gradient thumbnails and large photo slots | Out of scope (owner decision 2). When built, they use real data only | Do not seed sample photos there. See section 2. |
| C7 | Text over photos | None found in any frame: the caption "Verão em Lisboa" sits on the white mock card, not on the photo. Album names are below the mosaic | No contrast risk | Keep it that way. Do not overlay text on photos. |
| C8 | Mobile Álbuns `5:70` | Tiles about 74 x 62 px | Originals of several MB would be downloaded into a 74 px tile (the contract provides no thumbnails) | Not a visual conflict but the main performance risk: needs resized renditions from the backend (section 3.9, dependency D2). |

---

## 2. Inventory of every image or image placeholder

Method: grep of `frontend/src` for `<img`, `background-image`, `url(`, `picture`, `srcSet` (only `AlbumCard.tsx` line 23 has an `<img>`; the rest are inline SVG icons and CSS gradients) plus a read of every approved screenshot.

### 2.1 Places in scope

| # | Place (frame / file) | Today **[code]** | Design **[screenshot]** | Data source going forward | What the tiles map to | Rule |
|---|---|---|---|---|---|---|
| 1 | Home hero mock, desktop `2:22` (`pages/Home.tsx` `.pm-hero-panel`) | Four `<span>` CSS gradients (`--pm-grad-sunset/ocean/dusk/candy`), the "Verão em Lisboa" text, the "Álbum criado automaticamente" pill; wrapper is `aria-hidden` | Thumbs: two small portrait tiles top (about 88 x 126 px), one wide tile below (about 184 x 130), one tall tile right (about 184 x 235) with caption | **Local demo assets** (bundled by Vite) | T1 sunset portrait, T2 sea portrait, T3 dusk wide, T4 "Lisboa" tall | Demo-only rule (sec. 4). Decorative (`alt=""`), wrapper stays `aria-hidden`. The pill is not a photo; unchanged. |
| 2 | Home hero mock, mobile `5:18` | Same markup, smaller via CSS; the pill is hidden on mobile | Same four tiles, smaller | Same local assets (same files, `srcset` picks the smaller width) | Same | Same as 1 |
| 3 | Login and Registar amber panel, desktop `9:22`, `9:80` (`auth/AuthLayout.tsx`) | Identical mock markup, `aria-hidden`; caption "As tuas memórias, sempre à mão." | Same four tiles, 184 x 130 wide tile and 184 x 235 tall tile | Same local assets | Same | Same. Extract ONE shared `<AlbumSpreadMock />` component so Home and auth use identical markup (today the markup is duplicated). |
| 4 | Mobile Login and Registar `9:124`, `9:157` | No panel and no mock **[screenshot]** | None | None | None | Add nothing (decision 2). |
| 5 | Home feature cards `2:44` / `5:29` | Tinted icon box with an inline SVG (`GridIcon`, `MoveIcon`, `ImageIcon`) | Icon only, no photo (verified in both screenshots) | None | None | No photos. |
| 6 | Álbuns album cards, desktop `3:22`, mobile `5:80` (`components/AlbumCard.tsx`) | `album.images[i]` (URL strings) in four tiles; empty tiles are `.pm-mosaic-empty` lavender; `<img alt="" loading="lazy">`; the mosaic is `aria-hidden`; count = `images.length` | 2x2 mosaic, 6 px gap desktop / 4 px mobile, tile 158 x 121 desktop, 74 x 62 mobile | **Real API data only** (`coverImages` of `GET /albums/summaries`) | Tile 1 top-left = main cover, then row-major | Never demo photos (decision 3). Section 3. |
| 7 | Álbuns loading skeleton (`AlbumStates.tsx`) | Four pulsing lavender tiles | Not designed (frontend state) | None | None | Keep. |
| 8 | "Novo álbum" tile and FAB, mobile and desktop | Disabled placeholder, plus icon on a teal circle | Dashed tile, no photo | None | None | No photo. |
| 9 | Account menu and mobile avatar (`AccountMenu.tsx`, `MobileAccount.tsx`) | A user icon in a circle; **no profile photo, no `<img>`** **[code]** | Not designed (engineer proposal) | None. The API and Stack expose no avatar used by the app | None | No user photo. A future avatar is a separate owner decision (it would need upload, storage and moderation). |
| 10 | Logo mark | Inline SVG | Navy rounded square | None | None | Unchanged. |

### 2.2 Out-of-scope frames (listed so nothing is seeded by mistake)

| Frame | What it shows **[screenshot]** | When built, source |
|---|---|---|
| Coleções `3:90` / `5:142` | 52 x 52 rounded thumbnail per collection row | Real data (collection cover from the backend; a contract field does not exist yet) |
| Criar coleção `4:2` / `6:2` | Dropzone with three thumbnails and remove buttons, "3 fotografias" | Files the user just selected, previewed locally with `URL.createObjectURL` (revoked on unmount), never uploaded without consent |
| Editar álbum `4:92` / Editor `6:63` | Canvas spread, "Larga aqui uma foto" slot, page strip thumbnails | Real data |
| Ver álbum `4:211` / `6:153` | Dark viewer, spread, thumbnails | Real data |

Rule for all four: no sample photos, no pre-filled demo content.

### 2.3 Existing files found in `frontend/public/` (new finding)

`frontend/public/` contains tracked, unreferenced files: `image1.jpg` to `image5.jpg` (1.1, 4.4, 2.4, 3.2 and 6.3 MB; 2112x2816 to 6229x4672) and `camera_polaroid-removebg-preview.png` (2.2 MB). `grep` finds no reference in `frontend/src`, `index.html` or `vite.config.ts`. I opened the five JPEGs (project files, not external downloads): Eiffel Tower in black and white, a Vienna shopping street at dusk with **many identifiable people and visible shop brands** (Gerry Weber, Pandora, Versace, Nespresso, Fossil), a Madagascar road with two people on an ox cart, a cathedral from the air, and a rock formation.

Findings:
- **Provenance and licence are undocumented.** By the sample-photo rule (section 4.6) none of them can be used until documented.
- `image2.jpg` fails the rules regardless (identifiable people, third-party brands).
- Vite copies `public/` into `dist/`: roughly 19 MB of undocumented files would ship in the production build. The deletion or relocation is a **decision for the owner** (Q8): I did not touch them.

---

## 3. Album card integration plan (against the summaries contract)

### 3.1 Data model change

**[code]** today: `AlbumSummary { id, name, createdAt?, images: string[] }`, built by the N+1 loader `lib/loadAlbums.ts` from `GET /albums`, `GET /collections/album/:id` and `GET /images/collection/:id`, using the **deprecated `image_url`** field (the stored upload URL; the contract says it may not be signed and flags a possible security finding). This conflicts with the private-storage rule, so the migration is a prerequisite, not an option.

Proposed shape:

```ts
interface CoverImage { id: string; url: string; expiresAt: string }
interface AlbumSummary {
  id: AlbumId; name: string; createdAt?: string; lastActivityAt?: string | null;
  photoCount: number;            // authoritative count, NOT images.length
  coverImages: CoverImage[];     // 0..5, first = main cover
}
```

- Replace the N+1 loader with `GET /albums/summaries` through `apiFetch` (Bearer token, `private, no-store` response). `lib/loadAlbums.ts` is rewritten around the new endpoint and its tests are updated. Follow `nextCursor` until null (search and sorting are client-side, so all pages are needed; `limit` default 50, max 100). Show cards as pages arrive only if cheap; otherwise after the last page (decision: simplest first, keep skeleton until done).
- Validate the response at the boundary (type guard): drop covers without a string `id`, `url` or a parseable `expiresAt`; treat a missing `photoCount` as the number of covers. Unexpected shapes become the existing error state, never a crash.
- The `Image.ts` `IImage` interface keeps `image_url`; new code reads `url`/`expiresAt` only. Do not read `image_url`, `public_id` or `signed_url` anywhere in new code.

### 3.2 Tile mapping and photo counts

The four tiles are row-major: tile 1 top-left (main cover), 2 top-right, 3 bottom-left, 4 bottom-right.

| `coverImages` length | Tiles 1 to 4 | Notes |
|---|---|---|
| 0 | four neutral empty tiles | `photoCount` may still be > 0 (all covers failed signing, contract section 2); the text still says "N fotos" |
| 1 | photo, empty, empty, empty | The design is 2x2: do NOT enlarge a single photo (that would change the composition: needs approval, decision 2) |
| 2 | photo, photo, empty, empty | |
| 3 | photo x3, empty | |
| 4 | four photos | |
| 5 | first four photos; the **fifth is not rendered** | Not rendered means no request and no preload. Recommend asking the backend for `ALBUM_COVER_IMAGES=4` on this endpoint (a fifth URL costs signing work and payload for nothing). If the backend keeps 5, the fifth could serve as a one-shot replacement when a tile fails; I recommend not doing that in v1 (more state, little value). |

**Neutral empty tile [proposal, not from Figma]:** reuse what the app already has: background `--pm-tint-lavender` (`#ECEAFB`, sampled from Figma, already the empty/skeleton tile colour), same radius and aspect ratio as a photo tile, **static** (no animation), no icon, no text. The loading skeleton uses the same colour with the existing pulse; the pulse is what distinguishes "loading" from "empty". The tile is `aria-hidden`. Rejected alternatives: a camera icon in every empty tile (noisy on a 74 px tile), a gradient (would imitate a photo), sample photos (forbidden by decision 3).

**`photoCount` text:** `formatPhotoCount(photoCount)` from `lib/albums.ts` gives "1 foto", "N fotos" and "0 fotos" (pt-PT, existing function). Replace `album.images.length`. Optional: "· atualizado a 12 nov" from `lastActivityAt` (C2).

### 3.3 Image geometry and tokens (unchanged values)

Keep the existing CSS: `.pm-mosaic` gap 4 px (mobile) / 6 px (from `lg`), tile radius 8 px (mobile) / `--pm-radius-tile` 10 px (desktop), `aspect-ratio` 1.2 (mobile) / 1.3 (desktop), `object-fit: cover`, `object-position: center` (a focal-point field does not exist; open question only if cropping proves bad). These are `[by-eye]` values already in `tokens.css`; this plan adds none and does not verify them (pending `get_design_context`). Radius/gap/aspect tokens for the mosaic should move into `tokens.css` as named tokens (`--pm-mosaic-gap`, `--pm-mosaic-ratio`) while editing (pure refactor, same values).

**No layout shift:** each tile is a `span` that owns the aspect-ratio box and the lavender background; the `<img>` fills it (`position: absolute; inset: 0; width: 100%; height: 100%`). The box exists before any byte arrives, so nothing moves on load, error or URL swap. Natural width/height attributes are unknown (the originals vary), so the CSS aspect ratio is the guard.

### 3.4 Loading attributes

- `loading="lazy"` and `decoding="async"` on all tile images.
- Above the fold: only the **main cover of each card in the first visible row** (up to 2 on mobile, 3 on desktop) gets `loading="eager"` and `fetchpriority="high"`. Everything else lazy, `fetchpriority="auto"`. Marking all 12 as high would defeat the hint.
- `referrerpolicy="no-referrer"` and no `crossorigin` attribute (section 6).
- `sizes` is only useful if renditions exist (D2). Without them `srcset` cannot be offered because the API returns a single URL.

### 3.5 Per-tile state machine

State per tile: `loading` (lavender, image requested) to `loaded` (image faded in) or `failed` (neutral tile).

- `onLoad`: `loaded`. Opacity transition 150 ms; disabled under `prefers-reduced-motion` (the CSS already has a reduce block).
- `onError`: if no refetch was attempted for this cover id in this page lifetime, request ONE page refresh (3.6) and, when fresh data arrives, retry that tile once with the new URL. If it fails again, or the refetch fails, the tile stays `failed` (neutral). **Never loop:** per-cover-id counter `retried: boolean`, and a global single-flight plus a minimum 30 s gap between error-triggered refetches (one network error on 12 tiles must produce 1 refetch, not 12).
- A failed tile is silent for assistive technology (decorative). No error toast per image; the card still shows name and "N fotos".

### 3.6 URL expiry strategy

Contract: URLs live about 1 hour (ASSUMPTION) and `expiresAt` is per cover.

- After each successful load compute `earliest = min(expiresAt)` over the **rendered** covers (first four per card). Schedule one `setTimeout` at `earliest - 5 min` (with 0 to 30 s jitter, never less than 30 s from now). When it fires, refetch the summaries silently.
- **Pause when the tab is hidden:** on `visibilitychange` to hidden clear the timer; on visible, if `Date.now() >= earliest - 60 s` refetch immediately, otherwise reschedule. A background tab makes no requests.
- **Apply a silent refresh without flicker:** merge by album id and cover id. Tiles already `loaded` keep their current `src` (the pixels are painted and cached; swapping would re-download and flash). Only tiles that are `loading` (lazy, not yet scrolled to) or `failed` receive the new URL. The `expiresAt` bookkeeping is updated for all.
- Clock skew: compare against `Date.now()` with a 60 s safety margin. Never persist URLs or `expiresAt` in `localStorage`, `sessionStorage`, IndexedDB or a service worker (section 6).
- The refresh reuses the same cursor pagination and the same `AbortController` as the page; a navigation away aborts it and clears all timers (effect cleanup).

### 3.7 Errors: 503, 401, other

| Situation | Behaviour |
|---|---|
| Initial load 401 | Existing behaviour after `apiFetch`'s one retry with a fresh token: redirect to `/login` (the session is gone). |
| Background refresh 401 | Same as initial: after `apiFetch` already retried once, redirect to `/login`. Leave the visible covers in place until then. |
| 503 `Retry-After: 5` (JWKS unreachable), initial load | Retry automatically up to 3 times (5 s, 10 s, 20 s; honour `Retry-After` if larger), then the existing error panel "Não foi possível carregar os teus álbuns." with "Tentar novamente". **Never sign the user out and never redirect to `/login` on 503** (contract section 7). `ApiError` already carries `status`; it needs the `Retry-After` value added. |
| 503 or network error during background refresh | Keep showing existing data and covers, retry on the schedule above (backoff 5/10/20 s, then wait for the next timer or tab focus). No error UI for a failed silent refresh. |
| 400 on `limit` or `cursor` | Programming error: error state, console message without the URL. |
| 500 | Existing error state. |

### 3.8 Request count

- Before: 1 + A + C requests where A = albums and C = collections (N+1, 1 + 3 per album at least). After: **1 request per page of up to 50 albums** (normally 1).
- Image requests: 4 per album rendered, lazy except the first-row main covers. With 3 albums that is 12; with 50 albums it can be 200 over time. Lazy loading plus `fetchpriority` bound the burst. Bytes are the real risk (D2).
- Refresh adds 1 request per about 55 min while the tab is visible. The general rate limit (300 per 15 min per IP) is not approached.

### 3.9 Image size (critical dependency D2)

The contract says URLs point to the original upload and there are **no renditions** (section 4). A 6000x4000 photo of 5 MB loaded into a 74 x 62 px tile is not acceptable. This plan cannot fix it on the frontend. Needed from the backend (ask in the object-storage plan): a size-limited rendition per cover (for example `url` for a 480 px-wide WebP plus the original for the viewer), generated at upload time or on demand, with the same signing and expiry. Until then the card works but is heavy. Owner decision Q4.

### 3.10 Responsive behaviour

- 390 px: two-column grid (existing), 74 x 62 tiles, 4 px gap, no edit button, no "atualizado".
- 1280 px: three-column grid, 158 x 121 tiles, 6 px gap.
- 992 to 1279 px and below `lg` (576 to 991): the existing intermediate behaviour (mobile layout up to `lg`); tiles scale with the card width because they use `aspect-ratio`. No tablet design (owner decision).

### 3.11 Existing states preserved

Loading skeleton, error panel with "Tentar novamente", empty state "Ainda não tens álbuns", no-results state and the `role="status"` live message are unchanged. New: nothing user-visible in those states. The empty-state text says "Ainda não tens álbuns" only when there are zero albums; an album with no photos shows the album card with four empty tiles and "0 fotos" (never sample photos).

### 3.12 Files this phase would touch (when approved)

`lib/albums.ts` (types), `lib/loadAlbums.ts` and its test, new `lib/albumSummaries.ts` (fetch + validation + expiry scheduling hook), `pages/Album.tsx` (use the loader, remove the three worker instances that only served the N+1), `components/AlbumCard.tsx` and its test, new `components/CoverTile.tsx`, `AlbumStates.tsx` (unchanged markup), `css/index.css` and `css/tokens.css` (tile states and named tokens), `lib/apiClient.ts` (`Retry-After` on `ApiError`).

---

## 4. Sample photo plan (demo content only)

### 4.1 Where demo photos are used

Only the album-spread mock, which appears in **three** places with identical markup: Home hero (desktop and mobile), Login panel and Registar panel (desktop). No other place needs demo photos:
- feature cards, footer, header, tab bar, buttons: icons only (section 2).
- Álbuns: real data only (decision 3).
- Coleções, editor, viewer: out of scope and real data.

Justification for stopping there: the owner restricted photos to existing frames (decision 2) and forbids sample photos as stand-in user content (decision 3).

### 4.2 How many images

**Minimum: 4 photographs**, shared by all mock instances (the same four files; `srcset` serves the width that fits). This matches the four tiles in the design.

| Tile | Shape needed **[screenshot]** | Needed ratio | Colour intent (from the existing gradient it replaces) |
|---|---|---|---|
| T1 | small portrait (about 88 x 126) | about 0.7 | warm sunset: orange to magenta to violet (`--pm-grad-sunset`) |
| T2 | small portrait (about 88 x 126) | about 0.7 | cool sea: light blue to deep teal (`--pm-grad-ocean`) |
| T3 | wide (about 184 x 130) | about 1.4 | dusk: deep violet to orange (`--pm-grad-dusk`) |
| T4 | tall (about 184 x 235), caption "Verão em Lisboa" | about 0.78 | soft pink and yellow (`--pm-grad-candy`) |

So the mix is 3 portrait and 1 landscape. The mobile mock reuses the same files.

### 4.3 Categories and shot list (faces avoided)

The six approved categories, with the concrete subjects to look for. **Only the first four rows are needed now (they fill the mock).** Rows 5 to 8 cover the remaining categories as a reserve pool; they have no consumer today and I recommend **not** sourcing them until a place needs them (Q3).

| # | Category | Shot list (no identifiable faces) | Use now |
|---|---|---|---|
| 1 | Travel and holidays (T1) | Beach at sunset seen from behind or as a silhouette; coastline in warm light | T1 |
| 2 | Nature and landscapes (T2) | Turquoise sea or lake surface, aerial coast, no people | T2 |
| 3 | Nature and landscapes (T3) | Mountains or sky at dusk, violet and orange horizon | T3 |
| 4 | Travel (T4, Lisbon) | Lisbon rooftops, a tram, tiled facade detail at warm light, no identifiable people, no readable shop signs or brands | T4 |
| 5 | Weddings and anniversaries | Rings on a bouquet, hands holding flowers, table decoration, a candle-lit table | reserve |
| 6 | Family memories | A set family table without faces, hands around a dish, a picnic blanket from above | reserve |
| 7 | Birthdays and celebrations | Cake with candles, balloons, a gift, confetti detail | reserve |
| 8 | Friends and special occasions | Silhouettes against a sunset, clinking glasses (hands only), string lights | reserve |

The mock combines travel and nature because the design's caption is "Verão em Lisboa"; forcing weddings or birthdays into a Lisbon summer album would be incoherent. If the owner wants all six categories visible in demo content, that needs a place for them (for example a demo account seeded through the real upload path, Q3), not a change to the mock.

### 4.4 Allowed sources and licence terms (read from the official pages)

| Source | Official page read | What it allows **[web]** | What it forbids or leaves unaddressed **[web]** |
|---|---|---|---|
| **Unsplash** | https://unsplash.com/license (no date shown) | "All images can be downloaded and used for free"; commercial and non-commercial use, "No permission needed"; "to download, copy, modify, distribute, perform, and use"; attribution optional (credit encouraged) | "Images cannot be sold without significant modification"; no "compiling images from Unsplash to replicate a similar or competing service". **Not addressed: people, trademarks, property, model releases.** The page does not say whether a model release exists, so an image showing a person is undocumented unless proven. |
| **Pexels** | https://www.pexels.com/license/ (page shows only "© 2026 Pexels") | Free to download and use; attribution not required; modification allowed | "Identifiable people may not appear in a bad light or in a way that is offensive"; no implying endorsement by people or brands; no use as trade-mark or business name; no selling unaltered copies; no redistributing or selling on other stock or wallpaper platforms. **Not addressed:** recognisable brands beyond the endorsement rule, and compiling to replicate a similar service. |
| **Pixabay** | https://pixabay.com/service/license-summary/ (no date shown) | Free use; no attribution required; modify or adapt into new works | Cannot "sell or distribute Content" standalone (no creative effort applied); content with "recognisable people" must not be used in an immoral or illegal way; recognisable trademarks, logos or brands may not be used "for commercial purposes in relation to goods and services"; "It is your responsibility to check whether you require the consent of a third party"; no misleading or deceptive use; no use as part of a trade-mark. **Model releases are not mentioned.** |
| **Wikimedia Commons** | https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia (the `Reuse_of_content_outside_Wikimedia` address returned 404) | Each file has its own licence: attribution and share-alike apply to CC BY and CC BY-SA; for public domain "may not have a strict legal requirement of attribution", but attribution "is recommended to give correct provenance" | "Other restrictions may apply": trademarks, patents, personality rights, moral rights, privacy rights; "commercial use of images of people may require the explicit agreement of the subject" in some countries. The page I read does not discuss CC0 for media files. |

Reading of these terms for this project (engineer interpretation, **not legal advice** and **[unverified]** by a lawyer):
- "Redistribution inside a product": the images are bundled into the app and shipped to visitors as part of the user interface. The Unsplash, Pexels and Pixabay terms prohibit selling or distributing the content **as such** (unaltered, standalone); embedding it in the product UI is a different use, but the terms do not spell this out for a photo app, and a photo-album product sits close to "similar or competing service" wording on Unsplash. I did not find any of these four pages explicitly answering it. **Owner decision Q2** (accept the residual risk or have the owner confirm with the terms).
- Pexels and Pixabay both warn about people; Unsplash is silent. None provides a model release statement. Hence the no-identifiable-people rule (decision 4).
- Attribution is optional on Unsplash, Pexels and Pixabay but **the manifest records author and URL anyway**, and a credits line in the app is a cheap, polite default (Q2). CC BY / CC BY-SA from Wikimedia would make credit mandatory: I recommend **excluding CC BY-SA** (share-alike would complicate the product) and allowing only Wikimedia items that are public domain or CC0.
- AI-generated images are not part of this plan (no source terms were verified).

### 4.5 Manifest (one record per image)

A machine-readable `frontend/src/assets/demo/manifest.json` plus a short `README.md`, next to the files (proposed location, section 4.8). Fields:

| Field | Content |
|---|---|
| `id`, `file` | stable id (`demo-sunset-portrait`), file names of each variant |
| `sourceUrl` | the exact photo page URL |
| `author`, `authorUrl` | as shown on the source |
| `license`, `licenseUrl` | name and URL **of the page read on the download date** |
| `downloadDate` | ISO date |
| `originalDimensions`, `originalBytes` | from the downloaded file |
| `modifications` | crop, resize, format, colour changes (none to alter the scene content) |
| `people` | `none` or description; `modelRelease` = `not applicable` / `documented: <link>` / `unknown` (unknown means reject) |
| `trademarksOrProperty` | `none visible` or description (readable shop signs, logos, art: reject) |
| `description` | one-sentence description in pt-PT (doubles as the alt text if the mock ever becomes informative) |
| `usedIn` | tiles and places |
| `reviewedBy` | person who checked, and date |

### 4.6 Rejection rule

An image that cannot be fully documented (missing source, unclear licence, an identifiable face without a documented release, a readable brand, a minor, any doubt) is **rejected and replaced**, never kept "for now". A licence page that changed since the download date triggers a re-check.

### 4.7 Formats, sizes, budgets, no new dependency

- **Format:** WebP as the single delivery format; I believe it is supported by all current browsers **[unverified here: not checked against a compatibility table]**. If the owner wants a fallback for very old browsers, add a JPEG via `<picture>` (Q6). AVIF is optional and not recommended initially (more variants for little gain at these sizes).
- **Variants (width variants for `srcset` and `sizes`):** each photo exported at 2 widths: 1x and 2x of the largest displayed width. Largest displayed boxes: portrait tile 88 px (mock desktop hero) / 65 px (mobile); wide tile 184 px; tall tile 184 px. Proposed: small portraits 176 w and 352 w; wide tile 368 w and 736 w; tall tile 368 w and 736 w; `sizes` attribute matching the CSS box (`88px`, `184px`).
- **Byte budget:** per image at its largest variant at most 60 KB (WebP quality about 75), per page: all demo images on Home at most 150 KB transferred (four images at the variant that matches the viewport), and no demo image on the Álbuns route (not loaded there). No image bigger than 1 MB should ever enter the repository.
- **Producing them without a new dependency:** a one-off command-line conversion run locally (for example ImageMagick or `cwebp`, already installed on the owner's or my machine if available, or a temporary `npx` run in the scratchpad that is NOT added to `package.json`). The commands and tool versions are written into the manifest `modifications` field so the result is reproducible. **If neither tool is available and a package would be needed, that is an owner decision** (Q6), because `CLAUDE.md` forbids new dependencies without justification. Note: `sharp` already exists transitively in `node_modules` (through `@stackframe/stack`, which the doc says is itself unused): I would **not** rely on it, because that package may be removed.
- Everything is static. No runtime image processing in the app.

### 4.8 Where files live

- `frontend/src/assets/demo/` (new) containing the WebP files, `manifest.json` and `README.md`. Imported from a typed module `frontend/src/assets/demo/index.ts` using Vite asset imports, so they get **content-hashed file names** and are cacheable; they are bundled only for the routes that use them (dynamic import not needed: the mock is on Home and auth routes).
- **Not** `frontend/public/` (no hashing, always copied to `dist/`, unreferenced), **not** the repository-root `assets/` (those are design screenshots and must never be copied or served, `CLAUDE.md`), **no external URLs** anywhere.
- A unit test (section 8) asserts every file in the folder has a manifest record and every manifest record has a file.

### 4.9 Who obtains them and legal and ethical caveats

- **Recommendation:** the **owner** (or a person the owner trusts) picks the four photos from the allowed sources and supplies the files plus the source URLs, because the choice is aesthetic and legal, and because I would be downloading files from external services. **Or** the agent downloads them from the allowed sources after the owner approves this plan and the list of candidate pages (agent action, requires the owner's explicit approval in that task; downloads go to a scratch folder first, are inspected, then only the processed files are added). Q5.
- I did not download, fetch or search for any image binary in this task.
- Caveats: not legal advice; licence pages can change; a free licence does not remove personality, trademark or property rights; do not use photographs of minors; do not alter photographs to remove watermarks or brands; keep the original download untouched outside the repository.
- Landmarks: pictures of buildings and public monuments can raise rights questions in some countries (freedom of panorama varies); for Lisbon prefer generic views (rooftops, tram, tile detail) over modern architecture or art installations **[unverified: not researched]**.

---

## 5. Alt text and accessibility policy

### 5.1 Demo images (the mock)

**Decision: decorative.** Keep the whole mock wrapper `aria-hidden="true"` and every image `alt=""`. Reasoning: the mock illustrates what an album looks like; it carries no information not already in the adjacent text (hero copy, the auth heading); announcing four unrelated pictures plus "Verão em Lisboa" would add noise for screen-reader users and it is already hidden today **[code]**. The pill "Álbum criado automaticamente" is also inside the hidden region today; that is the existing behaviour and not changed here. The pt-PT description per image lives in the manifest, so if the owner later makes the mock informative, a real `alt` is ready (descriptive alt for each, caption exposed). `aria-hidden` on images that also have `alt=""` is redundant but harmless; keep the wrapper-level attribute.

### 5.2 User photos in album cards

The API has no per-photo alt or caption. Generated, localised text (pt-PT):

- **Mosaic (card, preview of several photos of one album):** one grouped item rather than four unnamed images. Recommended markup: the mosaic container gets `role="img"` and `aria-label="Pré-visualização das fotos do álbum {name}"`; the four tile elements and `<img alt="">` are presentational inside it. Rendered only when `coverImages.length >= 1`; with 0 covers the mosaic stays `aria-hidden` (the empty tiles say nothing and "0 fotos" is in the meta text). The album name is also the `h2`, so a screen-reader user hears the heading, the preview label and the count, in this order, without 4 repeated "photo of album" items.
- **Single photo contexts (future viewer, list of photos):** `alt="Foto {n} de {total} do álbum {name}"` (for example "Foto 2 de 24 do álbum Férias"). Pluralisation uses a small `pluralize` helper (the app has one in `lib/albums.ts`); "Foto 1 de 1" is fine. Never put the file name, id, URL or the storage key into `alt`.
- **API question for the owner (Q7):** an optional `alt` or `caption` field per image (user-supplied, optional, plain text, length-limited, escaped by React) would let the viewer and mosaic say something real. Not required for this plan.

### 5.3 Other accessibility rules

- **Focus and keyboard:** the mosaic is not interactive and not focusable (the card is not a link yet; the card has no click target in the design). Do not add `tabindex` to tiles. When "Ver álbum" exists, the link wraps the card or the title and the mosaic stays presentational.
- **Contrast:** no text over photos anywhere in the design (C7). If that changes, require a non-photographic backing or a 4.5:1 check against the worst-case pixel region.
- **Motion:** the fade-in and the skeleton pulse are disabled under `prefers-reduced-motion: reduce` (the CSS already has the media block for the skeleton; add the fade-in to it).
- **Loading and errors:** the existing `role="status"` live region announces loading; per-image failures are silent (they are not actionable).
- **Responsive and zoom:** tiles use `aspect-ratio`, so 200% zoom and text resize do not break the card; check at 390 px with 200% zoom.
- **Non-goals:** print styles and dark mode are out of scope (there is no dark theme in the designs).
- **Audit:** run an automated axe check (section 8) and a manual NVDA or VoiceOver pass on the Álbuns card (cannot be done by me here).

---

## 6. Privacy and security rules for the frontend

1. **Signed URLs are secrets with a lifetime.** Never persist them (`localStorage`, `sessionStorage`, IndexedDB, Cache API, service worker, cookies) and never include them in logs, error messages, analytics, `console.*`, test snapshots or screenshots committed to the repo. `console.error` for a failed tile logs the cover **id** only.
2. **No credentials on image requests:** no `crossorigin="use-credentials"`; plain `<img>` without `crossorigin` sends no cookies cross-site by default for simple image loads, and the pre-authorised URL needs none. The Bearer token is sent only to the API origin by `apiFetch` (unchanged), never to image hosts.
3. **`referrerpolicy="no-referrer"`** on every image (the URL host and path should not leak the app route, and the app URL should not reach the storage host).
4. **No external image hosts, no hardcoded external URLs.** Demo photos are bundled local files. User photos come only from backend responses. A runtime guard in the tile component accepts only `https:` URLs (and `http:` only in development) and refuses `data:` and `javascript:`; any other scheme gives the failed (neutral) tile.
5. **CSP implications (dependency D1):** `img-src` will need `'self'` (bundled demo files), `blob:` only if the Criar coleção preview is built, and the **OCI Object Storage host** used by the signed URLs. That host is **unknown** until the backend plan settles (regional endpoint versus custom domain). CSP is set at the frontend host, which is the owner's infrastructure; I only document the requirement. No CSP meta tag will be added by the app.
6. **Never show another user's images:** the frontend sends no user id; ownership is enforced by the backend from the token; the cache key for any in-memory data includes the current user id and is dropped on sign-out and on user change (the Álbuns page already reloads when `user.id` changes; keep that and clear covers when it changes).
7. **Never show sample photos for real data:** a test (section 8) asserts `AlbumCard` and every data-driven view never import from `assets/demo`; an ESLint `no-restricted-imports` rule is a cheap guard (it would be a config change, needs approval).
8. **Do not use `dangerouslySetInnerHTML`** and do not render `alt`, album names or any API string as HTML (React escapes; keep it that way).
9. **User-selected files** (future upload preview): `URL.createObjectURL` previews are revoked on unmount; file content is validated by the backend (magic bytes); the client check of type and size is only a convenience.
10. **Fonts and other third parties** (not photographic, noted): Google Fonts is a known privacy finding (F-08 in the security review); outside this plan.

---

## 7. Upload flow reality check

The owner wants QA to verify "the complete upload, album-cover and photo-display flows".

### 7.1 What exists today **[code]**

- **No upload UI.** "+ Adicionar álbum", the "Novo álbum" tile, the mobile FAB and the card edit button are disabled placeholders (`aria-disabled`, title "Brevemente"). Criar coleção, Editar álbum, Ver álbum and Coleções are not implemented (no routes, the nav item is disabled).
- Client classes exist but are unused by any screen: `WorkerAlbum.addAlbum(name)` (`POST /albums`), `WorkerCollection.addCollection(album_id, name, description, beginDate, endDate)` (`POST /collections`), `WorkerImage.uploadImages(collectionId, files)` (`POST /images/upload/:collectionId`, multipart field `images`, up to 10 files, `MAX_UPLOAD_BYTES` default 10 MB per file **[code, backend]**, content checked by magic bytes).
- The data chain is **album, then collection, then image**; there is no way to upload a photo without a collection, and a collection needs an album.

### 7.2 What can be verified without an upload screen

| Verifiable | How | Not verifiable |
|---|---|---|
| Create album, create collection, upload images, receive 201 and `images[]`, reject bad files (400/413), rate limit, ownership (404 for another user's collection) | **API-level** tests (HTTP client or Playwright's `request` fixture against a real backend) | Anything in the browser UI |
| That the uploaded images appear as covers in `GET /albums/summaries` with `coverImages`, `photoCount`, ordering (newest first) and a working signed URL | API-level, plus the browser opening the signed URL | The card showing them |
| The Álbuns card displaying real covers, empty tiles for 0 to 3 photos, error fallback and URL expiry | **UI level with the data seeded through the API** (QA uploads via API, then loads Álbuns in the browser): this verifies display, not the user's upload journey | The upload journey itself |
| The complete user flow "choose files, see progress, save, see them in the album" | **Cannot be verified**: the UI does not exist | all of it |

So QA can verify "upload" and "album cover" at API level and "photo display" at UI level with API-seeded data, but **not "the complete upload flow" as a user does it**, until a screen exists.

### 7.3 What the Criar coleção frames design and what is missing

Designed **[screenshot]** (`4:2` desktop, `6:2` mobile): breadcrumb, title, "Informação geral" (Nome, Descrição with counter, Data de início, Data de fim), "Álbum associado" (select "Escolhe um álbum", link "+ Criar novo álbum"), "Fotografias" dropzone ("Arrasta fotografias para aqui ou", "Adicionar mais imagens"), thumbnails with remove buttons, "3 fotografias", bottom bar "Cancelar" / "Guardar coleção". Mobile: header with close, photos row with a dashed "+" tile, fields, "Guardar coleção".

**Not designed (frontend would have to propose, flagged not-from-Figma):**
- Album creation itself: the frame only links to "+ Criar novo álbum"; no form or modal frame exists.
- Upload progress, per-file errors (wrong type, too large, 10-file limit), partial failure, success state and where the user lands after saving (Coleções does not exist).
- The empty state when the user has no albums (the select would be empty), the cancel-with-unsaved-changes confirmation, validation messages, loading and error states of "Guardar coleção".
- Verified-email gating for uploads (an open proposal: `403 Email verification required`).
- The ordering of calls (create collection, then upload images) and rollback or retry if the upload fails after the collection was created.

### 7.4 Minimal frontend work for an upload flow (estimate)

A route `/colecoes/nova` plus the Criar coleção screen (desktop and mobile from their frames), a minimal album-creation prompt (engineer proposal), file selection and local previews, sequential or batched upload with per-file status, error states, enabling the existing placeholders ("+ Adicionar álbum", FAB, "Novo álbum", "Coleções" nav item), tests. About **4 to 6 working days** frontend, plus a design review for the missing states. It also reopens the owner's earlier decision that Criar coleção is out of the first iteration.

### 7.5 OWNER DECISION: see Q1 (build the Criar coleção screen now, or verify uploads at API level only).

---

## 8. Test and QA plan

Status of tooling **[code]**: Vitest 4 and React Testing Library are installed; **Playwright and axe are not installed** in `frontend/package.json` (Playwright's browser could not launch in an earlier round of this project). Adding them is a dependency decision (Q10). Nothing below has been run.

### 8.1 Vitest and React Testing Library (jsdom)

| Test | Checks |
|---|---|
| `AlbumCard` with 0, 1, 2, 3, 4 and 5 covers | tile count is always 4; first four photos in order; fifth not rendered; empty tiles are not images; "0 fotos", "1 foto", "N fotos" come from `photoCount` (not from the number of covers) |
| Tile error fallback | `fireEvent.error` swaps to the neutral tile, triggers exactly one refresh, a second error stays neutral, no loop |
| Expiry refresh | fake timers: refetch scheduled at `earliest - 5 min`; paused when `document.hidden`; immediate refetch when visible and near expiry; loaded tiles keep their `src` after a refresh |
| 503, 401 | 503 retries with backoff and never navigates to `/login`; 401 redirects; error panel after the retries |
| Alt and a11y | mosaic `role="img"` with the album name label when there are covers; decorative otherwise; `alt=""` on tile images; no `tabindex` |
| Demo images | the mock renders `alt=""` images inside an `aria-hidden` wrapper; the mock is the same component in Home and `AuthLayout` |
| No sample photos on real data | `AlbumCard`/Álbuns never render an image whose `src` comes from `assets/demo`; manifest completeness (every file has a record and vice versa; no external URL strings in the source) |
| URL handling | refuses non-`https:` URLs; no URL or `expiresAt` in `localStorage`/`sessionStorage` after render |
| Loader | validates malformed summaries; follows `nextCursor`; cancels on unmount |

### 8.2 Playwright (needs the decision to add it and a working browser; not run)

- Visual comparison with `assets/Álbuns – proposed.png` and `Mobile · Álbuns.png`, and with the Home and Login mock, at 1280 and 390, using **mocked API** (`page.route`) and mocked image responses (generated test images, not real photos). Expect differences because real photos differ from gradients, so compare geometry (tile boxes, gaps, radii) rather than pixels.
- Layout shift: measure `layout-shift` entries (PerformanceObserver) and assert about 0 while covers load, fail and refresh.
- Image loading: first-row main covers eager with `fetchpriority=high`, the rest lazy; the request count; a failed image (route abort) shows the neutral tile and triggers one refresh.
- Network: delaying images shows the lavender tile first; 503 on `/albums/summaries` keeps the session.
- Accessibility: axe on Home, Login, Registar and Álbuns at both sizes; keyboard pass; reduced-motion emulation.
- Intermediate widths 992, 1100 and 1440: no horizontal scroll.

### 8.3 Needs a real backend and bucket (cannot be done with mocks)

Signed URL really loads and really expires; the private object is not readable without a signature; CORS and `Referrer-Policy` behaviour of the storage host; actual rendition sizes; the real byte weight of a page; upload of a real file end to end; the `image_url` question (whether the old stored URL works without a signature); 503 behaviour with a real key-source outage.

### 8.4 Manual

NVDA and VoiceOver on Álbuns and the mock; real-device check at 390 px; a visual review of the four demo photos against the screenshots by the owner.

---

## 9. Implementation phases

| Phase | Scope | Depends on | Size (frontend) | Risks | Definition of done |
|---|---|---|---|---|---|
| **P0** Owner approval | Decisions Q1 to Q10 | none | n/a | owner time | Answers recorded in this file or `figma-reference.md` |
| **P1** Real-data album covers | Summaries loader, new types, `AlbumCard` with 0 to 5 covers, empty tile, tile states, `photoCount`, expiry refresh, error and 503 handling, alt policy, tokens refactor | Backend: `GET /albums/summaries` deployed against a real DB (contract exists, **not verified against PostgreSQL**); **D2 renditions** (otherwise heavy pages); D1 for CSP | 3 to 4 days | N+1 removal changes behaviour; original-size images; URL lifetime unconfirmed (ASSUMPTION); cover ordering assumption | Vitest cases of section 8.1 pass; `tsc` and build pass; a manual run with seeded API data; screenshots at 390 and 1280 reviewed; no new dependency; docs updated |
| **P2** Demo photos in the mock | Source and document 4 images (owner or agent per Q5), process, manifest, shared `AlbumSpreadMock`, `<img>` with `srcset`/`sizes`, tokens fallback gradient while loading | P0 (Q2, Q3, Q5, Q6); legal sign-off | 1.5 to 2 days (+ sourcing) | Licence ambiguity; photos not matching the amber and white mock; bytes | Manifest complete for every file; budgets met (measured); the mock identical on Home, Login, Registar; screenshots compared; the old `frontend/public` files handled per Q8 |
| **P3** QA hardening | Playwright (if approved), axe, layout-shift, visual checks, API-level upload verification | P1 (+ P2); Playwright decision; a working browser; a real backend and bucket for section 8.3 | 2 to 3 days | Browser not launchable on this machine; flaky visual diffs | Reports separate executed, failed and not-run tests as `CLAUDE.md` requires |
| **P4 (optional)** Upload flow | Criar coleção screen, album-creation prompt, upload UI | Q1 yes; backend upload contract and `oci-object-storage-plan.md`; email-verification decision | 4 to 6 days | Design gaps (section 7.3); partial failures | Full journey tested in the browser with a real backend |

Backend dependencies list: **D1** storage host and image URL form (for CSP); **D2** resized renditions or thumbnails on `coverImages` (and ideally `ALBUM_COVER_IMAGES=4`); **D3** URL lifetime confirmation and clock-skew guidance; **D4** upload limits and error codes for P4; **D5** whether the stored `image_url` is publicly readable (a security finding if so).

---

## 10. Decisions needed from the owner

Ordered by priority.

**Q1. Upload flow**
- QUESTION: Do you want the Criar coleção (upload) screen built now, or should QA verify uploads at API level only?
- OPTIONS: (a) Build Criar coleção, a minimal album-creation prompt and enable the placeholders (4 to 6 days, needs your approval of the missing states in section 7.3); (b) API-level verification of upload and covers plus UI-level verification of display with API-seeded data; the user-facing upload journey stays unverified until later.
- RECOMMENDATION: (b) for this iteration, (a) next, because the display work (P1) does not depend on it and (a) needs design decisions you have not made. Do not describe (b) to anyone as "complete upload flow verified".
- BLOCKS: P4 and the QA claim "complete upload flow".

**Q2. Licence risk acceptance and credits**
- QUESTION: Are you comfortable with bundling photos from the free-licence sources in the product UI, given that none of the pages I read addresses use inside a photo-album product explicitly, and do you want a credits line in the app?
- OPTIONS: (a) Unsplash, Pexels and Pixabay (and public-domain or CC0 Wikimedia files only), with the manifest and a credits page; (b) the same without a visible credit; (c) you supply your own photographs (cleanest legally); (d) ask a lawyer first.
- RECOMMENDATION: (c) if you have four suitable photos without people, otherwise (a) with the manifest; the engineer's reading is not legal advice.
- BLOCKS: P2.

**Q3. Demo content scope**
- QUESTION: Is the four-photo mock enough, or do you want all six categories (weddings, family, birthdays, friends...) available as demo content?
- OPTIONS: (a) 4 photos (travel and nature) for the mock only; (b) 8 photos (the reserve rows) plus a demo seed used for a showcase account loaded through the real upload path; (c) different photos per page.
- RECOMMENDATION: (a): the mock is the only frame needing demo photos and its caption is a Lisbon summer. Revisit (b) only if a showcase account is wanted.
- BLOCKS: P2 shot list.

**Q4. Image renditions (performance)**
- QUESTION: May I ask the Backend Engineer for resized renditions (about 480 px wide WebP) on `coverImages`, and for four covers instead of five?
- OPTIONS: (a) yes, backend generates renditions; (b) originals only, frontend accepts heavy pages; (c) later.
- RECOMMENDATION: (a). With (b), a 12-card page can transfer tens of MB.
- BLOCKS: the performance goal of P1 (the feature still works without it).

**Q5. Who sources the photos**
- QUESTION: Do you supply the photos, or do I download them from the allowed sources?
- OPTIONS: (a) you supply files and source details; (b) I download after you approve candidate source pages; (c) you pick and I process.
- RECOMMENDATION: (c) or (a): the choice is aesthetic and legal; I only download with your explicit approval in that task.
- BLOCKS: P2.

**Q6. Image processing tool and fallback format**
- QUESTION: May I run a local, non-committed conversion tool, or may a build dependency be added? WebP only, or WebP plus JPEG fallback?
- OPTIONS: (a) a local command-line tool already installed, nothing added to `package.json`, WebP only; (b) the same plus JPEG fallback; (c) add a build-time image dependency (not recommended).
- RECOMMENDATION: (a). Four static images do not justify a dependency.
- BLOCKS: P2 processing.

**Q7. Optional alt text or caption field**
- QUESTION: Should the API get an optional per-photo `alt` or `caption` field?
- OPTIONS: (a) not now, generated alt only; (b) add later with the viewer; (c) add now.
- RECOMMENDATION: (a) now, (b) when Ver álbum is planned.
- BLOCKS: nothing in P1.

**Q8. The unreferenced files in `frontend/public/`**
- QUESTION: What should happen to `image1.jpg` to `image5.jpg` and the polaroid PNG (about 19 MB, undocumented provenance, shipped in `dist/`, `image2.jpg` shows identifiable people and brands)?
- OPTIONS: (a) delete them (they are tracked in git history); (b) keep them out of `public/` and document provenance if you know it; (c) leave them.
- RECOMMENDATION: (a) or (b); they cannot be used as demo photos without documentation. I did not change them.
- BLOCKS: P2 hygiene only.

**Q9. Restoring "atualizado a ..." on the card (C2)**
- QUESTION: Should the card show "· atualizado a 12 nov" now that the summaries contract has `lastActivityAt`?
- OPTIONS: (a) yes, in P1 (a design restoration, small); (b) no, leave as is.
- RECOMMENDATION: (a). The definition of `lastActivityAt` is a backend ASSUMPTION, so confirm it first.
- BLOCKS: nothing.

**Q10. Test tooling**
- QUESTION: May Playwright (and `@axe-core/playwright`) be added as dev dependencies, and does a browser exist on the QA machine?
- OPTIONS: (a) yes; (b) Vitest and manual checks only.
- RECOMMENDATION: (a) for the visual, layout-shift and axe checks the plan relies on.
- BLOCKS: P3 browser tests.

**Q11 (design question). Empty-tile style.**
- QUESTION: Approve the neutral lavender static tile as the empty-tile style (not from Figma)?
- OPTIONS: (a) approve; (b) another style you prefer (for example a faint image icon).
- RECOMMENDATION: (a): it reuses `--pm-tint-lavender`, introduces no new colour and is distinguishable from the pulsing skeleton.
- BLOCKS: P1 visuals.

---

## Verified versus not verified

**Verified (read):** `CLAUDE.md` rules; `docs/design/figma-reference.md`; the screenshots of Home, Mobile Home, Álbuns, Mobile Álbuns, Login, Criar coleção (desktop and mobile), Coleções, Ver álbum and Editar álbum; `docs/api/albums-summaries-contract.md`; the frontend code listed in section 3.12 and the existence of `AuthLayout`, `AlbumCard`, `AlbumStates`, `Image.ts`, `apiClient.ts`, `tokens.css`, the mosaic and mock CSS; the backend route list and upload limits; the official licence pages of Unsplash, Pexels, Pixabay and the Wikimedia Commons reuse page (summaries returned by the page-fetch tool, not the raw pages); the five JPEGs in `frontend/public/` (visually).

**Not verified:** `docs/api/oci-object-storage-plan.md` (did not exist); `docs/api/auth-contract.md` (not needed beyond the summaries contract; not re-read); Figma values (fonts, radii, spacing, gaps remain `[by-eye]`); any behaviour in a browser; the real URL lifetime, the OCI host, renditions; WebP browser support (stated from memory); legal interpretation of the licences; freedom-of-panorama rules; the exact current dimensions of every tile (taken from the screenshots by eye).
