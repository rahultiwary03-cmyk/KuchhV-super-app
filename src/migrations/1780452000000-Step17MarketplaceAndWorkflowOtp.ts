import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step17MarketplaceAndWorkflowOtp1780452000000
  implements MigrationInterface
{
  name = 'Step17MarketplaceAndWorkflowOtp1780452000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'SERVICE_PROVIDER'`,
    );

    const [{ null_shop_orders: nullShopOrders }] = await queryRunner.query(
      `SELECT count(*)::int AS null_shop_orders FROM "orders" WHERE "shop_id" IS NULL`,
    );
    if (nullShopOrders > 0) {
      throw new Error(
        `Cannot enforce shop-specific orders: ${nullShopOrders} existing orders have no shop_id`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shop_id" SET NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TYPE "service_requests_status_enum" AS ENUM (
        'REQUESTED',
        'ACCEPTED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "service_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "service_provider_id" uuid,
        "service_category" character varying(120) NOT NULL,
        "description" text NOT NULL,
        "service_address" text NOT NULL,
        "agreed_price" numeric(10,2),
        "status" "service_requests_status_enum" NOT NULL DEFAULT 'REQUESTED',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_requests_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_service_requests_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_service_requests_provider" FOREIGN KEY ("service_provider_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_requests_feed" ON "service_requests" ("status", "created_at")`,
    );
    await queryRunner.query(`
      CREATE TABLE "workflow_otp_challenges" (
        "id" uuid NOT NULL,
        "type" character varying(32) NOT NULL,
        "order_id" uuid,
        "service_request_id" uuid,
        "created_by_id" uuid NOT NULL,
        "destination_phone" character varying(255) NOT NULL,
        "code_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "failed_attempts" smallint NOT NULL DEFAULT 0,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_otp_challenges_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflow_otp_order" FOREIGN KEY ("order_id")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_otp_service_request" FOREIGN KEY ("service_request_id")
          REFERENCES "service_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_otp_creator" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_workflow_otp_subject" CHECK (
          ("order_id" IS NOT NULL AND "service_request_id" IS NULL)
          OR ("order_id" IS NULL AND "service_request_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_otp_order" ON "workflow_otp_challenges" ("order_id", "type", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_otp_service_request" ON "workflow_otp_challenges" ("service_request_id", "type", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workflow_otp_challenges"`);
    await queryRunner.query(`DROP TABLE "service_requests"`);
    await queryRunner.query(`DROP TYPE "service_requests_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "shop_id" DROP NOT NULL`,
    );
  }
}
