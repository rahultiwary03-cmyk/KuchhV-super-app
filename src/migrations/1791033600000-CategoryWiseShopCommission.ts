import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryWiseShopCommission1791033600000
  implements MigrationInterface
{
  name = 'CategoryWiseShopCommission1791033600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shops"
      ADD COLUMN IF NOT EXISTS "commission_percentage" numeric(5,2) NOT NULL DEFAULT 10
    `);
    await queryRunner.query(`
      UPDATE "shops"
      SET "commission_percentage" = CASE
        WHEN lower(trim("category")) IN (
          'grocery', 'groceries', 'daily essentials',
          'grocery & daily essentials', 'grocery daily essentials',
          'groceries daily essentials', 'kirana'
        ) THEN 6
        WHEN lower(trim("category")) IN (
          'restaurant', 'restaurants', 'food', 'fast food',
          'restaurant & fast food', 'restaurant fast food',
          'restaurants fast food', 'cafe',
          'cafe & restaurant', 'cafe restaurant'
        ) THEN 11
        WHEN lower(trim("category")) IN (
          'pharmacy', 'pharmacies', 'medicine', 'medicines',
          'pharmacies medicines', 'medical store'
        ) THEN 5
        WHEN lower(trim("category")) IN (
          'home service', 'home services', 'repair', 'repairs',
          'home services & repairs', 'home services repairs'
        ) THEN 10
        ELSE 10
      END
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "commission_percentage" numeric(5,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "commission_amount" numeric(10,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "service_requests"
      ADD COLUMN IF NOT EXISTS "commission_percentage" numeric(5,2) NOT NULL DEFAULT 10
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "commission_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "commission_percentage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN IF EXISTS "commission_percentage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shops" DROP COLUMN "commission_percentage"`,
    );
  }
}
