import { MigrationInterface, QueryRunner } from 'typeorm';

export class Ops1710000004000 implements MigrationInterface {
  name = 'Ops1710000004000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "driver_assignment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "order"("id") ON DELETE CASCADE,
        "driver_name" varchar(120),
        "driver_phone" varchar(32),
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        "delivered_at" timestamptz,
        "proof_url" text
      );
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS idx_driver_assignment_order ON "driver_assignment" ("order_id");`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_driver_assignment_order;`);
    await q.query(`DROP TABLE IF EXISTS "driver_assignment";`);
  }
}
