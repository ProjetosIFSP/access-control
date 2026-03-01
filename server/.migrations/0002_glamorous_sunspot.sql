ALTER TABLE "room" ALTER COLUMN "is_locked" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "room_type" ADD COLUMN "abbreviation" text NOT NULL;