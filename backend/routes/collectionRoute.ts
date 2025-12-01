import { Router, type Request, type Response } from "express";
import { deleteCollection, getCollectionById, getCollectionsByAlbumId, getCollectionsByUserId, insertCollection, updateCollection, type Collection } from "../models/collection.js";

const router = Router();

router.get("/album/:albumId", async (req: Request, res: Response) => {
  try {

    const {albumId} = req.params
    if (!albumId) {
      return res.status(400).json({ error: "Missing albumId" });
    }

    const collections = await getCollectionsByAlbumId(albumId);
    return res.json(collections);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch collections for album" });
  }
});

// ---------------- GET collection by ID ----------------
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: "Missing id" });
    const collection = await getCollectionById(id);
    if (!collection) return res.status(404).json({ error: "Collection not found" });
    return res.json(collection as Collection);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch collection" });
  }
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  try {

    const {userId} = req.params
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const collections = await getCollectionsByUserId(userId);

    return res.json(collections);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch collections for user" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { album_id, name, description, beginDate, endDate } = req.body;
    if (!album_id || !name) return res.status(400).json({ error: "Missing album_id or name" });
    const newCollection = await insertCollection(album_id, name, description, beginDate, endDate);
    return res.status(201).json(newCollection);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create collection" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    if (!id) return res.status(400).json({ error: "Missing collectionId" });

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const updatedCollection = await updateCollection(id, fields);
    if (!updatedCollection) return res.status(404).json({ error: "Collection not found" });

    return res.json(updatedCollection);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update collection" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing collectionId" });

    await deleteCollection(id);
    return res.json({ message: "Collection deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete collection" });
  }
});

export default router;