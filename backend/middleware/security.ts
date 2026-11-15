import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../config/env.js";

const tooMany = { error: "Too many requests, please try again later" };

export const securityHeaders = () => helmet();

/** Exact-match origin allowlist. No wildcard; empty list = no cross-origin access. */
export function corsMiddleware(allowedOrigins: string[]) {
  return cors({
    origin(origin, cb) {
      // No Origin header = non-browser or same-origin request; CORS does not apply.
      if (!origin) return cb(null, false);
      cb(null, allowedOrigins.includes(origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: false, // Bearer tokens, no cookies
    maxAge: 600,
  });
}

export function generalLimiter(cfg: AppConfig) {
  return rateLimit({ ...cfg.rateLimits.general, standardHeaders: "draft-7", legacyHeaders: false, message: tooMany });
}

/** Counts only 401 responses per IP (brute-force / token-spraying protection). Place BEFORE requireAuth. */
export function authFailureLimiter(cfg: AppConfig) {
  return rateLimit({
    ...cfg.rateLimits.authFailure,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: tooMany,
    requestWasSuccessful: (_req, res) => res.statusCode !== 401,
    skipSuccessfulRequests: true,
  });
}

/** Per-user limiter for uploads. Place AFTER requireAuth so req.auth is set. */
export function uploadLimiter(cfg: AppConfig) {
  return rateLimit({
    ...cfg.rateLimits.upload,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: tooMany,
    keyGenerator: (req: Request) => req.auth?.userId ?? "anonymous",
    validate: { keyGeneratorIpFallback: false },
  });
}

/** Per-user limiter for write routes (reads skipped). Place AFTER requireAuth so req.auth is set. */
export function writeLimiter(cfg: AppConfig) {
  return rateLimit({
    ...cfg.rateLimits.write,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: tooMany,
    skip: (req: Request) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS",
    keyGenerator: (req: Request) => req.auth?.userId ?? "anonymous",
    validate: { keyGeneratorIpFallback: false },
  });
}

/** Final error handler: consistent { error } shape, no internal details. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const e = err as { type?: string; status?: number; name?: string; code?: string };
  if (e?.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });
  if (e?.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed request body" });
  if (e?.name === "MulterError") {
    if (e.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File too large" });
    return res.status(400).json({ error: "Invalid upload" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
