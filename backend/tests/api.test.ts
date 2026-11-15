import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import fs from "node:fs";
import { albumModel, collectionModel, imageModel } from "./mocks.js";

vi.mock("../models/album.js", async () => (await import("./mocks.js")).albumModel);
vi.mock("../models/collection.js", async () => (await import("./mocks.js")).collectionModel);
vi.mock("../models/image.js", async () => (await import("./mocks.js")).imageModel);
vi.mock("cloudinary", () => ({
  v2: {
    config: () => undefined,
    url: () => "https://signed.example/img",
    uploader: { upload: vi.fn(), destroy: vi.fn(async () => ({})) },
    api: { resources: vi.fn(async () => ({ resources: [{}] })), delete_folder: vi.fn() },
  },
}));

const { createApp } = await import("../app.js");
const { ALBUM_A, ALBUM_B, ALICE, BOB, COLL_A, IMG_A, authz, mockVerifier, testConfig } = await import("./helpers.js");

const app = createApp(testConfig(), mockVerifier);
const ERROR_SHAPE = { error: expect.any(String) };

beforeEach(() => vi.clearAllMocks());

describe("authentication (401)", () => {
  const routes: Array<[string, string]> = [
    ["get", "/albums"],
    ["get", `/albums/user/${ALICE}`],
    ["post", "/albums"],
    ["put", `/albums/${ALBUM_A}`],
    ["delete", `/albums/${ALBUM_A}`],
    ["get", "/collections"],
    ["get", `/collections/album/${ALBUM_A}`],
    ["get", `/collections/${COLL_A}`],
    ["post", "/collections"],
    ["put", `/collections/${COLL_A}`],
    ["delete", `/collections/${COLL_A}`],
    ["get", `/images/collection/${COLL_A}`],
    ["post", `/images/upload/${COLL_A}`],
    ["delete", `/images/${IMG_A}`],
  ];

  it.each(routes)("%s %s without token -> 401", async (method, path) => {
    const res = await (request(app) as any)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual(ERROR_SHAPE);
  });

  it.each(routes)("%s %s with invalid token -> 401", async (method, path) => {
    const res = await (request(app) as any)[method](path).set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid or expired token" });
  });

  it("rejects non-Bearer schemes", async () => {
    const res = await request(app).get("/albums").set("Authorization", "Basic abc");
    expect(res.status).toBe(401);
  });

  it("does not touch the database when unauthenticated", async () => {
    await request(app).get("/albums");
    expect(albumModel.getAlbumsByUserId).not.toHaveBeenCalled();
  });

  it("/db-version is not served outside development", async () => {
    expect((await request(app).get("/db-version")).status).toBe(404);
  });
});

