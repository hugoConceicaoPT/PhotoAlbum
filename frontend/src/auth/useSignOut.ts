import { useState } from "react";
import type { SessionUser } from "./session";

/** Shared sign-out behaviour of the desktop account menu and the mobile account sheet. */
export function useSignOut(user: SessionUser) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await user.signOut(); // redirects to the afterSignOut URL ("/")
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return { busy, failed, signOut };
}
