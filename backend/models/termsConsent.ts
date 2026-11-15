import sql from "../config/db.js";

export interface TermsConsent {
  user_id: string;
  terms_version: string;
  accepted_at: string | Date;
}

/**
 * Server-side record of terms acceptance. One row per (user, version).
 * accepted_at is always set by the database clock, never by the client.
 * No IP address or other personal data is stored.
 */
export async function createTermsConsentTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS terms_consents (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id) ON DELETE CASCADE,
      terms_version TEXT NOT NULL,
      accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT terms_consents_user_version_key UNIQUE (user_id, terms_version)
    );
  `;
  // The unique constraint above already creates an index with user_id as the leading column,
  // so lookups by user are indexed; no separate index is needed.
  console.log("✅ Table 'terms_consents' ready");
}

/** The user's acceptance of one specific version, or undefined. */
export async function getConsent(userId: string, termsVersion: string) {
  const [row] = (await sql`
    SELECT user_id, terms_version, accepted_at
    FROM terms_consents
    WHERE user_id = ${userId} AND terms_version = ${termsVersion};
  `) as TermsConsent[];
  return row;
}

/** Idempotent insert. Returns the stored row (existing one if already recorded) and whether it was newly created. */
export async function recordConsent(userId: string, termsVersion: string) {
  const inserted = (await sql`
    INSERT INTO terms_consents (user_id, terms_version)
    VALUES (${userId}, ${termsVersion})
    ON CONFLICT (user_id, terms_version) DO NOTHING
    RETURNING user_id, terms_version, accepted_at;
  `) as TermsConsent[];
  if (inserted[0]) return { consent: inserted[0], created: true };
  const existing = await getConsent(userId, termsVersion);
  return { consent: existing as TermsConsent, created: false };
}
