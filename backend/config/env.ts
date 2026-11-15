export interface AppConfig {
  /** Stack Auth project id (token audience). Required to verify tokens. */
  stackProjectId: string;
  /** Stack Auth API base URL (issuer / JWKS host). */
  stackApiUrl: string;
  /** Exact origins allowed by CORS. Empty = no cross-origin access. */
  allowedOrigins: string[];
  /** Number of reverse-proxy hops to trust for client IP (0 = none). */
  trustProxy: number;
  /** Current terms version users must accept. Placeholder until a Terms/Privacy document exists. */
  termsVersion: string;
  bodyLimit: string;
  /** Max cover images returned per album by GET /albums/summaries (1..MAX_ALBUM_COVER_IMAGES). */
  albumCoverImages: number;
  maxUploadBytes: number;
  rateLimits: {
    general: { windowMs: number; limit: number };
    authFailure: { windowMs: number; limit: number };
    upload: { windowMs: number; limit: number };
    write: { windowMs: number; limit: number };
  };
}

export const DEFAULT_BODY_LIMIT = "100kb";
export const DEFAULT_ALBUM_COVER_IMAGES = 5;
/** Hard ceiling for covers per album, regardless of configuration (bounds payload and signing work). */
export const MAX_ALBUM_COVER_IMAGES = 10;

/** Accepts only "<digits>(b|kb|mb)". An invalid value would silently disable body-parser limits, so fall back to the default. */
export function bodyLimitFrom(value: string | undefined): string {
  const v = value?.trim().toLowerCase();
  return v && /^[1-9]\d{0,5}(b|kb|mb)$/.test(v) ? v : DEFAULT_BODY_LIMIT;
}

export function coverImagesFrom(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_ALBUM_COVER_IMAGES;
  return Math.min(n, MAX_ALBUM_COVER_IMAGES);
}

function intFrom(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const allowedOrigins = (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => o.length > 0 && o !== "*");

  return {
    stackProjectId: env.STACK_PROJECT_ID ?? "",
    stackApiUrl: (env.STACK_API_URL ?? "https://api.stack-auth.com").replace(/\/+$/, ""),
    allowedOrigins,
    trustProxy: intFrom(env.TRUST_PROXY_HOPS, 0),
    termsVersion: env.TERMS_VERSION?.trim() || "placeholder-0",
    bodyLimit: bodyLimitFrom(env.BODY_LIMIT),
    albumCoverImages: coverImagesFrom(env.ALBUM_COVER_IMAGES),
    maxUploadBytes: intFrom(env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
    rateLimits: {
      general: { windowMs: 15 * 60_000, limit: intFrom(env.RATE_LIMIT_GENERAL, 300) },
      authFailure: { windowMs: 15 * 60_000, limit: intFrom(env.RATE_LIMIT_AUTH_FAILURES, 20) },
      upload: { windowMs: 15 * 60_000, limit: intFrom(env.RATE_LIMIT_UPLOAD, 30) },
      write: { windowMs: 15 * 60_000, limit: intFrom(env.RATE_LIMIT_WRITE, 60) },
    },
  };
}
