import { pgTable, foreignKey, serial, varchar, text, integer, timestamp, boolean, index, unique, uniqueIndex, check, jsonb, primaryKey, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const students = pgTable("students", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	nickname: varchar({ length: 255 }),
	photoUrl: text("photo_url"),
	birthDate: varchar("birth_date", { length: 50 }),
	hobbies: text(),
	dream: text(),
	message: text(),
	role: varchar({ length: 50 }).default('student'),
	activeFrameId: integer("active_frame_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	yearbookId: integer("yearbook_id"),
}, (table) => [
	foreignKey({
			columns: [table.yearbookId],
			foreignColumns: [yearbooks.id],
			name: "students_yearbook_id_fkey"
		}),
]);

export const frames = pgTable("frames", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	imageUrl: text("image_url").notNull(),
	description: text(),
	isFree: boolean("is_free").default(true),
	priceLabel: varchar("price_label", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	animation: text(),
});

export const friendRequests = pgTable("friend_requests", {
	id: serial().primaryKey().notNull(),
	senderId: varchar("sender_id", { length: 255 }).notNull(),
	receiverId: varchar("receiver_id", { length: 255 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_friend_requests_receiver").using("btree", table.receiverId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_friend_requests_sender").using("btree", table.senderId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	unique("friend_requests_sender_id_receiver_id_key").on(table.senderId, table.receiverId),
]);

export const photos = pgTable("photos", {
	id: serial().primaryKey().notNull(),
	url: text().notNull(),
	caption: text(),
	category: varchar({ length: 100 }).default('other'),
	uploadedBy: varchar("uploaded_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	yearbookId: integer("yearbook_id"),
}, (table) => [
	foreignKey({
			columns: [table.yearbookId],
			foreignColumns: [yearbooks.id],
			name: "photos_yearbook_id_fkey"
		}),
]);

export const memories = pgTable("memories", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	photoUrl: text("photo_url"),
	author: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	yearbookId: integer("yearbook_id"),
}, (table) => [
	foreignKey({
			columns: [table.yearbookId],
			foreignColumns: [yearbooks.id],
			name: "memories_yearbook_id_fkey"
		}),
]);

export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text(),
	eventDate: varchar("event_date", { length: 50 }).notNull(),
	photoUrl: text("photo_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	yearbookId: integer("yearbook_id"),
}, (table) => [
	foreignKey({
			columns: [table.yearbookId],
			foreignColumns: [yearbooks.id],
			name: "events_yearbook_id_fkey"
		}),
]);

export const teacherMessages = pgTable("teacher_messages", {
	id: serial().primaryKey().notNull(),
	teacherName: varchar("teacher_name", { length: 255 }).notNull(),
	subject: varchar({ length: 255 }),
	message: text().notNull(),
	photoUrl: text("photo_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	yearbookId: integer("yearbook_id"),
}, (table) => [
	foreignKey({
			columns: [table.yearbookId],
			foreignColumns: [yearbooks.id],
			name: "teacher_messages_yearbook_id_fkey"
		}),
]);

export const yearbooks = pgTable("yearbooks", {
	id: serial().primaryKey().notNull(),
	schoolName: text("school_name").notNull(),
	className: text("class_name").notNull(),
	academicYear: text("academic_year").notNull(),
	description: text(),
	ownerClerkId: text("owner_clerk_id").notNull(),
	isPublic: boolean("is_public").default(true),
	slug: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("yearbooks_slug_key").on(table.slug),
]);

export const yearbookMembers = pgTable("yearbook_members", {
	id: serial().primaryKey().notNull(),
	yearbookId: integer("yearbook_id"),
	clerkUserId: text("clerk_user_id").notNull(),
	role: text().default('member'),
	studentId: integer("student_id"),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "yearbook_members_student_id_fkey"
		}),
	foreignKey({
			columns: [table.yearbookId],
			foreignColumns: [yearbooks.id],
			name: "yearbook_members_yearbook_id_fkey"
		}).onDelete("cascade"),
	unique("yearbook_members_yearbook_id_clerk_user_id_key").on(table.yearbookId, table.clerkUserId),
]);

export const guestbookEntries = pgTable("guestbook_entries", {
	id: serial().primaryKey().notNull(),
	targetClerkId: text("target_clerk_id").notNull(),
	authorClerkId: text("author_clerk_id"),
	authorName: text("author_name").notNull(),
	message: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const feedLikes = pgTable("feed_likes", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id"),
	clerkUserId: text("clerk_user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [feedPosts.id],
			name: "feed_likes_post_id_fkey"
		}).onDelete("cascade"),
	unique("feed_likes_post_id_clerk_user_id_key").on(table.postId, table.clerkUserId),
]);

export const feedComments = pgTable("feed_comments", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id"),
	clerkUserId: text("clerk_user_id").notNull(),
	authorName: text("author_name").notNull(),
	authorPhoto: text("author_photo"),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [feedPosts.id],
			name: "feed_comments_post_id_fkey"
		}).onDelete("cascade"),
]);

