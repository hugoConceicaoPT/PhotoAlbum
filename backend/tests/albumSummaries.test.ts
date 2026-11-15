import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ALICE_ROWS, BOB_ROWS, summaryModel, row, cover } from "./summaryFixtures.js";

vi.mock("../models/albumSummary.js", () => summaryModel);
vi.mock("../models/termsConsent.js", () => ({ getConsent: vi.fn(), recordConsent: vi.fn() }));
vi.mock("../models/album.js", async () => (await import("./mocks.js")).albumModel);
vi.mock("../models/collection.js", async () => (await import("./mocks.js")).collectionModel);
vi.mock("../models/image.js", async () => (await import("./mocks.js")).imageModel);
vi.mock("cloudinary", () => ({
  v2: { config: () => undefined, url: () => "https://signed.example/legacy", uploader: {}, api: {} },
}));

const { createApp } = await import("../app.js");
const { authz, mockVerifier, testConfig, ALICE, BOB, COLL_A } = await import("./helpers.js");
const { encodeCursor, decodeCursor } = await import("../lib/albumCursor.js");

const EXPIRES = new Date("2026-11-15T20:00:00.000Z");
const signer = {
  getReadUrl: vi.fn(async (key: string) => ({ url: `https://cdn.example/read?k=${encodeURIComponent(key)}&sig=abc`, expiresAt: EXPIRES })),
};
const mk = (over: Partial<ReturnType<typeof testConfig>> = {}) =>
  createApp(testConfig(over), mockVerifier, undefined, { urlSigner: signer });
const app = mk();
const get = (qs = "", who: "alice" | "bob" = "alice") => request(app).get(`/albums/summaries${qs}`).set(authz(who));

beforeEach(() => {
  vi.clearAllMocks();
  summaryModel.rowsFor.mockImplementation((u: string) => (u === ALICE ? ALICE_ROWS : u === BOB ? BOB_ROWS : []));
});

describe("authentication", () => {
  it("no header / non-Bearer / invalid token -> 401 { error }, model not called", async () => {
    expect((await request(app).get("/albums/summaries")).status).toBe(401);
    expect((await request(app).get("/albums/summaries").set("Authorization", "Basic abc")).status).toBe(401);
    const bad = await request(app).get("/albums/summaries").set("Authorization", "Bearer garbage");
    expect(bad.status).toBe(401);
    expect(bad.body).toEqual({ error: "Invalid or expired token" });
    expect(summaryModel.getAlbumSummaries).not.toHaveBeenCalled();
    expect(signer.getReadUrl).not.toHaveBeenCalled();
  });
});

describe("ownership isolation", () => {
  it("uses only the token user id; query/header/body identifiers are ignored", async () => {
    const res = await request(app)
      .get(`/albums/summaries?userId=${BOB}&user_id=${BOB}&albumId=x`)
      .set({ ...authz("alice"), "X-User-Id": BOB })
      .send({ userId: BOB });
    expect(res.status).toBe(200);
    expect(summaryModel.getAlbumSummaries.mock.calls[0]![0]).toBe(ALICE);
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual(ALICE_ROWS.map((r) => r.id));
  });
  it("Bob never receives Alice's rows (and vice versa); signing is only requested for the caller's own covers", async () => {
    const bob = await get("", "bob");
    expect(bob.body.items.map((i: { id: string }) => i.id)).toEqual(BOB_ROWS.map((r) => r.id));
    const signedKeys = signer.getReadUrl.mock.calls.map((c) => c[0]);
    const aliceKeys = ALICE_ROWS.flatMap((r) => r.covers.map((c) => c.objectKey));
    expect(signedKeys.length).toBeGreaterThan(0);
    for (const k of signedKeys) expect(aliceKeys).not.toContain(k);
  });
  it("legacy deprecated route /albums/user/:id is untouched (403 for another user) and /albums is unchanged", async () => {
    expect((await request(app).get(`/albums/user/${ALICE}`).set(authz("bob"))).status).toBe(403);
    const list = await request(app).get("/albums").set(authz("alice"));
    expect(list.status).toBe(200);
    expect(list.body[0].user_id).toBe(ALICE); // GET /albums keeps its old raw shape
  });
  it("only GET is served on /albums/summaries", async () => {
    const res = await request(app).post("/albums/summaries").set(authz("alice")).send({ name: "x" });
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
    expect(summaryModel.getAlbumSummaries).not.toHaveBeenCalled();
  });
});

