import type { NextFunction, Request, Response } from "express";
import { VerifierUnavailableError, type TokenVerifier } from "../lib/stackAuth.js";

declare module "express-serve-static-core" {
  interface Request {
    /** Set by requireAuth; the ONLY trusted source of the caller's identity. */
    auth?: { userId: string };
  }
}

export function requireAuth(verify: TokenVerifier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const match = typeof header === "string" ? /^Bearer ([^\s]+)$/i.exec(header) : null;
    if (!match || !match[1]) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const user = await verify(match[1]);
      req.auth = { userId: user.userId };
      return next();
    } catch (err) {
      if (err instanceof VerifierUnavailableError) {
        // Key source unreachable: not the caller's fault. 503 (not 401) so clients retry instead of signing out.
        // The failure limiter counts only 401, so 503 is intentionally not counted.
        res.set("Retry-After", "5");
        return res.status(503).json({ error: "Authentication service temporarily unavailable" });
      }
      // Never log or echo the token or the verification failure detail.
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

/** Returns the authenticated user id; throws if requireAuth did not run. */
export function currentUserId(req: Request): string {
  if (!req.auth) throw new Error("requireAuth middleware missing");
  return req.auth.userId;
}
