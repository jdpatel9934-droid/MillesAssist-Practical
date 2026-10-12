import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1791700179201 implements MigrationInterface {
    name = 'InitSchema1791700179201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" RENAME COLUMN "payment_status" TO "paymentStatus"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "paymentStatus"`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_paymentstatus_enum" AS ENUM('Paid', 'Pending', 'Refunded')`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "paymentStatus" "public"."bookings_paymentstatus_enum" NOT NULL DEFAULT 'Pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "paymentStatus"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_paymentstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "paymentStatus" character varying(50) NOT NULL DEFAULT 'Pending'`);
        await queryRunner.query(`ALTER TABLE "bookings" RENAME COLUMN "paymentStatus" TO "payment_status"`);
    }

}
