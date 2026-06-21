import { Kysely, sql } from 'kysely';

// Adds the `color` column to shared_space_folder.
// Existing rows default to 'amber'.

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "shared_space_folder" ADD COLUMN IF NOT EXISTS "color" text NOT NULL DEFAULT 'amber'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE "shared_space_folder" DROP COLUMN IF EXISTS "color"`.execute(db);
}
