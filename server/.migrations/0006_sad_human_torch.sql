ALTER TYPE "public"."door_command_type" ADD VALUE 'TOGGLE' BEFORE 'SYNC_STATE';--> statement-breakpoint
ALTER TYPE "public"."door_state" ADD VALUE 'LOCKED' BEFORE 'UNKNOWN';