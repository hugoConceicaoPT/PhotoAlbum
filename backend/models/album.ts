import sql from "../config/db.js";

export interface Album {
  id: string;
  name: string;
  user_id: string;
}

export async function createAlbumTable() {
  await sql`
      CREATE Table IF NOT EXISTS Album (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log("✅ Table 'Album' ready");
}

export async function addAlbum(name: string, user_id: string) {
  const [newAlbum] = (await sql`
    INSERT INTO Album (name, user_id)
    VALUES (${name}, ${user_id})
    RETURNING *;
  `) as Album[];
  console.log(`✅ Album '${name}' created for user ${user_id}`);
  return newAlbum; // ✅ return the single album object
}

export async function getAlbumsByUserId(userId: string) {
  const albums = await sql`
    SELECT * FROM Album WHERE user_id = ${userId};
  `;
  console.log(`✅ Fetched albums for user ${userId}`);
  return albums;
}

export async function updateAlbum(id: string, name: string) {
  const [updatedAlbum] = (await sql`
    UPDATE Album
    SET name = ${name}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *;
  `) as Album[];
  console.log(`✅ Album ${id} updated`);
  return updatedAlbum;
}

export async function deleteAlbum(id: string) {
  await sql`DELETE FROM Album WHERE id = ${id};`;
  console.log(`✅ Album ${id} deleted`);
}