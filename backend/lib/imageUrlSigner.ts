import { v2 as cloudinary } from "cloudinary";

/** Lifetime of every read URL handed to a client (unchanged from the previous per-image signing). */
export const IMAGE_URL_TTL_SECONDS = 3600;

export interface SignedImageUrl {
  /** Absolute, time-limited read URL. Opaque to the client. */
  url: string;
  /** Time after which `url` is not guaranteed to work (enforcement depends on the provider). */
  expiresAt: Date;
}

/**
 * Storage boundary for read access. `objectKey` is the stored provider key
 * (today the Cloudinary public_id); it must never be sent to the client.
 * Swapping the adapter (Cloudinary today, OCI later) changes no API field.
 */
export interface ImageUrlSigner {
  getReadUrl(objectKey: string, ttlSeconds?: number): Promise<SignedImageUrl>;
}

/**
 * Cloudinary adapter. Signing is computed locally by the SDK (no network call).
 * Cloudinary credentials are configured once in routes/imageRoute.ts from environment variables.
 * Same options as the previous inline signing: authenticated delivery, signed, 1 hour.
 * Original size only: resized renditions were not enabled (see docs/api/albums-summaries-contract.md).
 */
export function createCloudinaryUrlSigner(): ImageUrlSigner {
  return {
    async getReadUrl(objectKey, ttlSeconds = IMAGE_URL_TTL_SECONDS) {
      const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttlSeconds;
      const url = cloudinary.url(objectKey, {
        type: "authenticated",
        sign_url: true,
        expires_at: expiresAtSeconds,
      });
      return { url, expiresAt: new Date(expiresAtSeconds * 1000) };
    },
  };
}