describe("albums", () => {
  it("owner lists only own albums (200)", async () => {
    const res = await request(app).get("/albums").set(authz("alice"));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user_id).toBe(ALICE);
  });

  it("legacy /albums/user/:id works for self, 403 for another user", async () => {
    expect((await request(app).get(`/albums/user/${ALICE}`).set(authz("alice"))).status).toBe(200);
    vi.clearAllMocks();
    const res = await request(app).get(`/albums/user/${ALICE}`).set(authz("bob"));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden" });
    expect(albumModel.getAlbumsByUserId).not.toHaveBeenCalledWith(ALICE);
  });

  it("create derives owner from token and ignores body user_id", async () => {
    const res = await request(app).post("/albums").set(authz("alice")).send({ name: " Trip ", user_id: BOB });
    expect(res.status).toBe(201);
    expect(albumModel.addAlbum).toHaveBeenCalledWith("Trip", ALICE);
  });

  it("create validates name (400)", async () => {
    const res = await request(app).post("/albums").set(authz("alice")).send({ name: 42 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(ERROR_SHAPE);
  });

  it("FK violation (user not synced) maps to 409 without leaking details", async () => {
    albumModel.addAlbum.mockRejectedValueOnce(Object.assign(new Error("fk detail secret"), { code: "23503" }));
    const res = await request(app).post("/albums").set(authz("alice")).send({ name: "x" });
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });

  it("owner updates (200); other user gets 404", async () => {
    expect((await request(app).put(`/albums/${ALBUM_A}`).set(authz("alice")).send({ name: "N" })).status).toBe(200);
    const res = await request(app).put(`/albums/${ALBUM_A}`).set(authz("bob")).send({ name: "N" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual(ERROR_SHAPE);
  });

  it("other user cannot delete (404); owner can (200)", async () => {
    expect((await request(app).delete(`/albums/${ALBUM_A}`).set(authz("bob"))).status).toBe(404);
    expect((await request(app).delete(`/albums/${ALBUM_A}`).set(authz("alice"))).status).toBe(200);
  });

  it("non-uuid id -> 404 without hitting the DB", async () => {
    const res = await request(app).delete("/albums/1").set(authz("alice"));
    expect(res.status).toBe(404);
    expect(albumModel.deleteAlbum).not.toHaveBeenCalled();
  });

  it("database failure -> 500 with generic message", async () => {
    albumModel.getAlbumsByUserId.mockRejectedValueOnce(new Error("connection string postgres://secret"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await request(app).get("/albums").set(authz("alice"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
});

describe("collections", () => {
  it("owner reads (200); other user gets 404", async () => {
    expect((await request(app).get(`/collections/${COLL_A}`).set(authz("alice"))).status).toBe(200);
    expect((await request(app).get(`/collections/${COLL_A}`).set(authz("bob"))).status).toBe(404);
  });

  it("collections by album: owner 200, other user 404", async () => {
    expect((await request(app).get(`/collections/album/${ALBUM_A}`).set(authz("alice"))).status).toBe(200);
    expect((await request(app).get(`/collections/album/${ALBUM_A}`).set(authz("bob"))).status).toBe(404);
  });

  it("cannot create a collection in another user's album (404)", async () => {
    const res = await request(app).post("/collections").set(authz("bob")).send({ album_id: ALBUM_A, name: "x" });
    expect(res.status).toBe(404);
    expect(collectionModel.insertCollection).not.toHaveBeenCalled();
    const ok = await request(app).post("/collections").set(authz("alice")).send({ album_id: ALBUM_A, name: "x" });
    expect(ok.status).toBe(201);
  });

  it("update/delete by non-owner -> 404; owner -> 200", async () => {
    expect((await request(app).put(`/collections/${COLL_A}`).set(authz("bob")).send({ name: "h" })).status).toBe(404);
    expect((await request(app).delete(`/collections/${COLL_A}`).set(authz("bob"))).status).toBe(404);
    expect((await request(app).put(`/collections/${COLL_A}`).set(authz("alice")).send({ name: "h" })).status).toBe(200);
    expect((await request(app).delete(`/collections/${COLL_A}`).set(authz("alice"))).status).toBe(200);
  });

  it("rejects invalid dates (400)", async () => {
    const res = await request(app).put(`/collections/${COLL_A}`).set(authz("alice")).send({ beginDate: "yesterday" });
    expect(res.status).toBe(400);
  });

  it("legacy /collections/user/:id: 403 for another user, 200 for self", async () => {
    expect((await request(app).get(`/collections/user/${ALICE}`).set(authz("bob"))).status).toBe(403);
    expect((await request(app).get(`/collections/user/${ALICE}`).set(authz("alice"))).status).toBe(200);
  });
});

describe("images", () => {
  it("owner lists images (200); other user 404", async () => {
    const ok = await request(app).get(`/images/collection/${COLL_A}`).set(authz("alice"));
    expect(ok.status).toBe(200);
    expect(ok.body[0].signed_url).toBeDefined();
    expect((await request(app).get(`/images/collection/${COLL_A}`).set(authz("bob"))).status).toBe(404);
  });

  it("other user cannot delete an image (404)", async () => {
    expect((await request(app).delete(`/images/${IMG_A}`).set(authz("bob"))).status).toBe(404);
    expect(imageModel.deleteImage).not.toHaveBeenCalled();
  });

  it("upload to another user's collection -> 404 and temp file is removed", async () => {
    const count = () => (fs.existsSync("uploads") ? fs.readdirSync("uploads").length : 0);
    const before = count();
    const res = await request(app)
      .post(`/images/upload/${COLL_A}`)
      .set(authz("bob"))
      .attach("images", Buffer.from("x"), { filename: "a.png", contentType: "image/png" });
    expect(res.status).toBe(404);
    expect(count()).toBe(before);
  });

  it("upload rejects non-image content type (400)", async () => {
    const res = await request(app)
      .post(`/images/upload/${COLL_A}`)
      .set(authz("alice"))
      .attach("images", Buffer.from("x"), { filename: "a.html", contentType: "text/html" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(ERROR_SHAPE);
  });
});

describe("transport hardening", () => {
  it("sets security headers and hides x-powered-by", async () => {
    const res = await request(app).get("/");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("CORS: allowlisted origin is echoed, never a wildcard", async () => {
    const res = await request(app).get("/").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("CORS: other origin gets no CORS headers (also on preflight)", async () => {
    const res = await request(app).get("/").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    const pre = await request(app)
      .options("/albums")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "GET");
    expect(pre.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("CORS: allowlisted preflight allows the Authorization header", async () => {
    const pre = await request(app)
      .options("/albums")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    expect(pre.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(pre.headers["access-control-allow-headers"]).toMatch(/Authorization/i);
  });

  it("rejects oversized JSON bodies (413) with { error }", async () => {
    const res = await request(app).post("/albums").set(authz("alice")).send({ name: "x".repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual(ERROR_SHAPE);
  });

  it("malformed JSON -> 400 { error }", async () => {
    const res = await request(app)
      .post("/albums")
      .set(authz("alice"))
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body).toEqual(ERROR_SHAPE);
  });
});

describe("rate limiting", () => {
  it("general limiter returns 429 after the limit", async () => {
    const cfg = testConfig();
    cfg.rateLimits.general.limit = 3;
    const a = createApp(cfg, mockVerifier);
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await request(a).get("/")).status);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
  });

  it("repeated 401s are throttled per IP; valid requests are not counted", async () => {
    const cfg = testConfig();
    cfg.rateLimits.authFailure.limit = 3;
    const a = createApp(cfg, mockVerifier);
    for (let i = 0; i < 5; i++) await request(a).get("/albums").set("Authorization", "Bearer bad");
    expect((await request(a).get("/albums").set("Authorization", "Bearer bad")).status).toBe(429);

    const b = createApp(cfg, mockVerifier);
    for (let i = 0; i < 6; i++) expect((await request(b).get("/albums").set(authz("alice"))).status).toBe(200);
  });

  it("upload limiter is stricter and per user", async () => {
    const cfg = testConfig();
    cfg.rateLimits.upload.limit = 2;
    const a = createApp(cfg, mockVerifier);
    const up = (who: "alice" | "bob") =>
      request(a)
        .post(`/images/upload/${ALBUM_B}`)
        .set(authz(who))
        .attach("images", Buffer.from("x"), { filename: "a.png", contentType: "image/png" });
    expect((await up("alice")).status).toBe(404);
    expect((await up("alice")).status).toBe(404);
    expect((await up("alice")).status).toBe(429);
    expect((await up("bob")).status).toBe(404); // separate bucket
  });
});
