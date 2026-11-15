import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ALICE, BOB } from "./helpers.js";

// In-memory fake mirroring the SQL: unique per (user, version), keyed by the user id argument only.
const store = new Map<string, { user_id: string; terms_version: string; accepted_at: Date }>();
const key = (u: string, v: string) => `${u}|${v}`;
const consentModel = {
  getConsent: vi.fn(async (u: string, v: string) => store.get(key(u, v))),
  recordConsent: vi.fn(async (u: string, v: string) => {
    const existing = store.get(key(u, v));
    if (existing) return { consent: existing, created: false };
    const row = { user_id: u, terms_version: v, accepted_at: new Date("2026-11-15T10:00:00.000Z") };
    store.set(key(u, v), row);
    return { consent: row, created: true };
  }),
};
vi.mock("../models/termsConsent.js", () => consentModel);
vi.mock("../models/album.js", async () => (await import("./mocks.js")).albumModel);
vi.mock("../models/collection.js", async () => (await import("./mocks.js")).collectionModel);
vi.mock("../models/image.js", async () => (await import("./mocks.js")).imageModel);

const { createApp } = await import("../app.js");
const { authz, mockVerifier, testConfig } = await import("./helpers.js");

const VERSION = "test-v1";
const app = createApp(testConfig({ termsVersion: VERSION }), mockVerifier);

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("GET/POST /me/consent", () => {
  it("401 without token on both methods", async () => {
    for (const res of [await request(app).get("/me/consent"), await request(app).post("/me/consent").send({ termsVersion: VERSION })]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
    expect(consentModel.recordConsent).not.toHaveBeenCalled();
  });

  it("GET before acceptance", async () => {
    const res = await request(app).get("/me/consent").set(authz("alice"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentTermsVersion: VERSION, accepted: false, acceptedVersion: null, acceptedAt: null });
  });

  it("POST 400 for missing, non-string and wrong version", async () => {
    for (const body of [{}, { termsVersion: 1 }, { termsVersion: "" }, { termsVersion: "old-v0" }]) {
      const res = await request(app).post("/me/consent").set(authz("alice")).send(body);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
    expect(consentModel.recordConsent).not.toHaveBeenCalled();
  });

  it("POST records (201), is idempotent (200), and GET reflects acceptance", async () => {
    const first = await request(app).post("/me/consent").set(authz("alice")).send({ termsVersion: VERSION });
    expect(first.status).toBe(201);
    expect(first.body).toEqual({ termsVersion: VERSION, acceptedAt: "2026-11-15T10:00:00.000Z" });

    const second = await request(app).post("/me/consent").set(authz("alice")).send({ termsVersion: VERSION });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(store.size).toBe(1);

    const get = await request(app).get("/me/consent").set(authz("alice"));
    expect(get.body).toEqual({
      currentTermsVersion: VERSION,
      accepted: true,
      acceptedVersion: VERSION,
      acceptedAt: "2026-11-15T10:00:00.000Z",
    });
  });

  it("the user comes from the token only; a userId in the body is ignored and users are isolated", async () => {
    await request(app).post("/me/consent").set(authz("alice")).send({ termsVersion: VERSION, userId: BOB, user_id: BOB });
    expect(consentModel.recordConsent).toHaveBeenCalledWith(ALICE, VERSION);
    expect(store.has(key(BOB, VERSION))).toBe(false);

    const bob = await request(app).get("/me/consent").set(authz("bob")).query({ userId: ALICE });
    expect(consentModel.getConsent).toHaveBeenLastCalledWith(BOB, VERSION);
    expect(bob.body.accepted).toBe(false);
    expect(bob.body.acceptedAt).toBeNull();
  });

  it("a server error returns the generic shape without details", async () => {
    consentModel.getConsent.mockRejectedValueOnce(new Error("db down: secret"));
    const res = await request(app).get("/me/consent").set(authz("alice"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });

  it("POST is rate limited per user (429), GET is not counted", async () => {
    const limited = createApp(
      testConfig({
        termsVersion: VERSION,
        rateLimits: { ...testConfig().rateLimits, write: { windowMs: 60_000, limit: 2 } },
      }),
      mockVerifier,
    );
    for (let i = 0; i < 5; i++) await request(limited).get("/me/consent").set(authz("alice"));
    expect((await request(limited).post("/me/consent").set(authz("alice")).send({ termsVersion: VERSION })).status).toBe(201);
    expect((await request(limited).post("/me/consent").set(authz("alice")).send({ termsVersion: VERSION })).status).toBe(200);
    expect((await request(limited).post("/me/consent").set(authz("alice")).send({ termsVersion: VERSION })).status).toBe(429);
    expect((await request(limited).post("/me/consent").set(authz("bob")).send({ termsVersion: VERSION })).status).toBe(201);
  });
});
