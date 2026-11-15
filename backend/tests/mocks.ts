import { vi } from "vitest";
import { ALBUM_A, ALBUM_B, ALICE, BOB, COLL_A, IMG_A } from "./helpers.js";

// In-memory fakes that honour the userId argument, mirroring the SQL ownership scoping.
export const albums = [
  { id: ALBUM_A, name: "Alice album", user_id: ALICE },
  { id: ALBUM_B, name: "Bob album", user_id: BOB },
];
export const collections = [{ id: COLL_A, album_id: ALBUM_A, name: "Trip" }];
export const images = [{ id: IMG_A, collection_id: COLL_A, image_url: "u", public_id: "collections/Trip/x" }];

const albumOwner = (albumId: string) => albums.find((a) => a.id === albumId)?.user_id;
const collOwner = (c: { album_id: string }) => albumOwner(c.album_id);

export const albumModel = {
  addAlbum: vi.fn(async (name: string, user_id: string) => ({ id: "new", name, user_id })),
  getAlbumsByUserId: vi.fn(async (u: string) => albums.filter((a) => a.user_id === u)),
  updateAlbum: vi.fn(async (id: string, name: string, u: string) => {
    const a = albums.find((x) => x.id === id && x.user_id === u);
    return a ? { ...a, name } : undefined;
  }),
  deleteAlbum: vi.fn(async (id: string, u: string) => albums.some((x) => x.id === id && x.user_id === u)),
  isAlbumOwnedBy: vi.fn(async (id: string, u: string) => albumOwner(id) === u),
};

export const collectionModel = {
  getCollectionById: vi.fn(async (id: string, u: string) => collections.find((c) => c.id === id && collOwner(c) === u) ?? null),
  getCollectionsByAlbumId: vi.fn(async (id: string, u: string) => collections.filter((c) => c.album_id === id && collOwner(c) === u)),
  getCollectionsByUserId: vi.fn(async (u: string) => collections.filter((c) => collOwner(c) === u)),
  insertCollection: vi.fn(async () => undefined),
  updateCollection: vi.fn(async (id: string, u: string, f: object) => {
    const c = collections.find((x) => x.id === id && collOwner(x) === u);
    return c ? { ...c, ...f } : undefined;
  }),
  deleteCollection: vi.fn(async (id: string, u: string) => collections.some((c) => c.id === id && collOwner(c) === u)),
};

export const imageModel = {
  addImage: vi.fn(),
  deleteImage: vi.fn(async () => undefined),
  getImagesByCollectionId: vi.fn(async (cid: string, u: string) =>
    images.filter((i) => i.collection_id === cid && collections.some((c) => c.id === cid && collOwner(c) === u))),
  getImageById: vi.fn(async (id: string, u: string) => {
    const i = images.find((x) => x.id === id);
    const c = collections.find((x) => x.id === i?.collection_id);
    return i && c && collOwner(c) === u ? i : undefined;
  }),
};
