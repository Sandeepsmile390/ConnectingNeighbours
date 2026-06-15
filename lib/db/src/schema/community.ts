import { pgTable, serial, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const postCategoryEnum = pgEnum("post_category", ["general", "announcement", "helpNeeded", "lostFound", "recommendation", "safety"]);
export const listingTypeEnum = pgEnum("listing_type", ["sell", "free", "rent"]);
export const listingCategoryEnum = pgEnum("listing_category", ["electronics", "furniture", "clothing", "books", "groceries", "appliances", "other"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["low", "medium", "high", "emergency"]);
export const resourceTypeEnum = pgEnum("resource_type", ["ride", "item", "service", "childcare"]);

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

export const insertNeighborhoodUserSchema = createInsertSchema(neighborhoodUsersTable).omit({ id: true, joinedAt: true });
export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true });
export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, rsvpCount: true });
export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true, isResolved: true });
export const insertResourceSchema = createInsertSchema(resourcesTable).omit({ id: true, createdAt: true });

export type NeighborhoodUser = typeof neighborhoodUsersTable.$inferSelect;
export type Post = typeof postsTable.$inferSelect;
export type Listing = typeof listingsTable.$inferSelect;
export type Event = typeof eventsTable.$inferSelect;
export type Alert = typeof alertsTable.$inferSelect;
export type Resource = typeof resourcesTable.$inferSelect;
