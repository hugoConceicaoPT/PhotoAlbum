import express, { Router, type Express } from "express";
import albumRoutes from "./routes/albumRoute.js";
import collectionRoutes from "./routes/collectionRoute.js";
import { createImageRouter } from "./routes/imageRoute.js";
import { createAlbumSummariesRouter } from "./routes/albumSummaryRoute.js";
import { createConsentRouter } from "./routes/consentRoute.js";
import { requireAuth } from "./middleware/auth.js";
import {
  authFailureLimiter,
  corsMiddleware,
  errorHandler,
  generalLimiter,
  securityHeaders,
  writeLimiter,
} from "./middleware/security.js";
import type { AppConfig } from "./config/env.js";
import type { TokenVerifier } from "./lib/stackAuth.js";
import { createCloudinaryUrlSigner, type ImageUrlSigner } from "./lib/imageUrlSigner.js";

export interface AppDeps {
  /** Produces time-limited image read URLs. Defaults to the Cloudinary adapter. */
  urlSigner?: ImageUrlSigner;
}

/** Builds the Express app. Config and the token verifier are injected so tests can mock them. */
export function createApp(
  config: AppConfig,
  verify: TokenVerifier,
  mountExtra?: (app: Express) => void,
  deps: AppDeps = {}
) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy > 0) app.set("trust proxy", config.trustProxy);
  const urlSigner = deps.urlSigner ?? createCloudinaryUrlSigner();

  app.use(securityHeaders());
  app.use(corsMiddleware(config.allowedOrigins));
  app.use(generalLimiter(config));
  // No body parser runs before authentication: JSON is parsed per router, AFTER `protect`,
  // so unauthenticated callers never make the server read or parse a body. urlencoded is not used.
  const json = express.json({ limit: config.bodyLimit });

  // Public: liveness text only.
  app.get("/", (_req, res) => {
    res.send("Hello from the server!");
  });

  // Everything below requires a verified Stack Auth access token (checked exactly once per request).
  const protect = [authFailureLimiter(config), requireAuth(verify)];

  // /albums/summaries must be matched before the generic album routes.
  const albums = Router();
  albums.use("/summaries", createAlbumSummariesRouter(config, urlSigner));
  albums.use(json, albumRoutes);
  app.use("/albums", ...protect, albums);

  app.use("/collections", ...protect, json, collectionRoutes);
  // Consent: GET is a read; POST gets the per-user write limiter (reads are skipped by it).
  app.use("/me/consent", ...protect, writeLimiter(config), json, createConsentRouter(config.termsVersion));
  // Images: multipart uploads (multer) and no JSON bodies; the upload limiter lives in the image router.
  app.use("/images", ...protect, createImageRouter(config, urlSigner));

  mountExtra?.(app);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);
  return app;
}
