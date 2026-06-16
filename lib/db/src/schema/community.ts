import { pgTable, serial, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const postCategoryEnum = pgEnum("post_category", ["general", "announcement", "helpNeeded", "lostFound", "recommendation", "safety"]);
export const listingTypeEnum = pgEnum("listing_type", ["sell", "free", "rent"]);
export const listingCategoryEnum = pgEnum("listing_category", ["electronics", "furniture", "clothing", "books", "groceries", "appliances", "other"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["low", "medium", "high", "emergency"]);
export const resourceTypeEnum = pgEnum("resource_type", ["ride", "item", "service", "childcare"]);
export const feedbackCategoryEnum = pgEnum("feedback_category", ["bug", "suggestion", "complaint", "other"]);

export const coloniesTable = pgTable("colonies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const neighborhoodUsersTable = pgTable("neighborhood_users", {
  id: serial("id").primaryKey(),
  replitId: varchar("replit_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  bio: text("bio"),
  apartment: varchar("apartment", { length: 100 }),
  avatarUrl: text("avatar_url"),
  phone: varchar("phone", { length: 50 }),
  isVerified: boolean("is_verified").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  colonyId: integer("colony_id").references(() => coloniesTable.id),
  isColonyAdmin: boolean("is_colony_admin").notNull().default(false),
  isColonyApproved: boolean("is_colony_approved").notNull().default(false),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  linkedinUrl: text("linkedin_url"),
  instagramUrl: text("instagram_url"),
  githubUrl: text("github_url"),
});

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => neighborhoodUsersTable.id),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  category: postCategoryEnum("category").notNull().default("general"),
  imageUrl: text("image_url"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postLikesTable = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  userId: integer("user_id").notNull().references(() => neighborhoodUsersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull().references(() => neighborhoodUsersTable.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 50 }),
  type: listingTypeEnum("type").notNull().default("sell"),
  category: listingCategoryEnum("category").notNull().default("other"),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  organizerId: integer("organizer_id").notNull().references(() => neighborhoodUsersTable.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  rsvpCount: integer("rsvp_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventRsvpsTable = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  userId: integer("user_id").notNull().references(() => neighborhoodUsersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => neighborhoodUsersTable.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  severity: alertSeverityEnum("severity").notNull().default("low"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resourcesTable = pgTable("resources", {
  id: serial("id").primaryKey(),
  offererId: integer("offerer_id").notNull().references(() => neighborhoodUsersTable.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  type: resourceTypeEnum("type").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => neighborhoodUsersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => neighborhoodUsersTable.id),
  receiverId: integer("receiver_id").notNull().references(() => neighborhoodUsersTable.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isEdited: boolean("is_edited").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  messageType: varchar("message_type", { length: 50 }).notNull().default("text"),
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedbacksTable = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => neighborhoodUsersTable.id),
  category: feedbackCategoryEnum("category").notNull().default("suggestion"),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hostelsTable = pgTable("hostels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  description: text("description").notNull(),
  contactInfo: varchar("contact_info", { length: 255 }).notNull(),
  price: integer("price").notNull(),
  colonyId: integer("colony_id").notNull().references(() => coloniesTable.id, { onDelete: "cascade" }),
  createdById: integer("created_by_id").notNull().references(() => neighborhoodUsersTable.id),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNeighborhoodUserSchema = createInsertSchema(neighborhoodUsersTable).omit({ id: true, joinedAt: true });
export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true });
export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, rsvpCount: true });
export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, isResolved: true });
export const insertResourceSchema = createInsertSchema(resourcesTable).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true, isRead: true });
export const insertFeedbackSchema = createInsertSchema(feedbacksTable).omit({ id: true, createdAt: true });
export const insertColonySchema = createInsertSchema(coloniesTable).omit({ id: true, createdAt: true });
export const insertHostelSchema = createInsertSchema(hostelsTable).omit({ id: true, createdAt: true });

export type NeighborhoodUser = typeof neighborhoodUsersTable.$inferSelect;
export type Post = typeof postsTable.$inferSelect;
export type Listing = typeof listingsTable.$inferSelect;
export type Event = typeof eventsTable.$inferSelect;
export type Alert = typeof alertsTable.$inferSelect;
export type Resource = typeof resourcesTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type Feedback = typeof feedbacksTable.$inferSelect;
export type Colony = typeof coloniesTable.$inferSelect;
export type Hostel = typeof hostelsTable.$inferSelect;


