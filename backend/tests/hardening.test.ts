import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { collectionModel } from "./mocks.js";

const consent = { getConsent: vi.fn(async () => undefined), recordConsent: vi.fn() };
vi.mock("../models/termsConsent.js", () => consent);
vi.mock("../models/album.js", async () => (await import("./mocks.js")).albumModel);
vi.mock("../models/collection.js", async () => (await import("./mocks.js")).collectionModel);
vi.mock("../models/image.js", async () => (await import("./mocks.js")).imageModel);
vi.mock("cloudinary", () => ({
  v2: { config: () => undefined, url: () => "https://signed.example/img", uploader: {}, api: {} },
}));

const { createApp } = await import("../app.js");
const { ALBUM_A, COLL_A, authz, mockVerifier, testConfig } = await import("./helpers.js");
const { isRealIsoDate, optionalDate } = await import("../lib/validation.js");
const { bodyLimitFrom, coverImagesFrom, loadConfig, MAX_ALBUM_COVER_IMAGES } = await import("../config/env.js");
const { createStackTokenVerifier, VerifierUnavailableError, isKeySourceOutage } = await import("../lib/stackAuth.js");

const app = createApp(testConfig(), mockVerifier);
beforeEach(() => vi.clearAllMocks());

describe("L2: calendar-valid dates only", () => {
  it.each(["2026-02-31", "2026-13-01", "2026-00-10", "2026-04-31", "0000-01-01", "2026-1-1", "26-01-01", "2026-01-01T00:00:00Z", ""])(
    "isRealIsoDate(%j) is false",
    (v) => expect(isRealIsoDate(v)).toBe(false)
  );
  it.each(["2026-02-28", "2024-02-29", "2026-12-31"])("isRealIsoDate(%j) is true", (v) => expect(isRealIsoDate(v)).toBe(true));
  it("a non-leap Feb 29 is rejected", () => expect(optionalDate("2026-02-29")).toBe("invalid"));
  it("undefined and null pass through", () => {
    expect(optionalDate(undefined)).toBeUndefined();
    expect(optionalDate(null)).toBeNull();
  });
  it.each(["2026-02-31", "2026-13-01"])("POST and PUT /collections with %s -> 400, model not called", async (d) => {
    const post = await request(app).post("/collections").set(authz("alice")).send({ album_id: ALBUM_A, name: "n", beginDate: d });
    expect(post.status).toBe(400);
    expect(post.body).toEqual({ error: expect.any(String) });
    const put = await request(app).put(`/collections/${COLL_A}`).set(authz("alice")).send({ endDate: d });
    expect(put.status).toBe(400);
    expect(collectionModel.insertCollection).not.toHaveBeenCalled();
    expect(collectionModel.updateCollection).not.toHaveBeenCalled();
  });
  it("a real date still works", async () => {
    const put = await request(app).put(`/collections/${COLL_A}`).set(authz("alice")).send({ beginDate: "2026-02-28" });
    expect(put.status).toBe(200);
  });
});

describe("L1: null clears, undefined keeps (route level)", () => {
  it("PUT {description: null, endDate: null} reaches the model as null; absent keys are not passed", async () => {
    const res = await request(app).put(`/collections/${COLL_A}`).set(authz("alice")).send({ description: null, endDate: null });
    expect(res.status).toBe(200);
    const [, , fields] = collectionModel.updateCollection.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(fields).toEqual({ description: null, endDate: null });
    expect("name" in fields).toBe(false);
    expect("beginDate" in fields).toBe(false);
  });
  it("name stays non-nullable: {name: null} -> 400", async () => {
    const res = await request(app).put(`/collections/${COLL_A}`).set(authz("alice")).send({ name: null });
    expect(res.status).toBe(400);
    expect(collectionModel.updateCollection).not.toHaveBeenCalled();
  });
  it("an empty body is still 'Nothing to update'", async () => {
    const res = await request(app).put(`/collections/${COLL_A}`).set(authz("alice")).send({});
    expect(res.status).toBe(400);
  });
});

describe("L7: no body parsing before authentication", () => {
  const big = { name: "x".repeat(200_000) };
  it("unauthenticated oversize body -> 401 (not parsed, not 413)", async () => {
    for (const path of ["/albums", "/collections", "/me/consent"]) {
      const res = await request(app).post(path).send(big);
      expect(res.status).toBe(401);
    }
  });
  it("authenticated oversize body -> 413 { error }", async () => {
    const res = await request(app).post("/albums").set(authz("alice")).send(big);
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "Request body too large" });
  });
  it("JSON bodies still work on every router", async () => {
    expect((await request(app).post("/albums").set(authz("alice")).send({ name: "ok" })).status).toBe(201);
    expect((await request(app).post("/collections").set(authz("alice")).send({ album_id: ALBUM_A, name: "ok" })).status).toBe(201);
    consent.recordConsent.mockResolvedValue({ consent: { terms_version: "v", accepted_at: new Date() }, created: true });
    const cfgApp = createApp(testConfig({ termsVersion: "v" }), mockVerifier);
    expect((await request(cfgApp).post("/me/consent").set(authz("alice")).send({ termsVersion: "v" })).status).toBe(201);
  });
  it("malformed JSON -> 400 { error }", async () => {
    const res = await request(app).post("/albums").set(authz("alice")).set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Malformed request body" });
  });
  it("application/x-www-form-urlencoded is no longer parsed", async () => {
    const res = await request(app).post("/albums").set(authz("alice")).type("form").send("name=viaForm");
    expect(res.status).toBe(400);
  });
});

