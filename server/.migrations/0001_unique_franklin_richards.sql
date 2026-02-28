CREATE TABLE "user_room_type_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"room_type_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "profile_room_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"room_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_room_type_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"room_type_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text NOT NULL,
	"profile_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_type" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "room_type_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "type_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "requires_biometry" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "requires_rfid" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_room_type_permission" ADD CONSTRAINT "user_room_type_permission_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_room_type_permission" ADD CONSTRAINT "user_room_type_permission_room_type_id_room_type_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_room_permission" ADD CONSTRAINT "profile_room_permission_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_room_permission" ADD CONSTRAINT "profile_room_permission_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_room_type_permission" ADD CONSTRAINT "profile_room_type_permission_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_room_type_permission" ADD CONSTRAINT "profile_room_type_permission_room_type_id_room_type_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_type_id_room_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."room_type"("id") ON DELETE restrict ON UPDATE no action;