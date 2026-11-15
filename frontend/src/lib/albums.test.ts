import { describe, expect, it } from "vitest";
import {
  albumsSubtitle,
  filterAlbumsByName,
  formatAlbumCount,
  formatPhotoCount,
  normalizeText,
  sortMostRecent,
} from "./albums";
import { loadAlbumSummaries, type AlbumSources } from "./loadAlbums";

describe("formatting", () => {
  it("pluralises photos and albums", () => {
    expect(formatPhotoCount(0)).toBe("0 fotos");
    expect(formatPhotoCount(1)).toBe("1 foto");
    expect(formatPhotoCount(24)).toBe("24 fotos");
    expect(formatAlbumCount(1)).toBe("1 álbum");
    expect(formatAlbumCount(3)).toBe("3 álbuns");
  });

  it("builds the subtitle for desktop and compact", () => {
    expect(albumsSubtitle(3)).toBe("3 álbuns · ordenados por mais recentes");
    expect(albumsSubtitle(1, true)).toBe("1 álbum · mais recentes");
  });
});

describe("search", () => {
  const albums = [{ name: "Férias" }, { name: "Casamento" }, { name: "Gym" }];

  it("normalises accents and case", () => {
    expect(normalizeText("  FÉRIAS ")).toBe("ferias");
  });

  it("matches accent-insensitively", () => {
    expect(filterAlbumsByName(albums, "ferias")).toEqual([{ name: "Férias" }]);
    expect(filterAlbumsByName(albums, "CASA")).toEqual([{ name: "Casamento" }]);
  });

  it("returns everything for an empty term and nothing for no match", () => {
    expect(filterAlbumsByName(albums, "   ")).toHaveLength(3);
    expect(filterAlbumsByName(albums, "zzz")).toEqual([]);
  });
});

describe("sortMostRecent", () => {
  it("orders by id descending without mutating the input", () => {
    const input = [{ id: 1 }, { id: 3 }, { id: 2 }];
    expect(sortMostRecent(input).map((a) => a.id)).toEqual([3, 2, 1]);
    expect(input.map((a) => a.id)).toEqual([1, 3, 2]);
  });
});

describe("loadAlbumSummaries", () => {
  it("collects image urls across collections", async () => {
    const sources: AlbumSources = {
      getAlbums: async () => [{ id: 1, name: "A" }],
      getCollectionIds: async () => [10, 11],
      getImageUrls: async (id) => [`u${id}a`, `u${id}b`],
    };
    expect(await loadAlbumSummaries(sources, 1)).toEqual([
      { id: 1, name: "A", images: ["u10a", "u10b", "u11a", "u11b"] },
    ]);
  });

  it("tolerates a failing album and a failing collection", async () => {
    const sources: AlbumSources = {
      getAlbums: async () => [
        { id: 1, name: "ok" },
        { id: 2, name: "broken" },
      ],
      getCollectionIds: async (albumId) => {
        if (albumId === 2) throw new Error("boom");
        return [10, 11];
      },
      getImageUrls: async (id) => {
        if (id === "11") throw new Error("boom");
        return ["x"];
      },
    };
    expect(await loadAlbumSummaries(sources, 1)).toEqual([
      { id: 1, name: "ok", images: ["x"] },
      { id: 2, name: "broken", images: [] },
    ]);
  });

  it("rejects when the album list itself fails", async () => {
    const sources: AlbumSources = {
      getAlbums: async () => {
        throw new Error("down");
      },
      getCollectionIds: async () => [],
      getImageUrls: async () => [],
    };
    await expect(loadAlbumSummaries(sources, 1)).rejects.toThrow("down");
  });
});
