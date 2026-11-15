import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "./session";

/**
 * Route guard for protected pages: signed-out visitors go to /login.
 * This is a UX convenience only: the backend rejects unauthenticated API calls (401).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Login/Registar are for signed-out visitors; signed-in users go to Home ("/", owner decision). */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
