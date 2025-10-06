CREATE TYPE "public"."access_status" AS ENUM('GRANTED', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."credential_type" AS ENUM('FINGERPRINT', 'NFC_TAG');--> statement-breakpoint
CREATE TYPE "public"."door_command_status" AS ENUM('PENDING', 'SENT', 'COMPLETED', 'FAILED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."door_command_type" AS ENUM('UNLOCK', 'LOCK', 'SYNC_STATE');--> statement-breakpoint
CREATE TYPE "public"."door_state" AS ENUM('OPEN', 'CLOSED', 'UNKNOWN');--> statement-breakpoint
CREATE TABLE "access_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "credential_type" NOT NULL,
	"value" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_credential_value_unique" UNIQUE("value")
);
--> statement-breakpoint
CREATE TABLE "access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"user_id" text,
	"access_credential_id" text,
	"credential_value_used" text NOT NULL,
	"status" "access_status" NOT NULL,
	"reason" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_room_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"room_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "door_command" (
	"id" text PRIMARY KEY NOT NULL,
	"controller_id" text NOT NULL,
	"type" "door_command_type" NOT NULL,
	"status" "door_command_status" DEFAULT 'PENDING' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_payload" jsonb DEFAULT NULL,
	"error_message" text,
	"expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "door_controller" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"firmware_version" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "door_controller_room_id_unique" UNIQUE("room_id")
);
--> statement-breakpoint
CREATE TABLE "block" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "block_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"block_id" text NOT NULL,
	"is_locked" boolean DEFAULT true,
	"door_state" "door_state" DEFAULT 'UNKNOWN' NOT NULL,
	"last_status_update_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "room_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "access_credential" ADD CONSTRAINT "access_credential_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_access_credential_id_access_credential_id_fk" FOREIGN KEY ("access_credential_id") REFERENCES "public"."access_credential"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_room_permission" ADD CONSTRAINT "user_room_permission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_room_permission" ADD CONSTRAINT "user_room_permission_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "door_command" ADD CONSTRAINT "door_command_controller_id_door_controller_id_fk" FOREIGN KEY ("controller_id") REFERENCES "public"."door_controller"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "door_controller" ADD CONSTRAINT "door_controller_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;