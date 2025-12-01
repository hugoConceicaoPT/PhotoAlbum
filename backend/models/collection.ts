import sql from "../config/db.js";

export interface Collection {
  id: number;
  album_id: number;
  name: string;
  description?: string | null;
  beginDate?: string | null;
  endDate?: string | null;
}

export async function createCollectionTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS Collection (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      album_id UUID NOT NULL REFERENCES Album(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      begin_date DATE,
      end_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log("✅ Table 'Collection' ready");
}

export async function insertCollection(albumId: string, name: string, description?: string, beginDate?: string, endDate?: string) {
  await sql`
    INSERT INTO Collection (album_id, name, description, begin_date, end_date)
    VALUES (${albumId}, ${name}, ${description ?? null}, ${beginDate ?? null}, ${endDate ?? null})
    RETURNING *;
  `;
  console.log(`✅ Collection '${name}' created in album ${albumId}`);
}

export async function getCollectionById(id: string) {
  const [collection] = (await sql`
    SELECT * FROM Collection WHERE id = ${id};
  `) as Collection[];

  if (!collection) return null;

  console.log(`✅ Fetched collection ${id}`);
  return collection;
}

export async function getCollectionsByAlbumId(albumId: string) {
  const collections = await sql`
    SELECT * FROM Collection WHERE album_id = ${albumId};
  ` as Collection[];
  console.log(`✅ Fetched collections for album ${albumId}`);
  return collections;
}

export async function getCollectionsByUserId(userId: string) {
  const collections = await sql`
    SELECT c.*
    FROM Collection c
    JOIN Album a ON c.album_id = a.id
    WHERE a.user_id = ${userId};
  ` as Collection[];
  console.log(`✅ Fetched collections for user ${userId}`);
  return collections;
}

export async function updateCollection(
  id: string,
  fields: {
    name?: string;
    description?: string | null;
    beginDate?: string | null;
    endDate?: string | null;
  }
) {
  const [updatedCollection] = (await sql`
    UPDATE Collection
    SET
      name = COALESCE(${fields.name}, name),
      description = COALESCE(${fields.description}, description),
      begin_date = COALESCE(${fields.beginDate}, begin_date),
      end_date = COALESCE(${fields.endDate}, end_date),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *;
  `) as Collection[];
  console.log(`✅ Collection ${id} updated`);
  return updatedCollection;
}

export async function deleteCollection(id: string) {
  await sql`
    DELETE FROM Collection WHERE id = ${id};
  `;
  console.log(`✅ Collection ${id} deleted`);
}