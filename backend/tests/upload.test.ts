import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import { imageModel } from "./mocks.js";

// Real multipart parsing (multer is NOT mocked). Only Cloudinary and the models are test doubles.
const { upload, verifyCalls } = vi.hoisted(() => ({
  upload: vi.fn(),
  verifyCalls: { count: 0 },
}));

vi.mock("../models/termsConsent.js", () => ({ getConsent: vi.fn(), recordConsent: vi.fn() }));
vi.mock("../models/album.js", async () => (await import("./mocks.js")).albumModel);
vi.mock("../models/collection.js", async () => (await import("./mocks.js")).collectionModel);
vi.mock("../models/image.js", async () => (await import("./mocks.js")).imageModel);
vi.mock("cloudinary", () => ({
  v2: {
    config: () => undefined,
    url: () => "https://signed.example/img",
    uploader: { upload, destroy: vi.fn(async () => ({})) },
    api: { resources: vi.fn(), delete_folder: vi.fn() },
  },
}));

const { createApp } = await import("../app.js");
const { COLL_A, authz, mockVerifier, testConfig } = await import("./helpers.js");

const MAX = 2048;
const app = createApp(testConfig({ maxUploadBytes: MAX }), async (t) => {
  verifyCalls.count++;
  return mockVerifier(t);
});

// Real minimal files (valid signatures).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF\0"), Buffer.alloc(32)]);
const GIF = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x20, 0, 0, 0]), Buffer.from("WEBP"), Buffer.alloc(32)]);

const tempFiles = () => (fs.existsSync("uploads") ? fs.readdirSync("uploads").sort() : []);
const post = (who: "alice" | "bob" = "alice", id = COLL_A) =>
  request(app).post(`/images/upload/${id}`).set(authz(who));

let before: string[];
beforeEach(() => {
  vi.clearAllMocks();
  verifyCalls.count = 0;
  before = tempFiles();
  upload.mockImplementation(async () => ({
    secure_url: "https://res.example/stored",
    public_id: `collections/Trip/${Math.random().toString(36).slice(2)}`,
  }));
  imageModel.addImage.mockImplementation(async (collection_id: string, image_url: string, public_id: string) => ({
    id: "11111111-1111-4111-8111-111111111111",
    collection_id,
    image_url,
    public_id,
  }));
});

describe("POST /images/upload/:collectionId (real multipart)", () => {
  it("accepts a valid PNG: 201, stored via the storage double, temp file removed", async () => {
    const res = await post().attach("images", PNG, { filename: "photo.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.images).toHaveLength(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]![1]).toEqual({ folder: "collections/Trip", type: "authenticated" });
    expect(imageModel.addImage).toHaveBeenCalledTimes(1);
    expect(tempFiles()).toEqual(before);
  });

  it("accepts JPEG, GIF and WebP signatures, several files in one request", async () => {
    const res = await post()
      .attach("images", JPEG, { filename: "a.jpg", contentType: "image/jpeg" })
      .attach("images", GIF, { filename: "b.gif", contentType: "image/gif" })
      .attach("images", WEBP, { filename: "c.webp", contentType: "image/webp" });
    expect(res.status).toBe(201);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(tempFiles()).toEqual(before);
  });

  it("file over the size limit -> 413 { error }, nothing stored, no temp file left", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(MAX + 10)]);
    const res = await post().attach("images", big, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "File too large" });
    expect(upload).not.toHaveBeenCalled();
    expect(tempFiles()).toEqual(before);
  });

  it("disallowed declared type -> 400, nothing stored", async () => {
    const res = await post().attach("images", Buffer.from("<html>"), { filename: "a.html", contentType: "text/html" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid upload" });
    expect(upload).not.toHaveBeenCalled();
    expect(tempFiles()).toEqual(before);
  });

  it("more than 10 files -> 400, nothing stored, no temp file left", async () => {
    let r = post();
    for (let i = 0; i < 11; i++) r = r.attach("images", PNG, { filename: `p${i}.png`, contentType: "image/png" });
    const res = await r;
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
    expect(tempFiles()).toEqual(before);
  });

  it("unexpected field name -> 400, no temp file left", async () => {
    const res = await post().attach("other", PNG, { filename: "p.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(tempFiles()).toEqual(before);
  });

  it("no files -> 400", async () => {
    const res = await post().field("note", "x");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "No image files provided" });
  });

  it("another user's collection -> 404 and nothing stored", async () => {
    const res = await post("bob").attach("images", PNG, { filename: "p.png", contentType: "image/png" });
    expect(res.status).toBe(404);
    expect(upload).not.toHaveBeenCalled();
    expect(tempFiles()).toEqual(before);
  });

  it("the token is verified exactly once per upload request (single protect chain)", async () => {
    await post().attach("images", PNG, { filename: "p.png", contentType: "image/png" });
    expect(verifyCalls.count).toBe(1);
  });
});

