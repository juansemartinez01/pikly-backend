import { MigrationInterface, QueryRunner } from "typeorm";

export class SearchAndCms1710000005000 implements MigrationInterface {
  name = 'SearchAndCms1710000005000'

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_combo_name_trgm ON "combo" USING GIN ("name" gin_trgm_ops) WHERE deleted_at IS NULL;`);

    
    await q.query(`
      CREATE TABLE "setting" (
        "key" varchar(120) PRIMARY KEY,
        "value" jsonb
      );
    `);
    await q.query(`
      CREATE TABLE "banner" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "position" varchar(60) NOT NULL, -- ej: home-hero, home-grid
        "title" varchar(160),
        "subtitle" varchar(200),
        "image_url" text,
        "link_url" text,
        "active" boolean NOT NULL DEFAULT true,
        "order" int NOT NULL DEFAULT 0
      );
    `);

    // Vista materializada para búsqueda rápida (a futuro)
    // await q.query(`
    //   CREATE MATERIALIZED VIEW search_catalog AS
    //   SELECT p.id, p.slug, p.name, 'product'::text AS kind FROM product p WHERE p.deleted_at IS NULL AND p.active = true
    //   UNION ALL
    //   SELECT c.id, c.slug, c.name, 'combo'::text FROM combo c WHERE c.deleted_at IS NULL AND c.active = true;
    // `);
    // await q.query(`CREATE INDEX idx_search_catalog_name_trgm ON search_catalog USING GIN (name gin_trgm_ops);`);
  }

  public async down(q: QueryRunner): Promise<void> {
    // await q.query(`DROP MATERIALIZED VIEW IF EXISTS search_catalog;`);
    await q.query(`DROP TABLE IF EXISTS "banner";`);
    await q.query(`DROP TABLE IF EXISTS "setting";`);
    await q.query(`DROP INDEX IF EXISTS idx_combo_name_trgm;`);
  }
}
