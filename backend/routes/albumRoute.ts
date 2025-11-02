import { Router, type Request, type Response } from "express";
import { addAlbum, deleteAlbum, getAlbumsByUserId, updateAlbum } from "../models/album";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, user_id } = req.body;

    if (!name || !user_id) {
      return res.status(400).json({ error: "Missing name or user_id" });
    }

    const newAlbum = await addAlbum(name, user_id);
    return res.status(201).json(newAlbum); // addAlbum returns array from SQL
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create album" });
  }
});


router.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const albums = await getAlbumsByUserId(userId);
    return res.json(albums);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch albums for user" });
  }
});

router.put("/:id", async (req: Request<{ id: string }, {}, { name: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).json({ error: "Nothing to update" });

    const updatedAlbum = await updateAlbum(id, name);
    if (!updatedAlbum) return res.status(404).json({ error: "Album not found" });

    return res.json(updatedAlbum);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update album" });
  }
});

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteAlbum(req.params.id);
    return res.json({ message: "Album deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete album" });
  }
});

export default router;