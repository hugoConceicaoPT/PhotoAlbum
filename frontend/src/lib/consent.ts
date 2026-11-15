import { apiJson } from "./apiClient";

/** Version identifiers are opaque: always sent back exactly as the server returned them. */
export type TermsVersion = string | number;

/** GET /me/consent (contract agreed with the Backend Engineer; see docs/api once published). */
export interface ConsentStatus {
  currentTermsVersion: TermsVersion;
  accepted: boolean;
  acceptedVersion: TermsVersion | null;
  acceptedAt: string | null;
}

/** POST /me/consent response. */
export interface ConsentRecord {
  termsVersion: TermsVersion;
  acceptedAt: string;
}

function isVersion(v: unknown): v is TermsVersion {
  return (typeof v === "string" && v !== "") || typeof v === "number";
}

export async function getConsent(): Promise<ConsentStatus> {
  const body = await apiJson<Partial<ConsentStatus>>("/me/consent");
  if (!body || typeof body !== "object" || !isVersion(body.currentTermsVersion)) {
    throw new Error("Unexpected consent response");
  }
  return {
    currentTermsVersion: body.currentTermsVersion,
    accepted: body.accepted === true,
    acceptedVersion: body.acceptedVersion ?? null,
    acceptedAt: body.acceptedAt ?? null,
  };
}

/** Records acceptance of `termsVersion`. The client never sends a timestamp: the server sets it. Idempotent. */
export function recordConsent(termsVersion: TermsVersion): Promise<ConsentRecord> {
  return apiJson<ConsentRecord>("/me/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ termsVersion }),
  });
}

/** True when the server says the user has accepted the version currently in force. */
export function isCurrent(status: ConsentStatus): boolean {
  return status.accepted && status.acceptedVersion === status.currentTermsVersion;
}