export const feedPosts = pgTable("feed_posts", {
	id: serial().primaryKey().notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	authorName: text("author_name").notNull(),
	authorPhoto: text("author_photo"),
	content: text().notNull(),
	imageUrl: text("image_url"),
	likesCount: integer("likes_count").default(0),
	commentsCount: integer("comments_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	isPinned: boolean("is_pinned").default(false).notNull(),
	editedAt: timestamp("edited_at", { withTimezone: true, mode: 'string' }),
});

export const appSettings = pgTable("app_settings", {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const groupMessages = pgTable("group_messages", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	senderId: varchar("sender_id", { length: 255 }).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_group_messages_group").using("btree", table.groupId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groupConversations.id],
			name: "group_messages_group_id_fkey"
		}).onDelete("cascade"),
]);

export const feedShares = pgTable("feed_shares", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [feedPosts.id],
			name: "feed_shares_post_id_fkey"
		}).onDelete("cascade"),
	unique("feed_shares_post_id_clerk_user_id_key").on(table.postId, table.clerkUserId),
]);

export const groupConversations = pgTable("group_conversations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 120 }).notNull(),
	createdBy: varchar("created_by", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
description: text().default('').notNull(),
	cohortId: integer("cohort_id"),
	classId: integer("class_id"),
	ownerId: varchar("owner_id", { length: 255 }),
	privacy: varchar({ length: 20 }).default('private').notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	inviteToken: text("invite_token"),
}, (table) => [
	uniqueIndex("idx_groups_default_class").using("btree", table.classId.asc().nullsLast().op("int4_ops")).where(sql`((is_default = true) AND (class_id IS NOT NULL))`),
	uniqueIndex("idx_groups_default_cohort").using("btree", table.cohortId.asc().nullsLast().op("int4_ops")).where(sql`((is_default = true) AND (cohort_id IS NOT NULL) AND (class_id IS NULL))`),
	uniqueIndex("idx_groups_invite_token").using("btree", table.inviteToken.asc().nullsLast().op("text_ops")).where(sql`(invite_token IS NOT NULL)`),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "group_conversations_class_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.cohortId],
			foreignColumns: [cohorts.id],
			name: "group_conversations_cohort_id_fkey"
		}).onDelete("set null"),
	check("group_conversations_privacy_check", sql`(privacy)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[])`),
]);

export const directMessages = pgTable("direct_messages", {
	id: serial().primaryKey().notNull(),
	senderId: varchar("sender_id", { length: 255 }).notNull(),
	receiverId: varchar("receiver_id", { length: 255 }).notNull(),
	content: text().notNull(),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_dm_receiver").using("btree", table.receiverId.asc().nullsLast().op("text_ops")),
	index("idx_dm_sender").using("btree", table.senderId.asc().nullsLast().op("text_ops")),
]);

export const feedSavedPosts = pgTable("feed_saved_posts", {
	id: serial().primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [feedPosts.id],
			name: "feed_saved_posts_post_id_fkey"
		}).onDelete("cascade"),
	unique("feed_saved_posts_post_id_clerk_user_id_key").on(table.postId, table.clerkUserId),
]);

export const cohorts = pgTable("cohorts", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	year: integer().notNull(),
	schoolName: text("school_name").notNull(),
	academicYear: text("academic_year").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("cohorts_name_year_key").on(table.name, table.year),
	unique("cohorts_school_academic_year_key").on(table.schoolName, table.academicYear),
	check("cohorts_year_check", sql`(year >= 1900) AND (year <= 2200)`),
]);

export const classes = pgTable("classes", {
	id: serial().primaryKey().notNull(),
	cohortId: integer("cohort_id").notNull(),
	name: varchar({ length: 120 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.cohortId],
			foreignColumns: [cohorts.id],
			name: "classes_cohort_id_fkey"
		}).onDelete("cascade"),
	unique("classes_cohort_id_name_key").on(table.cohortId, table.name),
]);

export const appUsers = pgTable("app_users", {
	id: serial().primaryKey().notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	email: text(),
	fullName: text("full_name"),
	plan: text().default('free'),
	whopMembershipId: text("whop_membership_id"),
	whopCheckoutId: text("whop_checkout_id"),
	studentId: integer("student_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	nickname: text(),
	birthDate: text("birth_date"),
	phone: text(),
	facebook: text(),
	instagram: text(),
	zalo: text(),
	favoriteQuote: text("favorite_quote"),
	personalLetter: text("personal_letter"),
	photoUrl: text("photo_url"),
	memoryPhotos: jsonb("memory_photos").default([]),
	role: varchar({ length: 20 }).default('unknown'),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	schoolName: varchar("school_name", { length: 255 }),
	className: varchar("class_name", { length: 100 }),
	cohortId: integer("cohort_id"),
	classId: integer("class_id"),
	profileVisibility: varchar("profile_visibility", { length: 20 }).default('everyone').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "app_users_class_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.cohortId],
			foreignColumns: [cohorts.id],
			name: "app_users_cohort_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "app_users_student_id_fkey"
		}),
	unique("app_users_clerk_user_id_key").on(table.clerkUserId),
	check("app_users_profile_visibility_check", sql`(profile_visibility)::text = ANY ((ARRAY['everyone'::character varying, 'cohort'::character varying, 'friends'::character varying])::text[])`),
]);

