import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stackClientApp } from "../test/stackMock";
import { ApiError } from "./apiClient";
import { getConsent, isCurrent, recordConsent } from "./consent";
import { config } from "../config";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);

const fetchMock = vi.fn();
const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("consent API (through apiClient)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    stackClientApp.getUser.mockResolvedValue({
      getAuthJson: vi.fn().mockResolvedValue({ accessToken: "tok-1", refreshToken: "never-sent" }),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET /me/consent sends the Bearer token and returns the status", async () => {
    fetchMock.mockResolvedValue(
      json(200, { currentTermsVersion: "2026-11", accepted: false, acceptedVersion: null, acceptedAt: null }),
    );
    const status = await getConsent();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${config.serverAddress}/me/consent`);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok-1");
    expect(status).toEqual({
      currentTermsVersion: "2026-11",
      accepted: false,
      acceptedVersion: null,
      acceptedAt: null,
    });
  });

  it("rejects a response without a usable currentTermsVersion", async () => {
    fetchMock.mockResolvedValue(json(200, { accepted: true }));
    await expect(getConsent()).rejects.toThrow("Unexpected consent response");
  });

  it("POST /me/consent sends only { termsVersion }: no timestamp, version unchanged", async () => {
    fetchMock.mockResolvedValue(json(200, { termsVersion: "2026-11", acceptedAt: "2026-11-15T10:00:00Z" }));
    await recordConsent("2026-11");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${config.serverAddress}/me/consent`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ termsVersion: "2026-11" });
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok-1");
  });

  it("surfaces a 400 (not the current version) as an ApiError with the status only", async () => {
    fetchMock.mockResolvedValue(json(400, { message: "server detail" }));
    const error = await recordConsent("old").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).not.toContain("server detail");
  });

  it("isCurrent requires acceptance of exactly the current version", () => {
    const base = { currentTermsVersion: "2", accepted: true, acceptedVersion: "2", acceptedAt: "x" };
    expect(isCurrent(base)).toBe(true);
    expect(isCurrent({ ...base, acceptedVersion: "1" })).toBe(false);
    expect(isCurrent({ ...base, accepted: false })).toBe(false);
  });
});
