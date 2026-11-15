import { Router, type Request, type Response } from "express";
import {
  deleteCollection,
  getCollectionById,
  getCollectionsByAlbumId,
  getCollectionsByUserId,
  insertCollection,
  updateCollection,
  type Collection,
} from "../models/collection.js";
import { isAlbumOwnedBy } from "../models/album.js";
import { currentUserId } from "../middleware/auth.js";
import { cleanName, isUuid, optionalDate, optionalText } from "../lib/validation.js";

// Mounted behind requireAuth. Ownership is resolved through Album.user_id.
// Foreign and missing resources both return 404 so existence is not leaked.
const router = Router();

const notFound = (res: Response, what = "Collection") =>
  res.status(404).json({ error: `${what} not found` });

const listOwn = async (req: Request, res: Response) => {
  try {
    return res.json(await getCollectionsByUserId(currentUserId(req)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch collections" });
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

router.get("/album/:albumId", async (req: Request, res: Response) => {
  try {
    const { albumId } = req.params;
    if (!isUuid(albumId)) return notFound(res, "Album");
    const userId = currentUserId(req);
    // The query is owner-scoped; the explicit check distinguishes 404 from an empty list.
    if (!(await isAlbumOwnedBy(albumId, userId))) return notFound(res, "Album");
    return res.json(await getCollectionsByAlbumId(albumId, userId));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch collections for album" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return notFound(res);
    const collection = await getCollectionById(id, currentUserId(req));
    if (!collection) return notFound(res);
    return res.json(collection as Collection);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch collection" });
  }
});

function parseFields(body: Record<string, unknown> | undefined) {
  const name = body?.name === undefined ? undefined : cleanName(body.name);
  const description = optionalText(body?.description, 2000);
  const beginDate = optionalDate(body?.beginDate);
  const endDate = optionalDate(body?.endDate);
  if (name === null || description === "invalid" || beginDate === "invalid" || endDate === "invalid") {
    return null;
  }
  return { name, description, beginDate, endDate };
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const albumId = req.body?.album_id;
    const fields = parseFields(req.body);
    if (!isUuid(albumId) || !fields || !fields.name) {
      return res.status(400).json({ error: "Invalid or missing album_id or name" });
    }
    if (!(await isAlbumOwnedBy(albumId, currentUserId(req)))) return notFound(res, "Album");

    const created = await insertCollection(
      albumId,
      fields.name,
      fields.description ?? undefined,
      fields.beginDate ?? undefined,
      fields.endDate ?? undefined
    );
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create collection" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return notFound(res);
    const fields = parseFields(req.body);
    if (!fields) return res.status(400).json({ error: "Invalid fields" });
    if (Object.values(fields).every((v) => v === undefined)) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const updated = await updateCollection(id, currentUserId(req), {
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.description !== undefined && { description: fields.description }),
      ...(fields.beginDate !== undefined && { beginDate: fields.beginDate }),
      ...(fields.endDate !== undefined && { endDate: fields.endDate }),
    });
    if (!updated) return notFound(res);
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update collection" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return notFound(res);
    if (!(await deleteCollection(id, currentUserId(req)))) return notFound(res);
    return res.json({ message: "Collection deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete collection" });
  }
});

export default router;
