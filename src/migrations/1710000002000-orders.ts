import { MigrationInterface, QueryRunner } from "typeorm";

export class Orders1710000002000 implements MigrationInterface {
  name = 'Orders1710000002000'

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "customer" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(160),
        "phone" varchar(32),
        "first_name" varchar(80),
        "last_name" varchar(80),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE "address" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customer_id" uuid REFERENCES "customer"("id") ON DELETE SET NULL,
        "label" varchar(60),
        "street" varchar(160) NOT NULL,
        "number" varchar(32),
        "floor" varchar(32),
        "apartment" varchar(32),
        "city" varchar(120),
        "province" varchar(120),
        "zip" varchar(20),
        "notes" text,
        "geo_lat" numeric(10,6),
        "geo_lng" numeric(10,6),
        "is_default" boolean DEFAULT false
      );
    `);

    await q.query(`
      CREATE TABLE "delivery_slot" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "date" date NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "capacity" int NOT NULL DEFAULT 50,
        "taken" int NOT NULL DEFAULT 0,
        "zone_id" uuid
      );
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_delivery_slot_date ON "delivery_slot" ("date");`);

    await q.query(`
      CREATE TABLE "order" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_number" varchar(32) UNIQUE NOT NULL,
        "customer_id" uuid REFERENCES "customer"("id"),
        "address_id" uuid REFERENCES "address"("id"),
        "cart_id" uuid REFERENCES "cart"("id"),
        "status" varchar(24) NOT NULL DEFAULT 'created',
        "payment_status" varchar(24) NOT NULL DEFAULT 'pending',
        "price_list_id" uuid REFERENCES "price_list"("id"),
        "currency" varchar(8) NOT NULL DEFAULT 'ARS',
        "subtotal" numeric(14,2) NOT NULL,
        "discount_total" numeric(14,2) NOT NULL,
        "shipping_total" numeric(14,2) NOT NULL DEFAULT 0,
        "total" numeric(14,2) NOT NULL,
        "delivery_date" date,
        "delivery_slot_id" uuid REFERENCES "delivery_slot"("id"),
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_order_number ON "order" ("order_number");`);

    await q.query(`
      CREATE TABLE "order_item" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
        "product_id" uuid REFERENCES "product"("id"),
        "combo_id" uuid REFERENCES "combo"("id"),
        "name_snapshot" varchar(200) NOT NULL,
        "sku_snapshot" varchar(64),
        "unit_type" varchar(12) NOT NULL,
        "qty" numeric(10,3) NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "compare_at_price" numeric(12,2),
        "total" numeric(14,2) NOT NULL,
        CONSTRAINT chk_order_item_ref CHECK (
          (product_id IS NOT NULL)::int + (combo_id IS NOT NULL)::int = 1
        )
      );
    `);

    await q.query(`
      CREATE TABLE "order_status_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
        "from_status" varchar(24),
        "to_status" varchar(24) NOT NULL,
        "note" text,
        "changed_by" varchar(120),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    
    await q.query(`
      CREATE TABLE "stock_current" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL REFERENCES "product"("id"),
        "warehouse_id" uuid,
        "qty" numeric(12,3) NOT NULL DEFAULT 0
      );
    `);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_current ON "stock_current"("product_id","warehouse_id");`);

    await q.query(`
      CREATE TABLE "stock_reservation" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "product"("id"),
        "qty" numeric(12,3) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "stock_reservation";`);
    await q.query(`DROP INDEX IF EXISTS uq_stock_current;`);
    await q.query(`DROP TABLE IF EXISTS "stock_current";`);
    await q.query(`DROP TABLE IF EXISTS "order_status_history";`);
    await q.query(`DROP TABLE IF EXISTS "order_item";`);
    await q.query(`DROP INDEX IF EXISTS idx_order_number;`);
    await q.query(`DROP TABLE IF EXISTS "order";`);
    await q.query(`DROP INDEX IF EXISTS idx_delivery_slot_date;`);
    await q.query(`DROP TABLE IF EXISTS "delivery_slot";`);
    await q.query(`DROP TABLE IF EXISTS "address";`);
    await q.query(`DROP TABLE IF EXISTS "customer";`);
  }
}
