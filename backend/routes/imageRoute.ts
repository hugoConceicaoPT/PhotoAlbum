import { Router, type Request, type Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { addImage, deleteImage, getImageById, getImagesByCollectionId, type Image } from "../models/image.js";
import { getCollectionById } from "../models/collection.js";

const router = Router();
const upload = multer({ dest: "uploads/" }); // temporary local storage

// Cloudinary config (from .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ---------------- GET IMAGES BY COLLECTION ----------------
router.get("/collection/:collectionId", async (req: Request, res: Response) => {
  try {
    const { collectionId } = req.params
    if (!collectionId ) return res.status(400).json({ error: "Missing collectionId" });
    const images = await getImagesByCollectionId(collectionId);

    const signedImages = images.map((img) => ({
      ...img,
      signed_url: cloudinary.url(img.public_id, {
        type: "authenticated",
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      }),
    }));
    
    return res.json(images as Image[]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch images for collection" });
  }
});

// ---------------- MULTI IMAGE UPLOAD ----------------
router.post(
  "/upload/:collectionId",
  upload.array("images", 10), // accept up to 10 images at once
  async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      if (!collectionId) return res.status(400).json({ error: "Missing collection id" });
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0)
        return res.status(400).json({ error: "No image files provided" });

      // Get collection info (so we can use its name for folder)
      const collection = await getCollectionById(collectionId);
      if (!collection)
        return res.status(404).json({ error: "Collection not found" });

      const folderName = `collections/${collection.name.replace(/\s+/g, "_")}`;

      const uploadedImages: Image[] = [];

      // Upload each file sequentially (can also parallelize with Promise.all)
      for (const file of files) {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: folderName,
          type: "authenticated",
        });

        const newImage = await addImage(
          collectionId,
          uploadResult.secure_url,
          uploadResult.public_id
        );
        if(!newImage) return res.status(400).json({ error: "Problem inserting image on database" }); 
        uploadedImages.push(newImage);
      }

      return res.status(201).json({
        message: `✅ Uploaded ${uploadedImages.length} image(s) to ${folderName}`,
        images: uploadedImages,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Image upload failed" });
    }
  }
);
// ---------------- DELETE IMAGE ----------------
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing image id" }); 

    const image = await getImageById(id);
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

export default router;
