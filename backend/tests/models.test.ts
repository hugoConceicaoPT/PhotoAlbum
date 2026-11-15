import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake tagged-template SQL client: captures the static text and the bound parameters.
const calls: Array<{ text: string; values: unknown[] }> = [];
let nextResult: unknown[] = [];
vi.mock("../config/db.js", () => ({
  default: (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("?"), values });
    return Promise.resolve(nextResult);
  },
}));

const { updateCollection } = await import("../models/collection.js");
const { getAlbumSummaries, createSummaryIndexes } = await import("../models/albumSummary.js");

beforeEach(() => {
  calls.length = 0;
  nextResult = [];
});

describe("updateCollection SQL parameters (L1) - captured, NOT executed against PostgreSQL", () => {
  it("null clears: description flag true with null value; omitted fields get flag false", async () => {
    await updateCollection("id1", "u1", { description: null });
    const { text, values } = calls[0]!;
    expect(text).not.toContain("COALESCE");
    // order: hasName, name, hasDescription, description, hasBeginDate, beginDate, hasEndDate, endDate, id, userId
    expect(values).toEqual([false, null, true, null, false, null, false, null, "id1", "u1"]);
  });
  it("values replace; the owner scope is parameterized", async () => {
    await updateCollection("id1", "u1", { name: "N", beginDate: "2026-01-02" });
    expect(calls[0]!.values).toEqual([true, "N", false, null, true, "2026-01-02", false, null, "id1", "u1"]);
    expect(calls[0]!.text).toContain("SELECT id FROM Album WHERE user_id =");
  });
});

describe("getAlbumSummaries SQL (captured, NOT executed against PostgreSQL)", () => {
  it("is one statement; the user is bound at the root and for the total; all values are parameters", async () => {
    nextResult = [];
    await getAlbumSummaries("alice", { limit: 51, coverLimit: 5 });
    expect(calls).toHaveLength(1); // no N+1
    const { text, values } = calls[0]!;
    expect(text).toContain("WHERE a.user_id =");
    expect(values).toEqual(["alice", null, null, null, 51, "alice", 5]);
    expect(text).not.toMatch(/alice/);
    expect(text).toContain("LIMIT ?::int");
  });
  it("passes the cursor as parameters", async () => {
    await getAlbumSummaries("alice", { limit: 11, coverLimit: 3, after: { sortKey: "2026-11-12T18:40:02.654321Z", id: "x" } });
    expect(calls[0]!.values).toEqual(["alice", "2026-11-12T18:40:02.654321Z", "2026-11-12T18:40:02.654321Z", "x", 11, "alice", 3]);
  });
  it("maps rows: skips the empty-page row, coerces counts, tolerates null/string covers", async () => {
    nextResult = [
      { total: "2", id: "a1", name: "A", created_at: "2026-01-01T00:00:00Z", last_activity_at: null, photo_count: "7", sort_key_text: "t1", covers: null },
      { total: "2", id: "a2", name: "B", created_at: null, last_activity_at: "x", photo_count: 0, sort_key_text: "t2", covers: JSON.stringify([{ id: "i", objectKey: "k" }]) },
    ];
    const page = await getAlbumSummaries("alice", { limit: 10, coverLimit: 5 });
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => [r.id, r.photoCount, r.covers.length])).toEqual([["a1", 7, 0], ["a2", 0, 1]]);

    nextResult = [{ total: 4, id: null, name: null, created_at: null, last_activity_at: null, photo_count: null, sort_key_text: null, covers: null }];
    expect(await getAlbumSummaries("alice", { limit: 10, coverLimit: 5 })).toEqual({ total: 4, rows: [] });
  });
});

describe("createSummaryIndexes (captured only; never run here)", () => {
  it("issues three idempotent CREATE INDEX IF NOT EXISTS statements", async () => {
    await createSummaryIndexes();
    expect(calls).toHaveLength(3);
    for (const c of calls) expect(c.text).toMatch(/^\s*CREATE INDEX IF NOT EXISTS/);
    expect(calls.map((c) => c.text).join("\n")).toContain("(collection_id, created_at DESC, id DESC)");
  });
});
