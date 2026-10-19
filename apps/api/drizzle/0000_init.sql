CREATE TABLE "exercise_muscles" (
	"exercise_id" uuid NOT NULL,
	"muscle_group_id" integer NOT NULL,
	"role" text NOT NULL,
	"coefficient" real NOT NULL,
	CONSTRAINT "exercise_muscles_exercise_id_muscle_group_id_pk" PRIMARY KEY("exercise_id","muscle_group_id")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"name_ru" text NOT NULL,
	"name_en" text,
	"equipment" text NOT NULL,
	"mechanics" text NOT NULL,
	"is_bodyweight" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"garmin_category" text,
	"garmin_subcategory" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "garmin_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" text NOT NULL,
	"external_user_id" text,
	"tokens_encrypted" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garmin_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"set_index" integer NOT NULL,
	"message_index" integer,
	"started_at" timestamp with time zone NOT NULL,
	"duration_sec" double precision,
	"rest_after_sec" double precision,
	"reps_garmin" integer,
	"weight_garmin_kg" real,
	"garmin_hints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avg_hr" smallint,
	"max_hr" smallint,
	"min_hr" smallint,
	"hr_peak" smallint,
	"calories_est" real,
	"suspicious" text,
	CONSTRAINT "garmin_sets_workout_index_uq" UNIQUE("workout_id","set_index")
);
--> statement-breakpoint
CREATE TABLE "manual_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"exercise_id" uuid,
	"weight_kg" real,
	"reps" integer,
	"rpe" real,
	"is_warmup" boolean DEFAULT false NOT NULL,
	"is_failure" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muscle_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "muscle_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name_ru" text NOT NULL,
	"region" text NOT NULL,
	"svg_path_id" text NOT NULL,
	CONSTRAINT "muscle_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "set_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garmin_set_id" uuid NOT NULL,
	"exercise_id" uuid,
	"weight_kg" real,
	"reps" integer,
	"rpe" real,
	"is_warmup" boolean DEFAULT false NOT NULL,
	"is_failure" boolean DEFAULT false NOT NULL,
	"is_excluded" boolean DEFAULT false NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "set_annotations_garmin_set_id_unique" UNIQUE("garmin_set_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"password_hash" text,
	"apple_sub" text,
	"name" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_apple_sub_unique" UNIQUE("apple_sub")
);
--> statement-breakpoint
CREATE TABLE "workout_hr" (
	"workout_id" uuid PRIMARY KEY NOT NULL,
	"offsets_sec" integer[] NOT NULL,
	"bpm" smallint[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" text NOT NULL,
	"garmin_activity_id" text,
	"file_hash" text,
	"fit_object_key" text,
	"started_at" timestamp with time zone NOT NULL,
	"utc_offset_sec" integer,
	"duration_sec" double precision,
	"timer_sec" double precision,
	"active_sec" double precision,
	"calories" integer,
	"avg_hr" smallint,
	"max_hr" smallint,
	"total_reps_garmin" integer,
	"device_model" text,
	"device_serial" text,
	"body_weight_kg" real,
	"hr_zones" jsonb,
	"title" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workouts_user_activity_uq" UNIQUE("user_id","garmin_activity_id"),
	CONSTRAINT "workouts_user_file_hash_uq" UNIQUE("user_id","file_hash")
);
--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscles" ADD CONSTRAINT "exercise_muscles_muscle_group_id_muscle_groups_id_fk" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_connections" ADD CONSTRAINT "garmin_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_sets" ADD CONSTRAINT "garmin_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_sets" ADD CONSTRAINT "manual_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_sets" ADD CONSTRAINT "manual_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_annotations" ADD CONSTRAINT "set_annotations_garmin_set_id_garmin_sets_id_fk" FOREIGN KEY ("garmin_set_id") REFERENCES "public"."garmin_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_annotations" ADD CONSTRAINT "set_annotations_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_hr" ADD CONSTRAINT "workout_hr_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_user_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "manual_sets_workout_idx" ON "manual_sets" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workouts_user_started_idx" ON "workouts" USING btree ("user_id","started_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE VIEW "public"."effective_sets" AS (
  SELECT
    gs.id AS set_id,
    'garmin' AS kind,
    gs.workout_id,
    gs.set_index AS order_index,
    gs.started_at,
    gs.duration_sec,
    a.exercise_id,
    COALESCE(a.weight_kg, gs.weight_garmin_kg) AS weight_kg,
    COALESCE(a.reps, gs.reps_garmin) AS reps,
    CASE
      WHEN a.reps IS NOT NULL THEN 'user'
      WHEN gs.reps_garmin IS NOT NULL THEN 'garmin'
    END AS reps_source,
    a.rpe,
    COALESCE(a.is_warmup, false) AS is_warmup,
    COALESCE(a.is_failure, false) AS is_failure,
    COALESCE(a.is_excluded, false) AS is_excluded,
    a.note,
    gs.avg_hr,
    gs.hr_peak
  FROM garmin_sets gs
  LEFT JOIN set_annotations a ON a.garmin_set_id = gs.id
  UNION ALL
  SELECT
    ms.id,
    'manual',
    ms.workout_id,
    ms.order_index,
    NULL,
    NULL,
    ms.exercise_id,
    ms.weight_kg,
    ms.reps,
    CASE WHEN ms.reps IS NOT NULL THEN 'user' END,
    ms.rpe,
    ms.is_warmup,
    ms.is_failure,
    false,
    ms.note,
    NULL,
    NULL
  FROM manual_sets ms
);