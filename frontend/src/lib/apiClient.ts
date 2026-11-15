import { stackClientApp } from "../stack";
import { config } from "../config";

/** Error for a non-2xx API response. Only the status is kept: no server text reaches the UI. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP error! status: ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * The ONE place where the Stack access token is attached to backend calls
 * (contract: docs/api/auth-contract.md, section 1).
 * - Sent only in the Authorization header, never in URLs; never logged or stored here.
 * - Fetched per request (the SDK refreshes it); the refresh token is never read.
 * - Only URLs under the configured API origin get the token.
 */
async function currentAccessToken(): Promise<string | null> {
  const user = await stackClientApp.getUser({ or: "return-null" });
  if (!user) return null;
  const { accessToken } = await user.getAuthJson();
  return accessToken;
}

function isApiUrl(url: string): boolean {
  const base = config.serverAddress.replace(/\/+$/, "");
  return url === base || url.startsWith(`${base}/`);
}

async function send(url: string, init: RequestInit): Promise<Response> {
  const token = await currentAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

/**
 * fetch() for the application backend. Retries once on 401 with a fresh token, then returns the
 * response as is (callers decide how to present it). Throws if `url` is not under the API origin.
 */
export async function apiFetch(target: string, init: RequestInit = {}): Promise<Response> {
  // Accepts an absolute API URL or a path such as "/albums" (resolved against the API base).
  const url = target.startsWith("/")
    ? `${config.serverAddress.replace(/\/+$/, "")}${target}`
    : target;
  if (!isApiUrl(url)) throw new Error("Refusing to send credentials to a non-API URL");
  const response = await send(url, init);
  if (response.status !== 401) return response;
  return send(url, init);
}

/** apiFetch + status check + JSON body. */
export async function apiJson<T>(target: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(target, init);
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as T;
}
