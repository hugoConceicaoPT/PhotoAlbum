// A short-lived HINT that the user ticked the terms checkbox on Registar just before creating the account
// (credentials or Google OAuth, which leaves the page). It only lets the consent gate record the acceptance
// automatically after the sign-up; the server stays the authority and the gate asks the user whenever the
// hint is missing, expired or sessionStorage is unavailable. It carries no personal data.

const KEY = "pm.consentHint";
const MAX_AGE_MS = 15 * 60 * 1000;

export function setConsentHint(): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage unavailable: the gate will ask instead */
  }
}

export function hasConsentHint(): boolean {
  try {
    const at = Number(sessionStorage.getItem(KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function clearConsentHint(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
