import { relations } from "drizzle-orm/relations";
import { yearbooks, students, photos, memories, events, teacherMessages, yearbookMembers, feedPosts, feedLikes, feedComments, groupConversations, groupMessages, feedShares, classes, cohorts, feedSavedPosts, appUsers, groupPosts, notifications, userReports, frames, studentUnlockedFrames, userBlocks, groupMembers } from "./schema";

export const studentsRelations = relations(students, ({one, many}) => ({
	yearbook: one(yearbooks, {
		fields: [students.yearbookId],
		references: [yearbooks.id]
	}),
	yearbookMembers: many(yearbookMembers),
	appUsers: many(appUsers),
	studentUnlockedFrames: many(studentUnlockedFrames),
}));

export const yearbooksRelations = relations(yearbooks, ({many}) => ({
	students: many(students),
	photos: many(photos),
	memories: many(memories),
	events: many(events),
	teacherMessages: many(teacherMessages),
	yearbookMembers: many(yearbookMembers),
}));

export const photosRelations = relations(photos, ({one}) => ({
	yearbook: one(yearbooks, {
		fields: [photos.yearbookId],
		references: [yearbooks.id]
	}),
}));

export const memoriesRelations = relations(memories, ({one}) => ({
	yearbook: one(yearbooks, {
		fields: [memories.yearbookId],
		references: [yearbooks.id]
	}),
}));

export const eventsRelations = relations(events, ({one}) => ({
	yearbook: one(yearbooks, {
		fields: [events.yearbookId],
		references: [yearbooks.id]
	}),
}));

export const teacherMessagesRelations = relations(teacherMessages, ({one}) => ({
	yearbook: one(yearbooks, {
		fields: [teacherMessages.yearbookId],
		references: [yearbooks.id]
	}),
}));

export const yearbookMembersRelations = relations(yearbookMembers, ({one}) => ({
	student: one(students, {
		fields: [yearbookMembers.studentId],
		references: [students.id]
	}),
	yearbook: one(yearbooks, {
		fields: [yearbookMembers.yearbookId],
		references: [yearbooks.id]
	}),
}));

export const feedLikesRelations = relations(feedLikes, ({one}) => ({
	feedPost: one(feedPosts, {
		fields: [feedLikes.postId],
		references: [feedPosts.id]
	}),
}));

export const feedPostsRelations = relations(feedPosts, ({many}) => ({
	feedLikes: many(feedLikes),
	feedComments: many(feedComments),
	feedShares: many(feedShares),
	feedSavedPosts: many(feedSavedPosts),
}));

export const feedCommentsRelations = relations(feedComments, ({one}) => ({
	feedPost: one(feedPosts, {
		fields: [feedComments.postId],
		references: [feedPosts.id]
	}),
}));

export const groupMessagesRelations = relations(groupMessages, ({one}) => ({
	groupConversation: one(groupConversations, {
		fields: [groupMessages.groupId],
		references: [groupConversations.id]
	}),
}));

export const groupConversationsRelations = relations(groupConversations, ({one, many}) => ({
	groupMessages: many(groupMessages),
	class: one(classes, {
		fields: [groupConversations.classId],
		references: [classes.id]
	}),
	cohort: one(cohorts, {
		fields: [groupConversations.cohortId],
		references: [cohorts.id]
	}),
	groupPosts: many(groupPosts),
	groupMembers: many(groupMembers),
}));

export const feedSharesRelations = relations(feedShares, ({one}) => ({
	feedPost: one(feedPosts, {
		fields: [feedShares.postId],
		references: [feedPosts.id]
	}),
}));

export const classesRelations = relations(classes, ({one, many}) => ({
	groupConversations: many(groupConversations),
	cohort: one(cohorts, {
		fields: [classes.cohortId],
		references: [cohorts.id]
	}),
	appUsers: many(appUsers),
}));

export const cohortsRelations = relations(cohorts, ({many}) => ({
	groupConversations: many(groupConversations),
	classes: many(classes),
	appUsers: many(appUsers),
}));

export const feedSavedPostsRelations = relations(feedSavedPosts, ({one}) => ({
	feedPost: one(feedPosts, {
		fields: [feedSavedPosts.postId],
		references: [feedPosts.id]
	}),
}));

export const appUsersRelations = relations(appUsers, ({one, many}) => ({
	class: one(classes, {
		fields: [appUsers.classId],
		references: [classes.id]
	}),
	cohort: one(cohorts, {
		fields: [appUsers.cohortId],
		references: [cohorts.id]
	}),
	student: one(students, {
		fields: [appUsers.studentId],
		references: [students.id]
	}),
	notifications: many(notifications),
	userReports_reportedId: many(userReports, {
		relationName: "userReports_reportedId_appUsers_clerkUserId"
	}),
	userReports_reporterId: many(userReports, {
		relationName: "userReports_reporterId_appUsers_clerkUserId"
	}),
	userBlocks_blockedId: many(userBlocks, {
		relationName: "userBlocks_blockedId_appUsers_clerkUserId"
	}),
	userBlocks_blockerId: many(userBlocks, {
		relationName: "userBlocks_blockerId_appUsers_clerkUserId"
	}),
}));

export const groupPostsRelations = relations(groupPosts, ({one}) => ({
	groupConversation: one(groupConversations, {
		fields: [groupPosts.groupId],
		references: [groupConversations.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	appUser: one(appUsers, {
		fields: [notifications.userId],
		references: [appUsers.clerkUserId]
	}),
}));

export const userReportsRelations = relations(userReports, ({one}) => ({
	appUser_reportedId: one(appUsers, {
		fields: [userReports.reportedId],
		references: [appUsers.clerkUserId],
		relationName: "userReports_reportedId_appUsers_clerkUserId"
	}),
	appUser_reporterId: one(appUsers, {
		fields: [userReports.reporterId],
		references: [appUsers.clerkUserId],
		relationName: "userReports_reporterId_appUsers_clerkUserId"
	}),
}));

export const studentUnlockedFramesRelations = relations(studentUnlockedFrames, ({one}) => ({
	frame: one(frames, {
		fields: [studentUnlockedFrames.frameId],
		references: [frames.id]
	}),
	student: one(students, {
		fields: [studentUnlockedFrames.studentId],
		references: [students.id]
	}),
}));

export const framesRelations = relations(frames, ({many}) => ({
	studentUnlockedFrames: many(studentUnlockedFrames),
}));

export const userBlocksRelations = relations(userBlocks, ({one}) => ({
	appUser_blockedId: one(appUsers, {
		fields: [userBlocks.blockedId],
		references: [appUsers.clerkUserId],
		relationName: "userBlocks_blockedId_appUsers_clerkUserId"
	}),
	appUser_blockerId: one(appUsers, {
		fields: [userBlocks.blockerId],
		references: [appUsers.clerkUserId],
		relationName: "userBlocks_blockerId_appUsers_clerkUserId"
	}),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	groupConversation: one(groupConversations, {
		fields: [groupMembers.groupId],
		references: [groupConversations.id]
	}),
}));