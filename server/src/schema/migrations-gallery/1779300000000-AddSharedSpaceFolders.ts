import { Kysely, sql } from 'kysely';

// Adds recursive folder support to shared spaces.
//
// - shared_space_folder: self-referential tree (parentId = null → root).
// - shared_space_album.folderId: nullable FK → shared_space_folder (SET NULL on folder delete).

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE "shared_space_folder" (
      "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "spaceId"     uuid NOT NULL REFERENCES "shared_space"("id") ON DELETE CASCADE,
      "parentId"    uuid REFERENCES "shared_space_folder"("id") ON DELETE CASCADE,
      "name"        text NOT NULL,
      "description" text,
      "position"    integer NOT NULL DEFAULT 0,
      "createdAt"   timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
      "updatedAt"   timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
      "createId"    uuid NOT NULL DEFAULT immich_uuid_v7(),
      "updateId"    uuid NOT NULL DEFAULT immich_uuid_v7()
    )
  `.execute(db);

  await sql`CREATE INDEX "IDX_shared_space_folder_spaceId_parentId" ON "shared_space_folder" ("spaceId", "parentId")`.execute(db);
  await sql`CREATE INDEX "IDX_shared_space_folder_createId" ON "shared_space_folder" ("createId")`.execute(db);
  await sql`CREATE INDEX "IDX_shared_space_folder_updateId" ON "shared_space_folder" ("updateId")`.execute(db);

  await sql`
    CREATE OR REPLACE FUNCTION shared_space_folder_updatedAt()
    RETURNS TRIGGER
    LANGUAGE PLPGSQL
    AS $$
      BEGIN
        NEW."updatedAt" = clock_timestamp();
        NEW."updateId"  = immich_uuid_v7();
        RETURN NEW;
      END
    $$
  `.execute(db);

  await sql`
    CREATE OR REPLACE TRIGGER "shared_space_folder_updatedAt"
    BEFORE UPDATE ON "shared_space_folder"
    FOR EACH ROW
    EXECUTE FUNCTION shared_space_folder_updatedAt()
  `.execute(db);

  await sql`ALTER TABLE "shared_space_album" ADD COLUMN "folderId" uuid REFERENCES "shared_space_folder"("id") ON DELETE SET NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "shared_space_album" DROP COLUMN IF EXISTS "folderId"`.execute(db);
  await sql`DROP TRIGGER IF EXISTS "shared_space_folder_updatedAt" ON "shared_space_folder"`.execute(db);
  await sql`DROP FUNCTION IF EXISTS shared_space_folder_updatedAt()`.execute(db);
  await sql`DROP TABLE IF EXISTS "shared_space_folder"`.execute(db);
}
