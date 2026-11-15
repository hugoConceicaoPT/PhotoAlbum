import { Router, type Request, type Response } from "express";
import { addAlbum, deleteAlbum, getAlbumsByUserId, updateAlbum } from "../models/album.js";
import { currentUserId } from "../middleware/auth.js";
import { cleanName, isUuid } from "../lib/validation.js";

// Mounted behind requireAuth. The owner is ALWAYS the verified token user;
// user ids in the body/URL are never trusted.
const router = Router();

const listOwn = async (req: Request, res: Response) => {
  try {
    return res.json(await getAlbumsByUserId(currentUserId(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch albums" });
  }
};

router.get("/", listOwn);

// Deprecated, kept for compatibility: only the caller's own id is accepted.
router.get("/user/:userId", async (req: Request, res: Response) => {
  if (req.params.userId !== currentUserId(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return listOwn(req, res);
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: "Invalid or missing name" });
    // Any user_id in the body is deliberately ignored.
    const newAlbum = await addAlbum(name, currentUserId(req));
    return res.status(201).json(newAlbum);
  } catch (err) {
    if ((err as { code?: string })?.code === "23503") {
      // FK to neon_auth.users_sync: the Stack user has not been synced yet.
      return res.status(409).json({ error: "User profile not ready, retry shortly" });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to create album" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: "Album not found" });
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ error: "Invalid or missing name" });

    const updated = await updateAlbum(id, name, currentUserId(req));
    if (!updated) return res.status(404).json({ error: "Album not found" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update album" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: "Album not found" });
    const deleted = await deleteAlbum(id, currentUserId(req));
    if (!deleted) return res.status(404).json({ error: "Album not found" });
    return res.json({ message: "Album deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete album" });
  }
});

export default router;
