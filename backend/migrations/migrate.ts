import { createAlbumTable } from "../models/album.js";
import { createCollectionTable } from "../models/collection.js";
import { createImageTable } from "../models/image.js";


async function main() {
  // Create tables in order (important if there are foreign keys)
  await createAlbumTable();
  await createCollectionTable();
  await createImageTable();
  console.log("✅ Database ready");
}

main().catch(console.error);