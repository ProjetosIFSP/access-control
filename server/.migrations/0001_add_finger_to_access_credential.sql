CREATE TYPE "public"."finger_key" AS ENUM('right_thumb', 'right_index', 'right_middle', 'right_ring', 'right_pinky', 'left_thumb', 'left_index', 'left_middle', 'left_ring', 'left_pinky');--> statement-breakpoint
ALTER TABLE "access_credential" ADD COLUMN "finger" "finger_key";
