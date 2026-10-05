import { MigrationInterface, QueryRunner } from 'typeorm';

export class WalletAndPayoutEngine1791200000000
  implements MigrationInterface
{
  name = 'WalletAndPayoutEngine1791200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "balance" numeric(12,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_accounts_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_wallet_accounts_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_wallet_accounts_balance" CHECK ("balance" >= 0)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "wallet_accounts" ("user_id", "balance")
      SELECT u."id", COALESCE((
        SELECT dp."wallet_balance"
        FROM "delivery_partners" dp
        WHERE dp."user_id" = u."id"
        ORDER BY dp."id"
        LIMIT 1
      ), 0)
      FROM "users" u
      ON CONFLICT ("user_id") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "type" character varying(32) NOT NULL,
        "direction" character varying(8) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "balance_after" numeric(12,2) NOT NULL,
        "idempotency_key" character varying(160) NOT NULL,
        "reference_id" character varying(160),
        "description" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_transactions_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_wallet_transactions_wallet" FOREIGN KEY ("wallet_id")
          REFERENCES "wallet_accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_wallet_transactions_direction"
          CHECK ("direction" IN ('CREDIT', 'DEBIT')),
        CONSTRAINT "CHK_wallet_transactions_amount"
          CHECK ("amount" > 0 AND "balance_after" >= 0)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "wallet_transactions"
        ("wallet_id", "type", "direction", "amount", "balance_after",
         "idempotency_key", "reference_id", "description")
      SELECT w."id", 'OPENING_BALANCE', 'CREDIT', w."balance", w."balance",
        'opening:' || w."user_id"::text, w."user_id"::text, 'Opening partner wallet balance'
      FROM "wallet_accounts" w
      WHERE w."balance" > 0
      ON CONFLICT ("idempotency_key") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_account_created"
      ON "wallet_transactions" ("wallet_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_recharges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "razorpay_order_id" character varying(64) NOT NULL,
        "razorpay_payment_id" character varying(64),
        "amount" numeric(12,2) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_recharges_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_recharges_razorpay_order_id" UNIQUE ("razorpay_order_id"),
        CONSTRAINT "UQ_wallet_recharges_razorpay_payment_id" UNIQUE ("razorpay_payment_id"),
        CONSTRAINT "FK_wallet_recharges_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_wallet_recharges_amount" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_payout_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "vpa_ciphertext" character varying(100) NOT NULL,
        "vpa_iv" character varying(32) NOT NULL,
        "vpa_auth_tag" character varying(32) NOT NULL,
        "razorpay_contact_id" character varying(64) NOT NULL,
        "razorpay_fund_account_id" character varying(64) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_payout_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_payout_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_wallet_payout_profiles_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_payout_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "batch_key" character varying(100) NOT NULL,
        "frequency" character varying(16) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'PROCESSING',
        "payout_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_payout_batches_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_payout_batches_batch_key" UNIQUE ("batch_key")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_payouts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "batch_id" uuid,
        "fund_account_id" character varying(64),
        "provider_payout_id" character varying(64),
        "idempotency_key" character varying(160) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'PROCESSING',
        "failure_reason" character varying(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_payouts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_payouts_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "UQ_wallet_payouts_provider_payout_id" UNIQUE ("provider_payout_id"),
        CONSTRAINT "FK_wallet_payouts_wallet" FOREIGN KEY ("wallet_id")
          REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_wallet_payouts_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_wallet_payouts_batch" FOREIGN KEY ("batch_id")
          REFERENCES "wallet_payout_batches"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_wallet_payouts_amount" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallet_payouts_status_created"
      ON "wallet_payouts" ("status", "created_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_payouts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_payout_batches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_payout_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_recharges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_accounts"`);
  }
}
