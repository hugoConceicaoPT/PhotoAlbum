import sql from "../config/db.js";

export interface Collection {
  id: number;
  album_id: number;
  name: string;
  description?: string | null;
  beginDate?: Date | null;
  endDate?: Date | null;
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

export async function insertCollection( albumId: string, name: string, description?: string, beginDate?: string, endDate?: string) {
  await sql`
    INSERT INTO Collection (album_id, name, description, begin_date, end_date)
    VALUES (${albumId}, ${name}, ${description ?? null}, ${beginDate ?? null}, ${endDate ?? null})
    RETURNING *;
  `;
  console.log(`✅ Collection '${name}' created in album ${albumId}`);
}