describe("BODY_LIMIT validation", () => {
  it.each(["100kb", "1mb", "512b", " 2MB "])("accepts %j", (v) => expect(bodyLimitFrom(v)).toBe(v.trim().toLowerCase()));
  it.each([undefined, "", "abc", "-1kb", "10", "1gb", "0kb", "1e3kb", "100 kb", "kb"])("falls back to 100kb for %j", (v) =>
    expect(bodyLimitFrom(v)).toBe("100kb")
  );
  it("loadConfig applies it", () => expect(loadConfig({ BODY_LIMIT: "nonsense" }).bodyLimit).toBe("100kb"));
});

describe("ALBUM_COVER_IMAGES config", () => {
  it("defaults to 5, clamps to the safe maximum, ignores junk", () => {
    expect(coverImagesFrom(undefined)).toBe(5);
    expect(coverImagesFrom("3")).toBe(3);
    expect(coverImagesFrom("0")).toBe(5);
    expect(coverImagesFrom("-2")).toBe(5);
    expect(coverImagesFrom("abc")).toBe(5);
    expect(coverImagesFrom("9999")).toBe(MAX_ALBUM_COVER_IMAGES);
  });
});

describe("L6: key-source outage -> 503, everything else stays 401", () => {
  const outage = vi.fn(async () => {
    throw new VerifierUnavailableError();
  });

  it("middleware: outage -> 503 { error } with Retry-After; no secrets", async () => {
    const a = createApp(testConfig(), outage);
    const res = await request(a).get("/albums").set(authz("alice"));
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "Authentication service temporarily unavailable" });
    expect(res.headers["retry-after"]).toBe("5");
  });
  it("503 does not count toward the 401 failure limiter", async () => {
    const cfg = testConfig();
    cfg.rateLimits.authFailure.limit = 2;
    const a = createApp(cfg, outage);
    for (let i = 0; i < 6; i++) expect((await request(a).get("/albums").set(authz("alice"))).status).toBe(503);
  });
  it("any other verifier error is still 401 and counts", async () => {
    const cfg = testConfig();
    cfg.rateLimits.authFailure.limit = 2;
    const a = createApp(cfg, async () => {
      throw new Error("anything else");
    });
    expect((await request(a).get("/albums").set(authz("alice"))).status).toBe(401);
    expect((await request(a).get("/albums").set(authz("alice"))).status).toBe(401);
    expect((await request(a).get("/albums").set(authz("alice"))).status).toBe(429);
  });

  describe("verifier", () => {
    const PROJECT = "proj-test";
    const API = "https://api.example.test";
    const ISS = `${API}/api/v1/projects/${PROJECT}`;

    const failingKeys = (err: unknown) =>
      (async () => {
        throw err;
      }) as never;
    const sign = async (key: CryptoKey, withExp: boolean) => {
      let jwt = new SignJWT({ role: "authenticated", is_anonymous: false })
        .setProtectedHeader({ alg: "ES256", kid: "k1" })
        .setSubject("user-1")
        .setIssuer(ISS)
        .setAudience(PROJECT)
        .setIssuedAt();
      if (withExp) jwt = jwt.setExpirationTime("5m");
      return jwt.sign(key);
    };

    it.each([
      ["JWKS timeout", Object.assign(new Error("timeout"), { code: "ERR_JWKS_TIMEOUT" })],
      ["fetch failed", new TypeError("fetch failed")],
      ["ECONNREFUSED", Object.assign(new Error("x"), { code: "ECONNREFUSED" })],
      ["nested cause", Object.assign(new Error("x"), { cause: { code: "ENOTFOUND" } })],
      ["JWKS HTTP error", new Error("Expected 200 OK from the JSON Web Key Set HTTP response")],
    ])("%s -> VerifierUnavailableError", async (_n, err) => {
      const v = createStackTokenVerifier({ projectId: PROJECT, apiUrl: API, keys: failingKeys(err) });
      const { privateKey } = await generateKeyPair("ES256");
      await expect(v(await sign(privateKey as CryptoKey, true))).rejects.toBeInstanceOf(VerifierUnavailableError);
    });

    it("attacker-controllable failures are NOT outages", () => {
      expect(isKeySourceOutage(new TypeError("Invalid key"))).toBe(false);
      expect(isKeySourceOutage(Object.assign(new Error("no kid"), { code: "ERR_JWKS_NO_MATCHING_KEY" }))).toBe(false);
      expect(isKeySourceOutage(Object.assign(new Error("sig"), { code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" }))).toBe(false);
      expect(isKeySourceOutage(new Error("anything"))).toBe(false);
      expect(isKeySourceOutage(undefined)).toBe(false);
    });

    it("requires exp: a validly signed token without exp is rejected (401 class)", async () => {
      const { privateKey, publicKey } = await generateKeyPair("ES256");
      const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256", use: "sig" } as JWK;
      const v = createStackTokenVerifier({ projectId: PROJECT, apiUrl: API, keys: createLocalJWKSet({ keys: [jwk] }) });
      await expect(v(await sign(privateKey as CryptoKey, false))).rejects.not.toBeInstanceOf(VerifierUnavailableError);
      await expect(v(await sign(privateKey as CryptoKey, false))).rejects.toThrow();
      expect(await v(await sign(privateKey as CryptoKey, true))).toEqual({ userId: "user-1" });
    });
  });
});
