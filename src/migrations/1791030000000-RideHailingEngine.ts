import { MigrationInterface, QueryRunner } from 'typeorm';

export class RideHailingEngine1791030000000 implements MigrationInterface {
  name = 'RideHailingEngine1791030000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "driver_id" uuid,
        "vehicle_type" character varying(8) NOT NULL,
        "pickup_latitude" numeric(10,6) NOT NULL,
        "pickup_longitude" numeric(10,6) NOT NULL,
        "drop_latitude" numeric(10,6) NOT NULL,
        "drop_longitude" numeric(10,6) NOT NULL,
        "distance_km" numeric(10,2) NOT NULL,
        "estimated_fare" numeric(10,2) NOT NULL,
        "final_fare" numeric(10,2),
        "driver_earnings" numeric(10,2),
        "platform_commission" numeric(10,2),
        "settled_at" TIMESTAMP WITH TIME ZONE,
        "status" character varying(16) NOT NULL DEFAULT 'REQUESTED',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rides_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_rides_vehicle_type" CHECK (
          "vehicle_type" IN ('BIKE', 'AUTO', 'CAB')
        ),
        CONSTRAINT "CHK_rides_status" CHECK (
          "status" IN ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
        ),
        CONSTRAINT "FK_rides_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_rides_driver" FOREIGN KEY ("driver_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'rides'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%vehicle_type%'
        ) THEN
          ALTER TABLE "rides"
          ADD CONSTRAINT "CHK_rides_vehicle_type"
          CHECK ("vehicle_type" IN ('BIKE', 'AUTO', 'CAB'));
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'rides'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%status%'
        ) THEN
          ALTER TABLE "rides"
          ADD CONSTRAINT "CHK_rides_status"
          CHECK ("status" IN ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'rides'::regclass
            AND contype = 'f'
            AND conkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'rides'::regclass AND attname = 'customer_id'
            )]::smallint[]
        ) THEN
          ALTER TABLE "rides"
          ADD CONSTRAINT "FK_rides_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users"("id") ON DELETE RESTRICT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'rides'::regclass
            AND contype = 'f'
            AND conkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'rides'::regclass AND attname = 'driver_id'
            )]::smallint[]
        ) THEN
          ALTER TABLE "rides"
          ADD CONSTRAINT "FK_rides_driver" FOREIGN KEY ("driver_id")
          REFERENCES "users"("id") ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rides_customer_created" ON "rides" ("customer_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_rides_driver_status" ON "rides" ("driver_id", "status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_otp_challenges" ADD COLUMN IF NOT EXISTS "ride_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_otp_challenges" DROP CONSTRAINT IF EXISTS "CHK_workflow_otp_subject"`,
    );
    await queryRunner.query(`
      ALTER TABLE "workflow_otp_challenges"
      ADD CONSTRAINT "CHK_workflow_otp_subject" CHECK (
        ("order_id" IS NOT NULL AND "service_request_id" IS NULL AND "ride_id" IS NULL)
        OR ("order_id" IS NULL AND "service_request_id" IS NOT NULL AND "ride_id" IS NULL)
        OR ("order_id" IS NULL AND "service_request_id" IS NULL AND "ride_id" IS NOT NULL)
      )
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'workflow_otp_challenges'::regclass
            AND contype = 'f'
            AND conkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'workflow_otp_challenges'::regclass
                AND attname = 'ride_id'
            )]::smallint[]
        ) THEN
          ALTER TABLE "workflow_otp_challenges"
          ADD CONSTRAINT "FK_workflow_otp_ride" FOREIGN KEY ("ride_id")
          REFERENCES "rides"("id") ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_otp_ride" ON "workflow_otp_challenges" ("ride_id", "type", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "workflow_otp_challenges" WHERE "ride_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_workflow_otp_ride"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_otp_challenges" DROP CONSTRAINT "FK_workflow_otp_ride"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_otp_challenges" DROP CONSTRAINT "CHK_workflow_otp_subject"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_otp_challenges" DROP COLUMN "ride_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "workflow_otp_challenges"
      ADD CONSTRAINT "CHK_workflow_otp_subject" CHECK (
        ("order_id" IS NOT NULL AND "service_request_id" IS NULL)
        OR ("order_id" IS NULL AND "service_request_id" IS NOT NULL)
      )
    `);
    await queryRunner.query(`DROP TABLE "rides"`);
  }
}
