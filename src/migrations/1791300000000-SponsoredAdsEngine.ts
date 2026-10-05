import { MigrationInterface, QueryRunner } from 'typeorm';

export class SponsoredAdsEngine1791300000000 implements MigrationInterface {
  name = 'SponsoredAdsEngine1791300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ad_campaigns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_user_id" uuid NOT NULL,
        "shop_id" uuid NOT NULL,
        "product_id" uuid,
        "name" character varying(120) NOT NULL,
        "placement" character varying(24) NOT NULL,
        "billing_model" character varying(16) NOT NULL,
        "target_category" character varying(100),
        "banner_image_url" text,
        "banner_link_url" character varying(500),
        "bid_amount" numeric(10,2) NOT NULL,
        "budget_amount" numeric(12,2) NOT NULL,
        "spent_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "status" character varying(16) NOT NULL DEFAULT 'ACTIVE',
        "starts_at" TIMESTAMP WITH TIME ZONE,
        "ends_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ad_campaigns_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ad_campaigns_owner" FOREIGN KEY ("owner_user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ad_campaigns_shop" FOREIGN KEY ("shop_id")
          REFERENCES "shops"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ad_campaigns_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_ad_campaigns_placement"
          CHECK ("placement" IN ('SPONSORED_LISTING', 'BANNER')),
        CONSTRAINT "CHK_ad_campaigns_billing"
          CHECK ("billing_model" IN ('CPC', 'CPM')),
        CONSTRAINT "CHK_ad_campaigns_money"
          CHECK ("bid_amount" > 0 AND "budget_amount" >= 10 AND
                 "spent_amount" >= 0 AND "spent_amount" <= "budget_amount")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ad_campaigns_placement_status_bid"
      ON "ad_campaigns" ("placement", "status", "bid_amount" DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ad_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "event_type" character varying(16) NOT NULL,
        "event_key" character varying(160) NOT NULL,
        "dedupe_key" character varying(120) NOT NULL,
        "order_id" uuid,
        "charge_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "conversion_value" numeric(12,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ad_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ad_events_event_key" UNIQUE ("event_key"),
        CONSTRAINT "UQ_ad_events_dedupe_key" UNIQUE ("dedupe_key"),
        CONSTRAINT "FK_ad_events_campaign" FOREIGN KEY ("campaign_id")
          REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ad_events_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ad_events_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_ad_events_type"
          CHECK ("event_type" IN ('IMPRESSION', 'CLICK', 'CONVERSION')),
        CONSTRAINT "CHK_ad_events_amounts"
          CHECK ("charge_amount" >= 0 AND "conversion_value" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ad_events_conversion_order"
      ON "ad_events" ("order_id") WHERE "order_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ad_events_campaign_type_created"
      ON "ad_events" ("campaign_id", "event_type", "created_at")
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "ad_click_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_ad_click"
      FOREIGN KEY ("ad_click_id") REFERENCES "ad_events"("id")
      ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP CONSTRAINT IF EXISTS "FK_orders_ad_click"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders" DROP COLUMN IF EXISTS "ad_click_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "ad_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ad_campaigns"`);
  }
}
