import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoyaltyAndVipPass1791400000000 implements MigrationInterface {
  name = 'LoyaltyAndVipPass1791400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "item_subtotal" numeric(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "delivery_fee" numeric(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "vip_deal_discount" numeric(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "coin_discount" numeric(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "coins_redeemed" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "vip_free_delivery" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "vip_priority" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET "item_subtotal" = "total_amount"
      WHERE "item_subtotal" = 0
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "coins_balance" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_loyalty_accounts_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_loyalty_accounts_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_loyalty_accounts_balance" CHECK ("coins_balance" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" character varying(32) NOT NULL,
        "coins" integer NOT NULL,
        "balance_after" integer NOT NULL,
        "idempotency_key" character varying(160) NOT NULL,
        "reference_id" character varying(160),
        "description" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_loyalty_transactions_idempotency_key"
          UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_loyalty_transactions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_loyalty_transactions_coins" CHECK ("coins" <> 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_loyalty_transactions_user_created"
      ON "loyalty_transactions" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vip_memberships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'ACTIVE',
        "deal_used_month" character varying(7),
        "subscription_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vip_memberships_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vip_memberships_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_vip_memberships_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_badges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "badge_key" character varying(40) NOT NULL,
        "name" character varying(80) NOT NULL,
        "description" character varying(255) NOT NULL,
        "icon" character varying(40) NOT NULL,
        "earned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_badges_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_loyalty_badges_user_key" UNIQUE ("user_id", "badge_key"),
        CONSTRAINT "FK_loyalty_badges_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loyalty_scratch_cards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "source_order_id" uuid NOT NULL,
        "reward_coins" integer NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'AVAILABLE',
        "scratched_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_scratch_cards_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_loyalty_scratch_cards_order" UNIQUE ("source_order_id"),
        CONSTRAINT "FK_loyalty_scratch_cards_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_loyalty_scratch_cards_order" FOREIGN KEY ("source_order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_loyalty_scratch_cards_reward"
          CHECK ("reward_coins" BETWEEN 1 AND 25)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_scratch_cards"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_badges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vip_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_accounts"`);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "vip_priority",
      DROP COLUMN IF EXISTS "vip_free_delivery",
      DROP COLUMN IF EXISTS "coins_redeemed",
      DROP COLUMN IF EXISTS "coin_discount",
      DROP COLUMN IF EXISTS "vip_deal_discount",
      DROP COLUMN IF EXISTS "delivery_fee",
      DROP COLUMN IF EXISTS "item_subtotal"
    `);
  }
}
