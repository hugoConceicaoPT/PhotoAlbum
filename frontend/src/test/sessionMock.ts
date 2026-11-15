import { vi } from "vitest";
import type { SessionUser } from "../auth/session";

// Test double for ../auth/session. Set `session.user` per test (null = signed out).
export const session: { user: SessionUser | null } = { user: null };

export function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-1",
    displayName: "Ana Silva",
    email: "ana@example.com",
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export const sessionMock = { useCurrentUser: () => session.user };
