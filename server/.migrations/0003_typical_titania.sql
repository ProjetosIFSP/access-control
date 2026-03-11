ALTER TABLE "door_controller" ALTER COLUMN "room_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "door_controller" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."controller_role";