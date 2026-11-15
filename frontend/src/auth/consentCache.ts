// Users whose consent was confirmed by the server in this page session: avoids a request on every
// navigation between pages. In-memory only (never persisted); the server remains the authority.
const confirmed = new Set<string>();

/** Auto-retry of a 409 ("account still being set up") right after sign-up. Tests set the delay to 0. */
export const consentTiming = { retryDelayMs: 1500, maxAutoRetries: 3 };

export const consentCache = {
  has: (userId: string) => confirmed.has(userId),
  add: (userId: string) => void confirmed.add(userId),
  /** Test helper: forget the confirmations. */
  reset: () => confirmed.clear(),
};