describe("response contract", () => {
  it("returns { items, total, nextCursor } with the documented fields and ISO dates", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(ALICE_ROWS.length);
    expect(res.body.nextCursor).toBeNull();
    const first = res.body.items[0];
    expect(Object.keys(first).sort()).toEqual(["coverImages", "createdAt", "id", "lastActivityAt", "name", "photoCount"]);
    expect(first.createdAt).toBe("2026-09-02T10:15:30.123Z");
    expect(first.lastActivityAt).toBe("2026-11-12T18:40:02.654Z");
    expect(first.coverImages[0]).toEqual({
      id: ALICE_ROWS[0]!.covers[0]!.id,
      url: expect.stringMatching(/^https:\/\//),
      expiresAt: EXPIRES.toISOString(),
    });
    expect(Object.keys(first.coverImages[0]).sort()).toEqual(["expiresAt", "id", "url"]);
  });

  it("covers keep the model order (first = main cover) and are capped by the configured limit", async () => {
    summaryModel.rowsFor.mockReturnValue([row("a1", { covers: Array.from({ length: 7 }, (_, i) => cover(`c${i}`)) })]);
    const five = await get();
    expect(five.body.items[0].coverImages.map((c: { id: string }) => c.id)).toEqual(["c0", "c1", "c2", "c3", "c4"]);
    const three = await request(mk({ albumCoverImages: 3 })).get("/albums/summaries").set(authz("alice"));
    expect(three.body.items[0].coverImages).toHaveLength(3);
    expect(summaryModel.getAlbumSummaries.mock.calls.at(-1)![1].coverLimit).toBe(3);
    expect(summaryModel.getAlbumSummaries.mock.calls[0]![1].coverLimit).toBe(5);
  });

  it("empty state: no albums", async () => {
    summaryModel.rowsFor.mockReturnValue([]);
    const res = await get();
    expect(res.body).toEqual({ items: [], total: 0, nextCursor: null });
  });

  it("album without collections or images: photoCount 0, no covers", async () => {
    summaryModel.rowsFor.mockReturnValue([row("empty", { photoCount: 0, covers: [], lastActivityAt: null })]);
    const res = await get();
    expect(res.body.items[0]).toMatchObject({ photoCount: 0, coverImages: [], lastActivityAt: null });
  });

  it("large counts are numbers; photoCount can exceed the number of covers", async () => {
    summaryModel.rowsFor.mockReturnValue([row("big", { photoCount: 100000, covers: [cover("c1")] })]);
    const res = await get();
    expect(res.body.items[0].photoCount).toBe(100000);
    expect(typeof res.body.items[0].photoCount).toBe("number");
  });

  it("deep scan: no user_id, public_id, objectKey, stored image_url, collection_id or provider names anywhere", async () => {
    const res = await get();
    const text = JSON.stringify(res.body);
    for (const forbidden of ["user_id", "public_id", "objectKey", "image_url", "collection_id", "cloudinary", "signed_url", ALICE, BOB]) {
      expect(text).not.toContain(forbidden);
    }
    // the raw object key is only ever an input to the signer; it is not echoed raw
    for (const r of ALICE_ROWS) for (const c of r.covers) expect(text).not.toContain(c.objectKey);
  });

  it("Cache-Control: private, no-store", async () => {
    const res = await get();
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });
});

