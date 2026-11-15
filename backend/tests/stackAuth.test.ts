import { beforeAll, describe, expect, it } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { createStackTokenVerifier } from "../lib/stackAuth.js";

const PROJECT = "proj-test";
const API = "https://api.example.test";
const ISS = `${API}/api/v1/projects/${PROJECT}`;
let priv: CryptoKey;
let verify: ReturnType<typeof createStackTokenVerifier>;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  priv = privateKey as CryptoKey;
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256", use: "sig" } as JWK;
  verify = createStackTokenVerifier({ projectId: PROJECT, apiUrl: API, keys: createLocalJWKSet({ keys: [jwk] }) });
});

const sign = (
  claims: Record<string, unknown> = {},
  o: { iss?: string; aud?: string; exp?: string | number; key?: CryptoKey } = {}
) =>
  new SignJWT({ role: "authenticated", is_anonymous: false, ...claims })
    .setProtectedHeader({ alg: "ES256", kid: "k1" })
    .setSubject("user-1")
    .setIssuer(o.iss ?? ISS)
    .setAudience(o.aud ?? PROJECT)
    .setIssuedAt()
    .setExpirationTime(o.exp ?? "5m")
    .sign(o.key ?? priv);

describe("Stack Auth token verifier", () => {
  it("accepts a valid token and returns the sub claim", async () => {
    expect(await verify(await sign())).toEqual({ userId: "user-1" });
  });
  it("rejects wrong issuer", async () => {
    await expect(verify(await sign({}, { iss: "https://evil.test" }))).rejects.toThrow();
  });
  it("rejects wrong audience (another project)", async () => {
    await expect(verify(await sign({}, { aud: "other-project" }))).rejects.toThrow();
  });
  it("rejects expired token", async () => {
    await expect(verify(await sign({}, { exp: Math.floor(Date.now() / 1000) - 3600 }))).rejects.toThrow();
  });
  it("rejects anonymous users", async () => {
    await expect(verify(await sign({ is_anonymous: true }))).rejects.toThrow();
  });
  it("rejects a token signed by an unknown key", async () => {
    const other = await generateKeyPair("ES256");
    await expect(verify(await sign({}, { key: other.privateKey as CryptoKey }))).rejects.toThrow();
  });
  it("rejects alg=none and garbage", async () => {
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const none = `${enc({ alg: "none" })}.${enc({ sub: "x", iss: ISS, aud: PROJECT })}.`;
    await expect(verify(none)).rejects.toThrow();
    await expect(verify("not-a-jwt")).rejects.toThrow();
  });
  it("requires a project id", () => {
    expect(() => createStackTokenVerifier({ projectId: "", apiUrl: API })).toThrow();
  });
});
