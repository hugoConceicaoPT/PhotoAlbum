import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export interface VerifiedUser {
  /** Stack Auth user id (JWT `sub`). Equals neon_auth.users_sync.id. */
  userId: string;
}

/**
 * Thrown when the token cannot be judged because the key source (JWKS) is unreachable.
 * Distinct from "invalid token": the caller is not at fault, so the API answers 503, not 401.
 */
export class VerifierUnavailableError extends Error {
  constructor() {
    super("Token verification service unavailable");
    this.name = "VerifierUnavailableError";
  }
}

const NETWORK_CODES = new Set([
  "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "ENETUNREACH", "EHOSTUNREACH",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET", "UND_ERR_HEADERS_TIMEOUT",
]);

/**
 * Positive identification of a key-source outage only. Anything else (bad signature, expired,
 * wrong claims, unknown kid, malformed token, ...) stays an authentication failure (401), so
 * 401s keep counting toward the failure limiter and no attacker-controlled input maps to 503.
 */
export function isKeySourceOutage(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown; cause?: unknown } | null;
  if (!e || typeof e !== "object") return false;
  if (e.code === "ERR_JWKS_TIMEOUT") return true;
  if (typeof e.code === "string" && NETWORK_CODES.has(e.code)) return true;
  if (err instanceof TypeError && e.message === "fetch failed") return true;
  if (typeof e.message === "string" && e.message.startsWith("Expected 200 OK from the JSON Web Key Set")) return true;
  const cause = e.cause as { code?: unknown } | undefined;
  return typeof cause?.code === "string" && NETWORK_CODES.has(cause.code);
}

export type TokenVerifier = (token: string) => Promise<VerifiedUser>;

export interface VerifierOptions {
  projectId: string;
  apiUrl: string;
  /** Override the key source (tests). Defaults to Stack Auth's remote JWKS. */
  keys?: JWTVerifyGetKey;
}

/**
 * Verifies Stack Auth access tokens locally (signature via the project's JWKS,
 * ES256 only, issuer + audience pinned). Issuer = <api>/api/v1/projects/<projectId>,
 * jwks = <issuer>/.well-known/jwks.json (this mirrors the Stack Auth SDK convention; the SDK itself is not a dependency). The default JWKS endpoint excludes
 * anonymous-user keys; anonymous tokens are additionally rejected via claim.
 */
export function createStackTokenVerifier(opts: VerifierOptions): TokenVerifier {
  if (!opts.projectId) throw new Error("STACK_PROJECT_ID is required");
  const issuer = `${opts.apiUrl}/api/v1/projects/${opts.projectId}`;
  const keys: JWTVerifyGetKey =
    opts.keys ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

  return async (token) => {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, keys, {
        issuer,
        audience: opts.projectId,
        algorithms: ["ES256"],
        clockTolerance: 5,
        requiredClaims: ["sub", "exp", "iss", "aud"],
      }));
    } catch (err) {
      if (isKeySourceOutage(err)) throw new VerifierUnavailableError();
      throw err;
    }
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("Token has no subject");
    }
    if (payload.is_anonymous === true) throw new Error("Anonymous users not allowed");
    if (payload.role !== undefined && payload.role !== "authenticated") {
      throw new Error("Unexpected role");
    }
    return { userId: payload.sub };
  };
}
