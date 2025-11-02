import { createAlbumTable } from "../models/album.js";
import { createCollectionTable } from "../models/collection.js";


async function main() {
  // Create tables in order (important if there are foreign keys)
  await createAlbumTable();
  await createCollectionTable();
  console.log("✅ Database ready");
}

main().catch(console.error);