describe("magic-byte validation (M3)", () => {
  it("text declared as image/png -> 400, nothing stored, temp file removed", async () => {
    const res = await post().attach("images", Buffer.from("this is not an image at all"), {
      filename: "fake.png",
      contentType: "image/png",
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid image file" });
    expect(upload).not.toHaveBeenCalled();
    expect(imageModel.addImage).not.toHaveBeenCalled();
    expect(tempFiles()).toEqual(before);
  });

  it("a file shorter than the signature is rejected", async () => {
    const res = await post().attach("images", Buffer.from([0x89, 0x50]), { filename: "s.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(tempFiles()).toEqual(before);
  });

  it("RIFF that is not WebP and a script with an image extension are rejected", async () => {
    const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x20, 0, 0, 0]), Buffer.from("WAVE"), Buffer.alloc(16)]);
    expect((await post().attach("images", wav, { filename: "w.webp", contentType: "image/webp" })).status).toBe(400);
    const js = Buffer.from("<script>alert(1)</script>");
    expect((await post().attach("images", js, { filename: "x.jpg", contentType: "image/jpeg" })).status).toBe(400);
    expect(tempFiles()).toEqual(before);
  });

  it("one bad file among valid ones: whole request rejected BEFORE any storage call, ALL temp files removed", async () => {
    const res = await post()
      .attach("images", PNG, { filename: "ok1.png", contentType: "image/png" })
      .attach("images", Buffer.from("nope"), { filename: "bad.png", contentType: "image/png" })
      .attach("images", PNG, { filename: "ok2.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
    expect(tempFiles()).toEqual(before);
  });

  it("the client-provided filename is never used for storage keys or temp paths", async () => {
    const res = await post().attach("images", PNG, { filename: "../../evil.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    const [path] = upload.mock.calls[0] as [string];
    expect(path).not.toContain("evil");
    expect(tempFiles()).toEqual(before);
  });
});

describe("temp-file cleanup on every exit path (S-04)", () => {
  it("storage provider failure -> 500 and every temp file removed", async () => {
    upload.mockRejectedValue(new Error("provider down"));
    const res = await post()
      .attach("images", PNG, { filename: "a.png", contentType: "image/png" })
      .attach("images", PNG, { filename: "b.png", contentType: "image/png" });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Image upload failed" });
    expect(JSON.stringify(res.body)).not.toContain("provider");
    expect(tempFiles()).toEqual(before);
  });

  it("database insert returns nothing on the first file -> 400 and the remaining temp files are removed", async () => {
    imageModel.addImage.mockResolvedValue(undefined as never);
    const res = await post()
      .attach("images", PNG, { filename: "a.png", contentType: "image/png" })
      .attach("images", PNG, { filename: "b.png", contentType: "image/png" })
      .attach("images", PNG, { filename: "c.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(tempFiles()).toEqual(before);
  });

  it("database error on the second file -> 500 and every temp file removed", async () => {
    let n = 0;
    imageModel.addImage.mockImplementation(async (c: string, u: string, p: string) => {
      if (++n === 2) throw new Error("db down");
      return { id: "1", collection_id: c, image_url: u, public_id: p };
    });
    const res = await post()
      .attach("images", PNG, { filename: "a.png", contentType: "image/png" })
      .attach("images", PNG, { filename: "b.png", contentType: "image/png" })
      .attach("images", PNG, { filename: "c.png", contentType: "image/png" });
    expect(res.status).toBe(500);
    expect(tempFiles()).toEqual(before);
  });

});
