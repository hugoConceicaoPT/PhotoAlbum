import { vi } from "vitest";
import type { AppConfig } from "../config/env.js";
import { loadConfig } from "../config/env.js";
import type { TokenVerifier } from "../lib/stackAuth.js";

export const ALICE = "stack-user-alice";
export const BOB = "stack-user-bob";
export const ALBUM_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // owned by ALICE
export const ALBUM_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // owned by BOB
export const COLL_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // in ALBUM_A
export const IMG_A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; // in COLL_A

/** Mocked Stack Auth verification: no network, no real tokens. */
export const mockVerifier: TokenVerifier = vi.fn(async (token: string) => {
  if (token === "token-alice") return { userId: ALICE };
  if (token === "token-bob") return { userId: BOB };
  throw new Error("bad token");
});

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const base = loadConfig({ STACK_PROJECT_ID: "proj-test", CORS_ALLOWED_ORIGINS: "http://localhost:5173" });
  return {
    ...base,
    rateLimits: {
      general: { windowMs: 60_000, limit: 1000 },
      authFailure: { windowMs: 60_000, limit: 1000 },
      upload: { windowMs: 60_000, limit: 1000 },
      write: { windowMs: 60_000, limit: 1000 },
    },
    ...overrides,
  };
}

export const authz = (who: "alice" | "bob") => ({ Authorization: `Bearer token-${who}` });
