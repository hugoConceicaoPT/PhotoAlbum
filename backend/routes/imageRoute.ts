import { Router, type Request, type Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { addImage, deleteImage, getImageById, getImagesByCollectionId, type Image } from "../models/image.js";
import { getCollectionById } from "../models/collection.js";
import fs from "fs/promises";
import { currentUserId } from "../middleware/auth.js";
import { isUuid } from "../lib/validation.js";
import type { AppConfig } from "../config/env.js";
import { uploadLimiter } from "../middleware/security.js";
import { hasImageSignature } from "../lib/imageSignature.js";
import type { ImageUrlSigner } from "../lib/imageUrlSigner.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Cloudinary config (from .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * Mounted at /images behind requireAuth (see app.ts). The upload route carries its own
 * per-user rate limiter, placed before multer so rejected requests never write temp files.
 */
export function createImageRouter(config: AppConfig, signer: ImageUrlSigner) {
  const router = Router();

  const upload = multer({
    dest: "uploads/", // temporary local storage; files are always removed by the handler
    limits: { fileSize: config.maxUploadBytes, files: 10 },
    fileFilter: (_req, file, cb) => {
      // First gate: client-declared type. The content is verified after the file is on disk.
      if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
      else cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    },
  });

  // ---------------- GET IMAGES BY COLLECTION ----------------
  router.get("/collection/:collectionId", async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      if (!isUuid(collectionId)) return res.status(404).json({ error: "Collection not found" });
      const userId = currentUserId(req);
      if (!(await getCollectionById(collectionId, userId))) {
        return res.status(404).json({ error: "Collection not found" });
      }
      const images = await getImagesByCollectionId(collectionId, userId);

      const signedImages = await Promise.all(
        images.map(async (img) => {
          const { url, expiresAt } = await signer.getReadUrl(img.public_id);
          return {
            ...img, // legacy fields (image_url, public_id) kept for existing consumers; deprecated
            signed_url: url, // legacy name, same value as `url`; deprecated
            url,
            expiresAt: expiresAt.toISOString(),
          };
        })
      );

      res.set("Cache-Control", "private, no-store");
      return res.json(signedImages);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch images for collection" });
    }
  });

  // ---------------- MULTI IMAGE UPLOAD ----------------
  router.post(
    "/upload/:collectionId",
    uploadLimiter(config),
    upload.array("images", 10), // accept up to 10 images at once
    async (req: Request, res: Response) => {
      const files = (req.files ?? []) as Express.Multer.File[];
      const outcome = await handleUpload(req, files);
      // Temp files are removed BEFORE the response is sent, on every exit path.
      await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => undefined)));
      return res.status(outcome.status).json(outcome.body);
    }
  );

  type Outcome = { status: number; body: object };

  async function handleUpload(req: Request, files: Express.Multer.File[]): Promise<Outcome> {
    try {
      const { collectionId } = req.params;
      if (!isUuid(collectionId)) return { status: 404, body: { error: "Collection not found" } };
      if (files.length === 0) return { status: 400, body: { error: "No image files provided" } };

      // Ownership check (also gives the collection name for the folder)
      const collection = await getCollectionById(collectionId, currentUserId(req));
      if (!collection) return { status: 404, body: { error: "Collection not found" } };

      // Content check on the temp files (first bytes only) BEFORE anything is sent to storage.
      for (const file of files) {
        if (!(await hasImageSignature(file.path))) {
          return { status: 400, body: { error: "Invalid image file" } };
        }
      }

      const folderName = `collections/${collection.name.replace(/\s+/g, "_")}`;
      const uploadedImages: Image[] = [];

      // Upload each file sequentially
      for (const file of files) {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: folderName,
          type: "authenticated",
        });

        const newImage = await addImage(collectionId, uploadResult.secure_url, uploadResult.public_id);
        if (!newImage) return { status: 400, body: { error: "Problem inserting image on database" } };
        uploadedImages.push(newImage);
      }

      return {
        status: 201,
        body: {
          message: `✅ Uploaded ${uploadedImages.length} image(s) to ${folderName}`,
          images: uploadedImages,
        },
      };
    } catch (err) {
      console.error(err);
      return { status: 500, body: { error: "Image upload failed" } };
    }
  }

  // ---------------- DELETE IMAGE ----------------
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!isUuid(id)) return res.status(404).json({ error: "Image not found" });

      const image = await getImageById(id, currentUserId(req));
      if (!image) return res.status(404).json({ error: "Image not found" });

      const { public_id } = image;

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(public_id);

      const collectionName = public_id.split("/")[1]; // assuming your folder structure: collections/<collectionName>/<imageId>
      const folderName = `collections/${collectionName}`;

      const result = await cloudinary.api.resources({
        type: "authenticated",
        prefix: folderName,
        max_results: 1,
      });

      if (result.resources.length === 0) {
        await cloudinary.api.delete_folder(folderName);
        console.log(`✅ Folder ${folderName} deleted because it was empty`);
      }

      // Delete from DB
      await deleteImage(id);

      return res.json({ message: "✅ Image deleted successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to delete image" });
    }
  });

  return router;
}
