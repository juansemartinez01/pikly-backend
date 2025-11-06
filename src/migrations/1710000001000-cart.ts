import { MigrationInterface, QueryRunner } from 'typeorm';

export class Cart1710000001000 implements MigrationInterface {
  name = 'Cart1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cart" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customer_id" uuid,
        "session_id" varchar(120),
        "price_list_id" uuid REFERENCES "price_list"("id"),
        "currency" varchar(8) NOT NULL DEFAULT 'ARS',
        "subtotal" numeric(14,2) NOT NULL DEFAULT 0,
        "discount_total" numeric(14,2) NOT NULL DEFAULT 0,
        "total" numeric(14,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cart_session ON "cart" ("session_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cart_price_list ON "cart" ("price_list_id");`,
    );

    await queryRunner.query(`
      CREATE TABLE "cart_item" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "cart_id" uuid NOT NULL REFERENCES "cart"("id") ON DELETE CASCADE,
        "product_id" uuid REFERENCES "product"("id"),
        "combo_id" uuid REFERENCES "combo"("id"),
        "qty" numeric(10,3) NOT NULL,
        "unit_type" varchar(12) NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "compare_at_price" numeric(12,2),
        "total" numeric(14,2) NOT NULL,
        "meta" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_cart_item_ref CHECK (
          (product_id IS NOT NULL)::int + (combo_id IS NOT NULL)::int = 1
        )
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cart_item_cart ON "cart_item" ("cart_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cart_item";`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cart_session;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cart_price_list;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cart";`);
  }
}
