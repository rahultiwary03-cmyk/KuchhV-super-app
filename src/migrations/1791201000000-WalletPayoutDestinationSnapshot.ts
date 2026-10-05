import { MigrationInterface, QueryRunner } from 'typeorm';

export class WalletPayoutDestinationSnapshot1791201000000
  implements MigrationInterface
{
  name = 'WalletPayoutDestinationSnapshot1791201000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_payouts"
      ADD COLUMN IF NOT EXISTS "fund_account_id" character varying(64)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet_payouts"
      DROP COLUMN IF EXISTS "fund_account_id"
    `);
  }
}
