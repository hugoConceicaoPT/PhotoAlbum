import { vi } from "vitest";
import type { AlbumSummaryRow } from "../models/albumSummary.js";

const hex = (n: number) => n.toString(16).padStart(12, "0");

export const cover = (id: string, objectKey = `collections/Secret_${id}/obj`) => ({ id, objectKey });

export const row = (id: string, over: Partial<AlbumSummaryRow> = {}): AlbumSummaryRow => ({
  // stable UUID derived from the short id so ids are valid UUIDs
  id: `00000000-0000-4000-8000-${hex([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 0xffffffffffff)}`,
  name: `Album ${id}`,
  createdAt: new Date("2026-09-02T10:15:30.123Z"),
  lastActivityAt: new Date("2026-11-12T18:40:02.654Z"),
  photoCount: 3,
  sortKey: "2026-11-12T18:40:02.654321Z",
  covers: [cover(`${id}-1`), cover(`${id}-2`), cover(`${id}-3`)],
  ...over,
});

export const ALICE_ROWS: AlbumSummaryRow[] = [row("alice-1"), row("alice-2", { photoCount: 1, covers: [cover("alice-2-1")] })];
export const BOB_ROWS: AlbumSummaryRow[] = [row("bob-1", { name: "Bob private", photoCount: 9, covers: [cover("bob-1-1"), cover("bob-1-2")] })];

/** In-memory fake that honours the userId argument, like the SQL scoping does. */
export const summaryModel = {
  rowsFor: vi.fn((_userId: string): AlbumSummaryRow[] => []),
  getAlbumSummaries: vi.fn(async function (this: unknown, userId: string, _q: unknown) {
    const rows = summaryModel.rowsFor(userId);
    return { total: rows.length, rows };
  }),
  createSummaryIndexes: vi.fn(async () => undefined),
};
