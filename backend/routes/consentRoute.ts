import { Router, type Request, type Response } from "express";
import { currentUserId } from "../middleware/auth.js";
import { getConsent, recordConsent } from "../models/termsConsent.js";

/** Mounted at /me/consent behind requireAuth. The user is ALWAYS the verified token user. */
export function createConsentRouter(currentTermsVersion: string) {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      const row = await getConsent(currentUserId(req), currentTermsVersion);
      return res.json({
        currentTermsVersion,
        accepted: Boolean(row),
        acceptedVersion: row ? row.terms_version : null,
        acceptedAt: row ? new Date(row.accepted_at).toISOString() : null,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch consent" });
    }
  });

  router.post("/", async (req: Request, res: Response) => {
    try {
      const version = req.body?.termsVersion;
      if (typeof version !== "string" || version.length === 0) {
        return res.status(400).json({ error: "Invalid or missing termsVersion" });
      }
      if (version !== currentTermsVersion) {
        return res.status(400).json({ error: "termsVersion is not the current version" });
      }
      const { consent, created } = await recordConsent(currentUserId(req), currentTermsVersion);
      return res.status(created ? 201 : 200).json({
        termsVersion: consent.terms_version,
        acceptedAt: new Date(consent.accepted_at).toISOString(),
      });
    } catch (err) {
      if ((err as { code?: string })?.code === "23503") {
        // FK to neon_auth.users_sync: the Stack user has not been synced yet.
        return res.status(409).json({ error: "User profile not ready, retry shortly" });
      }
      console.error(err);
      return res.status(500).json({ error: "Failed to record consent" });
    }
  });

  return router;
}
