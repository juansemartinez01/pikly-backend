import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProductImageUrl20251106090000 implements MigrationInterface {
  name = 'FixProductImageUrl20251106090000';

  public async up(qr: QueryRunner): Promise<void> {
    // Extensiones necesarias
    await qr.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await qr.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

    // CATEGORY
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "category" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(120) NOT NULL,
        "slug" varchar(140) NOT NULL UNIQUE,
        "order" int NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);

    // PRODUCT
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "product" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sku" varchar(64) UNIQUE NOT NULL,
        "name" varchar(160) NOT NULL,
        "slug" varchar(180) NOT NULL UNIQUE,
        "description" text,
        "unit_type" varchar(12) NOT NULL,
        "step" numeric(10,3) NOT NULL DEFAULT 1,
        "min_qty" numeric(10,3) NOT NULL DEFAULT 1,
        "max_qty" numeric(10,3) NOT NULL DEFAULT 9999,
        "active" boolean NOT NULL DEFAULT true,
        "badges" jsonb,
        "category_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "fk_product_category" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL
      );
    `);

    // Índices de producto (idempotentes)
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "idx_product_name_trgm" ON "product" USING gin ("name" gin_trgm_ops) WHERE "deleted_at" IS NULL;`,
    );

    // PRODUCT_IMAGE
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "product_image" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "url" text NOT NULL,
        "alt" varchar(200),
        "order" int NOT NULL DEFAULT 0,
        CONSTRAINT "fk_productimage_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE
      );
    `);

    // PRICE_LIST
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "price_list" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(80) NOT NULL UNIQUE,
        "priority" int NOT NULL DEFAULT 100,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);

    // PRODUCT_PRICE
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "product_price" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "price_list_id" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "compare_at_price" numeric(12,2),
        "valid_from" timestamptz NOT NULL DEFAULT now(),
        "valid_to" timestamptz,
        CONSTRAINT "uk_product_price_unique" UNIQUE ("product_id","price_list_id","valid_from"),
        CONSTRAINT "fk_pp_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_pp_pricelist" FOREIGN KEY ("price_list_id") REFERENCES "price_list"("id") ON DELETE CASCADE
      );
    `);

    // COMBO (si lo tienes)
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "combo" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(160) NOT NULL,
        "slug" varchar(180) NOT NULL UNIQUE,
        "description" text,
        "price" numeric(12,2) NOT NULL,
        "image_url" text,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);

    // Si necesitás más tablas de catálogo inicial, agregalas aquí con IF NOT EXISTS.
  }

  public async down(qr: QueryRunner): Promise<void> {
    // Ojo con down en ambientes compartidos; dropear sólo si existen.
    await qr.query(`DROP TABLE IF EXISTS "product_price";`);
    await qr.query(`DROP TABLE IF EXISTS "price_list";`);
    await qr.query(`DROP TABLE IF EXISTS "product_image";`);
    await qr.query(`DROP TABLE IF EXISTS "product";`);
    await qr.query(`DROP TABLE IF EXISTS "category";`);
    await qr.query(`DROP TABLE IF EXISTS "combo";`);
  }
}
