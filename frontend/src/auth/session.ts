import { useUser } from "@stackframe/react";

/** The few user fields the UI needs. Tokens are never exposed through this hook. */
export interface SessionUser {
  id: string;
  displayName: string | null;
  email: string | null;
  signOut: () => Promise<void>;
}

/**
 * Current Stack user, or null when signed out. Suspends while the session loads
 * (main.tsx wraps the app in <Suspense>). Components depend on this hook rather than
 * on the Stack SDK so they can be tested with a mock.
 */
export function useCurrentUser(): SessionUser | null {
  const user = useUser();
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.primaryEmail,
    signOut: () => user.signOut(),
  };
}
