import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1791557486615 implements MigrationInterface {
    name = 'InitSchema1791557486615'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transaction_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transaction_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "description" text NOT NULL, "status" character varying(50) NOT NULL, "logged_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_20a6530a95a39f16f2fc90efdfc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "tx_histories_txn_id_idx" ON "transaction_histories" ("transaction_id", "logged_at") `);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('payment', 'refund', 'transfer')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('completed', 'paid', 'pending', 'failed', 'refunded')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference_id" character varying(50) NOT NULL, "payment_reference" character varying(100) NOT NULL, "user_id" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL DEFAULT 'payment', "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "amount" numeric(12,2) NOT NULL, "fee" numeric(12,2) NOT NULL DEFAULT '0', "subtotal" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(10) NOT NULL DEFAULT 'USD', "payment_method" character varying(100) NOT NULL, "notes" text, "settled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_365b158cbdb7b7bc18bca4004af" UNIQUE ("reference_id"), CONSTRAINT "UQ_706281e91c77293b5eb85a8de8d" UNIQUE ("payment_reference"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "transactions_ref_idx" ON "transactions" ("reference_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "transactions_payment_ref_idx" ON "transactions" ("payment_reference") `);
        await queryRunner.query(`CREATE INDEX "transactions_user_id_idx" ON "transactions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "transactions_type_idx" ON "transactions" ("type") `);
        await queryRunner.query(`CREATE INDEX "transactions_status_idx" ON "transactions" ("status") `);
        await queryRunner.query(`CREATE INDEX "transactions_created_at_idx" ON "transactions" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "transactions_user_created_idx" ON "transactions" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "transactions_status_created_idx" ON "transactions" ("status", "created_at") `);
        await queryRunner.query(`CREATE TABLE "booking_lifecycle_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "description" text NOT NULL, "status" character varying(50) NOT NULL, "logged_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c29f80a23d36e98e826655a3e03" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "booking_logs_bkg_id_idx" ON "booking_lifecycle_logs" ("booking_id", "logged_at") `);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('confirmed', 'completed', 'pending', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference_id" character varying(50) NOT NULL, "user_id" uuid NOT NULL, "transaction_id" uuid, "service_type" character varying NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'pending', "scheduled_date" TIMESTAMP WITH TIME ZONE NOT NULL, "time_slot" character varying(100) NOT NULL, "duration_hours" numeric(3,1) NOT NULL DEFAULT '1', "meeting_location" character varying(255) NOT NULL DEFAULT 'Virtual - Zoom Link Provided', "billing_amount" numeric(12,2) NOT NULL DEFAULT '0', "payment_status" character varying(50) NOT NULL DEFAULT 'Pending', "special_notes" text, "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e68e336cb989437b3c07e658733" UNIQUE ("reference_id"), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "bookings_ref_idx" ON "bookings" ("reference_id") `);
        await queryRunner.query(`CREATE INDEX "bookings_user_id_idx" ON "bookings" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "bookings_transaction_id_idx" ON "bookings" ("transaction_id") `);
        await queryRunner.query(`CREATE INDEX "bookings_service_type_idx" ON "bookings" ("service_type") `);
        await queryRunner.query(`CREATE INDEX "bookings_status_idx" ON "bookings" ("status") `);
        await queryRunner.query(`CREATE INDEX "bookings_scheduled_date_idx" ON "bookings" ("scheduled_date") `);
        await queryRunner.query(`CREATE INDEX "bookings_created_at_idx" ON "bookings" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "bookings_user_created_idx" ON "bookings" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "bookings_status_sched_idx" ON "bookings" ("status", "scheduled_date") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password" character varying NOT NULL, "full_name" character varying(150) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'VIEWER', "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', "phone" character varying(50), "avatar_url" character varying(500), "department" character varying(100), "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email") `);
        await queryRunner.query(`CREATE INDEX "users_full_name_idx" ON "users" ("full_name") `);
        await queryRunner.query(`CREATE INDEX "users_role_idx" ON "users" ("role") `);
        await queryRunner.query(`CREATE INDEX "users_status_idx" ON "users" ("status") `);
        await queryRunner.query(`CREATE INDEX "users_created_at_idx" ON "users" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "users_role_status_created_idx" ON "users" ("role", "status", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."system_alerts_level_enum" AS ENUM('ERROR', 'WARNING', 'INFO')`);
        await queryRunner.query(`CREATE TABLE "system_alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "message" character varying(255) NOT NULL, "level" "public"."system_alerts_level_enum" NOT NULL DEFAULT 'INFO', "is_active" boolean NOT NULL DEFAULT true, "action_label" character varying(100), "action_url" character varying(255), "triggered_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c4754bccb48e096e7da8eda23f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "system_alerts_level_idx" ON "system_alerts" ("level") `);
        await queryRunner.query(`CREATE INDEX "system_alerts_active_triggered_idx" ON "system_alerts" ("is_active", "triggered_at") `);
        await queryRunner.query(`ALTER TABLE "transaction_histories" ADD CONSTRAINT "FK_63acba7ab66b0c73dc62de060ed" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "booking_lifecycle_logs" ADD CONSTRAINT "FK_fd57e138f08442fa3d7cd5d2e31" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_4717062ac6a7772c2c5e8c14b5c" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_4717062ac6a7772c2c5e8c14b5c"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_64cd97487c5c42806458ab5520c"`);
        await queryRunner.query(`ALTER TABLE "booking_lifecycle_logs" DROP CONSTRAINT "FK_fd57e138f08442fa3d7cd5d2e31"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"`);
        await queryRunner.query(`ALTER TABLE "transaction_histories" DROP CONSTRAINT "FK_63acba7ab66b0c73dc62de060ed"`);
        await queryRunner.query(`DROP INDEX "public"."system_alerts_active_triggered_idx"`);
        await queryRunner.query(`DROP INDEX "public"."system_alerts_level_idx"`);
        await queryRunner.query(`DROP TABLE "system_alerts"`);
        await queryRunner.query(`DROP TYPE "public"."system_alerts_level_enum"`);
        await queryRunner.query(`DROP INDEX "public"."users_role_status_created_idx"`);
        await queryRunner.query(`DROP INDEX "public"."users_created_at_idx"`);
        await queryRunner.query(`DROP INDEX "public"."users_status_idx"`);
        await queryRunner.query(`DROP INDEX "public"."users_role_idx"`);
        await queryRunner.query(`DROP INDEX "public"."users_full_name_idx"`);
        await queryRunner.query(`DROP INDEX "public"."users_email_idx"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_status_sched_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_user_created_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_created_at_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_scheduled_date_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_status_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_service_type_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_transaction_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_user_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."bookings_ref_idx"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."booking_logs_bkg_id_idx"`);
        await queryRunner.query(`DROP TABLE "booking_lifecycle_logs"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_status_created_idx"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_user_created_idx"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_created_at_idx"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_status_idx"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_type_idx"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_user_id_idx"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_payment_ref_idx"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_ref_idx"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."tx_histories_txn_id_idx"`);
        await queryRunner.query(`DROP TABLE "transaction_histories"`);
    }

}
