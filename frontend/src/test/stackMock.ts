import { vi } from "vitest";

// Shared test double for ../stack (the real module builds a StackClientApp and needs env keys).
// Methods are vi.fn() so tests can script results; call vi.resetAllMocks() between tests.
export const stackClientApp = {
  urls: {
    signIn: "/login",
    signUp: "/registar",
    forgotPassword: "/handler/forgot-password",
  },
  signInWithCredential: vi.fn(),
  signUpWithCredential: vi.fn(),
  signInWithOAuth: vi.fn(),
  getUser: vi.fn(),
  getProject: vi.fn(),
};

export const stackMock = { stackClientApp };
