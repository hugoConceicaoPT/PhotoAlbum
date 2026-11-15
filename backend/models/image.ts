import sql from "../config/db.js";

export interface Image {
  id: number;
  collection_id: number;
  image_url: string;
  public_id: string;
}

// ---------------- CREATE TABLE ----------------
export async function createImageTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS Image (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      collection_id UUID NOT NULL REFERENCES Collection(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      public_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log("✅ Table 'Image' ready");
}

// ---------------- ADD IMAGE ----------------
export async function addImage(collection_id: string, image_url: string, public_id: string) {
  const [newImage] = (await sql`
    INSERT INTO Image (collection_id, image_url, public_id)
    VALUES (${collection_id}, ${image_url}, ${public_id})
    RETURNING *;
  `) as Image[];

  console.log(`✅ Image added to collection ${collection_id}`);
  return newImage;
}

// ---------------- GET IMAGES BY COLLECTION ----------------
export async function getImagesByCollectionId(collection_id: string, userId: string) {
  const images = await sql`
    SELECT i.* FROM Image i
    JOIN Collection c ON i.collection_id = c.id
    JOIN Album a ON c.album_id = a.id
    WHERE i.collection_id = ${collection_id} AND a.user_id = ${userId};
  ` as Image[];
  console.log(`✅ Fetched images for collection ${collection_id}`);
  return images;
}

// ---------------- GET IMAGE BY ID ----------------
export async function getImageById(id: string, userId: string) {
  const [image] = await sql`
    SELECT i.* FROM Image i
    JOIN Collection c ON i.collection_id = c.id
    JOIN Album a ON c.album_id = a.id
    WHERE i.id = ${id} AND a.user_id = ${userId};
  ` as Image[];
  console.log(`✅ Fetched image ${id}`);
  return image;
}

// ---------------- DELETE IMAGE ----------------
export async function deleteImage(id: string) {
  await sql`DELETE FROM Image WHERE id = ${id};`;
  console.log(`🗑️ Image ${id} deleted`);
}