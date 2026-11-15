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

/** Returns the collection only if its album belongs to userId. */
export async function getCollectionById(id: string, userId: string) {
  const [collection] = (await sql`
    SELECT c.* FROM Collection c
    JOIN Album a ON c.album_id = a.id
    WHERE c.id = ${id} AND a.user_id = ${userId};
  `) as Collection[];

  if (!collection) return null;

  console.log(`✅ Fetched collection ${id}`);
  return collection;
}

export async function getCollectionsByAlbumId(albumId: string, userId: string) {
  const collections = await sql`
    SELECT c.* FROM Collection c
    JOIN Album a ON c.album_id = a.id
    WHERE c.album_id = ${albumId} AND a.user_id = ${userId};
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
  userId: string,
  fields: {
    name?: string;
    description?: string | null;
    beginDate?: string | null;
    endDate?: string | null;
  }
) {
  // Per-field flags: undefined keeps the stored value, null clears it, any other value replaces it.
  // (COALESCE(param, column) could not tell "clear" from "keep".) name is never nullable.
  const hasName = fields.name !== undefined;
  const hasDescription = fields.description !== undefined;
  const hasBeginDate = fields.beginDate !== undefined;
  const hasEndDate = fields.endDate !== undefined;
  const [updatedCollection] = (await sql`
    UPDATE Collection
    SET
      name = CASE WHEN ${hasName}::boolean THEN ${fields.name ?? null}::text ELSE name END,
      description = CASE WHEN ${hasDescription}::boolean THEN ${fields.description ?? null}::text ELSE description END,
      begin_date = CASE WHEN ${hasBeginDate}::boolean THEN ${fields.beginDate ?? null}::date ELSE begin_date END,
      end_date = CASE WHEN ${hasEndDate}::boolean THEN ${fields.endDate ?? null}::date ELSE end_date END,
      updated_at = NOW()
    WHERE id = ${id}
      AND album_id IN (SELECT id FROM Album WHERE user_id = ${userId})
    RETURNING *;
  `) as Collection[];
  console.log(`✅ Collection ${id} updated`);
  return updatedCollection;
}

/** Deletes the collection only if its album belongs to userId. */
export async function deleteCollection(id: string, userId: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM Collection
    WHERE id = ${id} AND album_id IN (SELECT id FROM Album WHERE user_id = ${userId})
    RETURNING id;
  `;
  return rows.length > 0;
}