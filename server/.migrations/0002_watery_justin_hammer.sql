CREATE TYPE "public"."controller_role" AS ENUM('door', 'enrollment_terminal');--> statement-breakpoint
CREATE TYPE "public"."sensor_protocol" AS ENUM('R30X', 'BOLAND');--> statement-breakpoint
ALTER TABLE "door_controller" ALTER COLUMN "room_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "access_credential" ADD COLUMN "enrolled_by_controller_id" text;--> statement-breakpoint
ALTER TABLE "door_controller" ADD COLUMN "role" "controller_role" DEFAULT 'door' NOT NULL;--> statement-breakpoint
ALTER TABLE "door_controller" ADD COLUMN "sensor_protocol" "sensor_protocol";--> statement-breakpoint
ALTER TABLE "door_controller" ADD COLUMN "sensor_model" text;--> statement-breakpoint
ALTER TABLE "access_credential" ADD CONSTRAINT "access_credential_enrolled_by_controller_id_door_controller_id_fk" FOREIGN KEY ("enrolled_by_controller_id") REFERENCES "public"."door_controller"("id") ON DELETE set null ON UPDATE no action;
