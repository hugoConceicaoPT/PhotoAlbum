import { useEffect, useState } from "react";
import { stackClientApp } from "../stack";

/**
 * Whether the Google sign-in button may be shown. Reads the project's ENABLED OAuth providers from Stack
 * (`stackClientApp.getProject()` -> `project.config.oauthProviders`, a list of `{ id }`; the SDK fills it from
 * the project's `enabled_oauth_providers`).
 * Only an explicit "google" entry returns true. While the answer is unknown (loading), on any error, and when
 * Google is not listed, it returns false so the button stays hidden: nothing is shown that might not work.
 */
export function useGoogleEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const project = await stackClientApp.getProject();
        const providers = project.config.oauthProviders;
        if (!cancelled) setEnabled(Array.isArray(providers) && providers.some((p) => p.id === "google"));
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
