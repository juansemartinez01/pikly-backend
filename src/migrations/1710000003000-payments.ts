import { MigrationInterface, QueryRunner } from 'typeorm';

export class Payments1710000003000 implements MigrationInterface {
  name = 'Payments1710000003000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "payment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
        "provider" varchar(24) NOT NULL,
        "provider_payment_id" varchar(64),
        "status" varchar(24) NOT NULL,
        "amount" numeric(14,2) NOT NULL DEFAULT 0,
        "approved_at" timestamptz,
        "raw" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_payment_order ON "payment" ("order_id");`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_payment_provider_id ON "payment" ("provider","provider_payment_id");`,
    );

    await q.query(`
      CREATE TABLE "webhook_event" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "provider" varchar(24) NOT NULL,
        "event_id" varchar(80) NOT NULL,
        "topic" varchar(80),
        "signature" text,
        "payload" jsonb,
        "processed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_webhook_event UNIQUE ("provider","event_id")
      );
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "webhook_event";`);
    await q.query(`DROP INDEX IF EXISTS idx_payment_provider_id;`);
    await q.query(`DROP INDEX IF EXISTS idx_payment_order;`);
    await q.query(`DROP TABLE IF EXISTS "payment";`);
  }
}
