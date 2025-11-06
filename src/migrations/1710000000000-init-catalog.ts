import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCatalog1710000000000 implements MigrationInterface {
  name = 'InitCatalog1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

    await queryRunner.query(`
      CREATE TABLE "category" (
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

    await queryRunner.query(`
      CREATE TABLE "product" (
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
        "category_id" uuid REFERENCES "category" ("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_name_trgm ON "product" USING GIN ("name" gin_trgm_ops) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "product_image" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
        "url" text NOT NULL,
        "alt" varchar(160) NOT NULL DEFAULT '',
        "order" int NOT NULL DEFAULT 0
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "price_list" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(48) NOT NULL UNIQUE,
        "currency" varchar(8) NOT NULL DEFAULT 'ARS',
        "active" boolean NOT NULL DEFAULT true,
        "priority" int NOT NULL DEFAULT 100,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "product_price" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
        "price_list_id" uuid NOT NULL REFERENCES "price_list"("id") ON DELETE CASCADE,
        "price" numeric(12,2) NOT NULL,
        "compare_at_price" numeric(12,2),
        "valid_from" timestamptz NOT NULL DEFAULT now(),
        "valid_to" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_product_price_search ON "product_price" ("product_id","price_list_id","valid_from","valid_to");`,
    );

    await queryRunner.query(`
      CREATE TABLE "combo" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(160) NOT NULL,
        "slug" varchar(180) NOT NULL UNIQUE,
        "description" text,
        "active" boolean NOT NULL DEFAULT true,
        "currency" varchar(8) NOT NULL DEFAULT 'ARS',
        "price" numeric(12,2) NOT NULL,
        "badges" jsonb,
        "image_url" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "combo_item" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "combo_id" uuid NOT NULL REFERENCES "combo"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "product"("id"),
        "qty" numeric(10,3) NOT NULL,
        "unit_type" varchar(12) NOT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "combo_item";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "combo";`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_price_search;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_price";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "price_list";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_image";`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_name_trgm;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category";`);
    // no bajamos extensiones para no afectar otras DBs
  }
}
