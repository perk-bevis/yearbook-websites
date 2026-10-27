-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"nickname" varchar(255),
	"photo_url" text,
	"birth_date" varchar(50),
	"hobbies" text,
	"dream" text,
	"message" text,
	"role" varchar(50) DEFAULT 'student',
	"active_frame_id" integer,
	"created_at" timestamp DEFAULT now(),
	"yearbook_id" integer
);
--> statement-breakpoint
CREATE TABLE "frames" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"image_url" text NOT NULL,
	"description" text,
	"is_free" boolean DEFAULT true,
	"price_label" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"animation" text
);
--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"receiver_id" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "friend_requests_sender_id_receiver_id_key" UNIQUE("sender_id","receiver_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"category" varchar(100) DEFAULT 'other',
	"uploaded_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"yearbook_id" integer
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"photo_url" text,
	"author" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"yearbook_id" integer
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"event_date" varchar(50) NOT NULL,
	"photo_url" text,
	"created_at" timestamp DEFAULT now(),
	"yearbook_id" integer
);
--> statement-breakpoint
CREATE TABLE "teacher_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_name" varchar(255) NOT NULL,
	"subject" varchar(255),
	"message" text NOT NULL,
	"photo_url" text,
	"created_at" timestamp DEFAULT now(),
	"yearbook_id" integer
);
--> statement-breakpoint
CREATE TABLE "yearbooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_name" text NOT NULL,
	"class_name" text NOT NULL,
	"academic_year" text NOT NULL,
	"description" text,
	"owner_clerk_id" text NOT NULL,
	"is_public" boolean DEFAULT true,
	"slug" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "yearbooks_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "yearbook_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"yearbook_id" integer,
	"clerk_user_id" text NOT NULL,
	"role" text DEFAULT 'member',
	"student_id" integer,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "yearbook_members_yearbook_id_clerk_user_id_key" UNIQUE("yearbook_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "guestbook_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_clerk_id" text NOT NULL,
	"author_clerk_id" text,
	"author_name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"clerk_user_id" text NOT NULL,
	CONSTRAINT "feed_likes_post_id_clerk_user_id_key" UNIQUE("post_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "feed_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer,
	"clerk_user_id" text NOT NULL,
	"author_name" text NOT NULL,
	"author_photo" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"author_name" text NOT NULL,
	"author_photo" text,
	"content" text NOT NULL,
	"image_url" text,
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"is_pinned" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_a" varchar(255) NOT NULL,
	"user_b" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "friendships_user_a_user_b_key" UNIQUE("user_a","user_b"),
	CONSTRAINT "friendships_check" CHECK ((user_a)::text < (user_b)::text)
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"full_name" text,
	"plan" text DEFAULT 'free',
	"whop_membership_id" text,
	"whop_checkout_id" text,
	"student_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"nickname" text,
	"birth_date" text,
	"phone" text,
	"facebook" text,
	"instagram" text,
	"zalo" text,
	"favorite_quote" text,
	"personal_letter" text,
	"photo_url" text,
	"memory_photos" jsonb DEFAULT '[]'::jsonb,
	"role" varchar(20) DEFAULT 'unknown',
	"last_seen_at" timestamp with time zone DEFAULT now(),
	"school_name" varchar(255),
	"class_name" varchar(100),
	CONSTRAINT "app_users_clerk_user_id_key" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_shares_post_id_clerk_user_id_key" UNIQUE("post_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"receiver_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_saved_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_saved_posts_post_id_clerk_user_id_key" UNIQUE("post_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "student_unlocked_frames" (
	"student_id" integer NOT NULL,
	"frame_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now(),
	CONSTRAINT "student_unlocked_frames_pkey" PRIMARY KEY("student_id","frame_id")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "group_members_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_yearbook_id_fkey" FOREIGN KEY ("yearbook_id") REFERENCES "public"."yearbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_yearbook_id_fkey" FOREIGN KEY ("yearbook_id") REFERENCES "public"."yearbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_yearbook_id_fkey" FOREIGN KEY ("yearbook_id") REFERENCES "public"."yearbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_yearbook_id_fkey" FOREIGN KEY ("yearbook_id") REFERENCES "public"."yearbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_messages" ADD CONSTRAINT "teacher_messages_yearbook_id_fkey" FOREIGN KEY ("yearbook_id") REFERENCES "public"."yearbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yearbook_members" ADD CONSTRAINT "yearbook_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yearbook_members" ADD CONSTRAINT "yearbook_members_yearbook_id_fkey" FOREIGN KEY ("yearbook_id") REFERENCES "public"."yearbooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_shares" ADD CONSTRAINT "feed_shares_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_saved_posts" ADD CONSTRAINT "feed_saved_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_unlocked_frames" ADD CONSTRAINT "student_unlocked_frames_frame_id_fkey" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_unlocked_frames" ADD CONSTRAINT "student_unlocked_frames_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_friend_requests_receiver" ON "friend_requests" USING btree ("receiver_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_friend_requests_sender" ON "friend_requests" USING btree ("sender_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_friendships_a" ON "friendships" USING btree ("user_a" text_ops);--> statement-breakpoint
CREATE INDEX "idx_friendships_b" ON "friendships" USING btree ("user_b" text_ops);--> statement-breakpoint
CREATE INDEX "idx_group_messages_group" ON "group_messages" USING btree ("group_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_dm_receiver" ON "direct_messages" USING btree ("receiver_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_dm_sender" ON "direct_messages" USING btree ("sender_id" text_ops);
*/