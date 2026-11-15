import { createAlbumTable } from "../models/album.js";
import { createCollectionTable } from "../models/collection.js";
import { createImageTable } from "../models/image.js";
import { createSummaryIndexes } from "../models/albumSummary.js";
import { createTermsConsentTable } from "../models/termsConsent.js";


async function main() {
  // Create tables in order (important if there are foreign keys)
  await createAlbumTable();
  await createCollectionTable();
  await createImageTable();
  await createTermsConsentTable();
  // Indexes for GET /albums/summaries (CREATE INDEX IF NOT EXISTS; safe to re-run).
  await createSummaryIndexes();
  console.log("✅ Database ready");
}

main().catch(console.error);