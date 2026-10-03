import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceRequestCommissionRate1791037200000
  implements MigrationInterface
{
  name = 'ServiceRequestCommissionRate1791037200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_requests"
      ADD COLUMN IF NOT EXISTS "commission_percentage" numeric(5,2) NOT NULL DEFAULT 10
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_requests" DROP COLUMN IF EXISTS "commission_percentage"`,
    );
  }
}