export const friendships = pgTable("friendships", {
	id: serial().primaryKey().notNull(),
	userA: varchar("user_a", { length: 255 }).notNull(),
	userB: varchar("user_b", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	requesterId: varchar("requester_id", { length: 255 }).notNull(),
	addresseeId: varchar("addressee_id", { length: 255 }).notNull(),
	status: varchar({ length: 20 }).default('accepted').notNull(),
}, (table) => [
	index("idx_friendships_a").using("btree", table.userA.asc().nullsLast().op("text_ops")),
	index("idx_friendships_b").using("btree", table.userB.asc().nullsLast().op("text_ops")),
	index("idx_friendships_status_created").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	unique("friendships_user_a_user_b_key").on(table.userA, table.userB),
	unique("friendships_requester_addressee_key").on(table.requesterId, table.addresseeId),
	check("friendships_check", sql`(user_a)::text < (user_b)::text`),
	check("friendships_no_self_check", sql`(requester_id)::text <> (addressee_id)::text`),
	check("friendships_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying])::text[])`),
]);

export const groupPosts = pgTable("group_posts", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	authorId: varchar("author_id", { length: 255 }).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_group_posts_newest").using("btree", table.groupId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groupConversations.id],
			name: "group_posts_group_id_fkey"
		}).onDelete("cascade"),
	check("group_posts_content_check", sql`(length(btrim(content)) >= 1) AND (length(btrim(content)) <= 5000)`),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: varchar({ length: 40 }).notNull(),
	content: text().notNull(),
	link: text(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notifications_user_unread").using("btree", table.userId.asc().nullsLast().op("bool_ops"), table.isRead.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("bool_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [appUsers.clerkUserId],
			name: "notifications_user_id_fkey"
		}).onDelete("cascade"),
]);

export const userReports = pgTable("user_reports", {
	id: serial().primaryKey().notNull(),
	reporterId: text("reporter_id").notNull(),
	reportedId: text("reported_id").notNull(),
	reason: varchar({ length: 80 }).notNull(),
details: text().default('').notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_user_reports_status_created").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.reportedId],
			foreignColumns: [appUsers.clerkUserId],
			name: "user_reports_reported_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [appUsers.clerkUserId],
			name: "user_reports_reporter_id_fkey"
		}).onDelete("cascade"),
	check("user_reports_check", sql`reporter_id <> reported_id`),
]);

export const studentUnlockedFrames = pgTable("student_unlocked_frames", {
	studentId: integer("student_id").notNull(),
	frameId: integer("frame_id").notNull(),
	unlockedAt: timestamp("unlocked_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.frameId],
			foreignColumns: [frames.id],
			name: "student_unlocked_frames_frame_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_unlocked_frames_student_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.studentId, table.frameId], name: "student_unlocked_frames_pkey"}),
]);

export const userBlocks = pgTable("user_blocks", {
	blockerId: text("blocker_id").notNull(),
	blockedId: text("blocked_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.blockedId],
			foreignColumns: [appUsers.clerkUserId],
			name: "user_blocks_blocked_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.blockerId],
			foreignColumns: [appUsers.clerkUserId],
			name: "user_blocks_blocker_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.blockerId, table.blockedId], name: "user_blocks_pkey"}),
	check("user_blocks_check", sql`blocker_id <> blocked_id`),
]);

export const groupMembers = pgTable("group_members", {
	groupId: integer("group_id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	role: varchar({ length: 20 }).default('member').notNull(),
	status: varchar({ length: 20 }).default('joined').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groupConversations.id],
			name: "group_members_group_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.groupId, table.userId], name: "group_members_pkey"}),
	check("group_members_role_check", sql`(role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying])::text[])`),
	check("group_members_status_check", sql`(status)::text = ANY ((ARRAY['invited'::character varying, 'requested'::character varying, 'joined'::character varying])::text[])`),
]);
export const groups = pgView("groups", {	id: integer(),
	name: varchar({ length: 120 }),
	description: text(),
	cohortId: integer("cohort_id"),
	classId: integer("class_id"),
	ownerId: varchar("owner_id", { length: 255 }),
	privacy: varchar({ length: 20 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	isDefault: boolean("is_default"),
	inviteToken: text("invite_token"),
}).as(sql`SELECT id, name, description, cohort_id, class_id, owner_id, privacy, created_at, is_default, invite_token FROM group_conversations`);