describe("pagination and validation", () => {
  it("default limit 50: the model is asked for 51 rows (one extra to detect a next page)", async () => {
    await get();
    expect(summaryModel.getAlbumSummaries.mock.calls[0]![1]).toMatchObject({ limit: 51, after: undefined });
  });

  it.each(["1", "50", "100"])("limit=%s accepted", async (l) => {
    expect((await get(`?limit=${l}`)).status).toBe(200);
  });

  it.each(["0", "101", "abc", "-1", "1.5", "", "%20", "1e2", "0x10", "+5", "99999"])("limit=%j -> 400 { error: 'Invalid limit' }", async (l) => {
    const res = await get(`?limit=${l}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid limit" });
    expect(summaryModel.getAlbumSummaries).not.toHaveBeenCalled();
  });

  it("repeated limit parameter (array) -> 400", async () => {
    expect((await get("?limit=1&limit=2")).status).toBe(400);
  });

  it("the extra row is trimmed and nextCursor is derived from the LAST RETURNED row", async () => {
    const rows = [row("a", { sortKey: "2026-11-12T18:40:02.654321Z" }), row("b", { sortKey: "2026-11-10T10:00:00.000001Z" }), row("c", { sortKey: "2026-10-01T00:00:00.000000Z" })];
    summaryModel.rowsFor.mockReturnValue(rows);
    const res = await get("?limit=2");
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([row("a").id, row("b").id]);
    expect(decodeCursor(res.body.nextCursor)).toEqual({ t: "2026-11-10T10:00:00.000001Z", id: row("b").id });
    // exactly `limit` rows -> last page
    summaryModel.rowsFor.mockReturnValue(rows.slice(0, 2));
    expect((await get("?limit=2")).body.nextCursor).toBeNull();
  });

  it("a valid cursor is forwarded to the model as parameters (microsecond text preserved)", async () => {
    const cursor = encodeCursor({ t: "2026-11-10T10:00:00.000001Z", id: row("b").id });
    const res = await get(`?cursor=${cursor}`);
    expect(res.status).toBe(200);
    expect(summaryModel.getAlbumSummaries.mock.calls[0]![1].after).toEqual({ sortKey: "2026-11-10T10:00:00.000001Z", id: row("b").id });
  });

  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const ID = row("b").id;
  it.each([
    ["not base64url", "!!!not base64!!!"],
    ["not JSON", Buffer.from("hello").toString("base64url")],
    ["JSON array", enc([1, 2])],
    ["missing id", enc({ t: "2026-11-10T10:00:00.000001Z" })],
    ["id not a uuid", enc({ t: "2026-11-10T10:00:00.000001Z", id: "1; DROP TABLE album" })],
    ["t not a timestamp", enc({ t: "yesterday", id: ID })],
    ["t SQL injection", enc({ t: "2026-11-10T10:00:00.000001Z'; --", id: ID })],
    ["t calendar-invalid", enc({ t: "2026-02-31T10:00:00.000001Z", id: ID })],
    ["t month 13", enc({ t: "2026-13-10T10:00:00.000001Z", id: ID })],
    ["t year 0000", enc({ t: "0000-01-10T10:00:00.000001Z", id: ID })],
    ["t wrong precision", enc({ t: "2026-11-10T10:00:00Z", id: ID })],
    ["too long", "A".repeat(300)],
    ["empty", ""],
  ])("tampered cursor (%s) -> 400 { error: 'Invalid cursor' }, model not called", async (_n, c) => {
    const res = await get(`?cursor=${encodeURIComponent(c)}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid cursor" });
    expect(summaryModel.getAlbumSummaries).not.toHaveBeenCalled();
  });

  it("a forged but well-formed cursor only repositions within the caller's own rows (still owner-scoped)", async () => {
    const cursor = encodeCursor({ t: "2026-01-01T00:00:00.000000Z", id: BOB_ROWS[0]!.id });
    await get(`?cursor=${cursor}`);
    expect(summaryModel.getAlbumSummaries.mock.calls[0]![0]).toBe(ALICE);
  });
});

describe("failure handling", () => {
  it("one cover failing to sign is dropped; the page still succeeds and photoCount is unchanged", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const key = ALICE_ROWS[0]!.covers[0]!.objectKey;
    signer.getReadUrl.mockImplementationOnce(async () => {
      throw new Error(`provider exploded for ${key}`);
    });
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.items[0].photoCount).toBe(ALICE_ROWS[0]!.photoCount);
    expect(res.body.items[0].coverImages).toHaveLength(ALICE_ROWS[0]!.covers.length - 1);
    expect(JSON.stringify(spy.mock.calls)).not.toContain(key);
    spy.mockRestore();
  });

  it("database failure -> 500 { error } without internal text; nothing sensitive logged", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    summaryModel.getAlbumSummaries.mockRejectedValueOnce(Object.assign(new Error("relation album does not exist: SELECT secret"), { code: "42P01" }));
    const res = await get();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch album summaries" });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("SELECT secret");
    spy.mockRestore();
  });
});

describe("GET /images/collection/:id: provider-neutral url/expiresAt added, legacy fields kept", () => {
  it("adds url and expiresAt (same value as signed_url) and keeps image_url/public_id for existing consumers", async () => {
    const res = await request(app).get(`/images/collection/${COLL_A}`).set(authz("alice"));
    expect(res.status).toBe(200);
    const img = res.body[0];
    expect(img.url).toMatch(/^https:\/\/cdn\.example\//);
    expect(img.expiresAt).toBe(EXPIRES.toISOString());
    expect(img.signed_url).toBe(img.url);
    expect(img.image_url).toBeDefined();
    expect(img.public_id).toBeDefined();
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });
  it("another user still gets 404 and nothing is signed", async () => {
    const res = await request(app).get(`/images/collection/${COLL_A}`).set(authz("bob"));
    expect(res.status).toBe(404);
    expect(signer.getReadUrl).not.toHaveBeenCalled();
  });
});

describe("cursor codec", () => {
  it("round-trips and rejects non-strings", () => {
    const c = { t: "2026-11-10T10:00:00.123456Z", id: ID_OK };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(["x"])).toBeNull();
    expect(decodeCursor(42)).toBeNull();
  });
});
const ID_OK = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
