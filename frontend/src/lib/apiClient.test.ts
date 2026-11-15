import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stackClientApp } from "../test/stackMock";
import { apiFetch, apiJson, ApiError } from "./apiClient";
import { config } from "../config";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);

const url = (path: string) => `${config.serverAddress}${path}`;
const fetchMock = vi.fn();
const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function signedInAs(tokens: string[]) {
  const getAuthJson = vi.fn();
  tokens.forEach((t) => getAuthJson.mockResolvedValueOnce({ accessToken: t, refreshToken: "never-sent" }));
  stackClientApp.getUser.mockResolvedValue({ getAuthJson });
}

describe("apiClient (central token handling)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the access token only in the Authorization header, never in the URL, and never the refresh token", async () => {
    signedInAs(["tok-1"]);
    fetchMock.mockResolvedValue(json(200, []));
    await apiFetch(url("/albums"));
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(url("/albums"));
    expect(calledUrl).not.toContain("tok-1");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok-1");
    expect(JSON.stringify(init)).not.toContain("never-sent");
  });

  it("retries once on 401 with a fresh token", async () => {
    signedInAs(["old", "fresh"]);
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(200, [{ id: "a" }]));
    expect(await apiJson(url("/albums"))).toEqual([{ id: "a" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get("Authorization")).toBe("Bearer fresh");
  });

  it("throws ApiError carrying only the status when the retry also fails", async () => {
    signedInAs(["a", "b"]);
    fetchMock.mockResolvedValue(json(401, { error: "secret server detail" }));
    const error = await apiJson(url("/albums")).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).message).not.toContain("secret");
  });

  it("sends no Authorization header when signed out (the backend answers 401)", async () => {
    stackClientApp.getUser.mockResolvedValue(null);
    fetchMock.mockResolvedValue(json(401));
    await apiFetch(url("/albums"));
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has("Authorization")).toBe(false);
  });

  it("refuses to send credentials to a URL outside the API origin", async () => {
    signedInAs(["tok"]);
    await expect(apiFetch("https://evil.example/albums")).rejects.toThrow(/non-API URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
