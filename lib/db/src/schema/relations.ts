import { relations } from "drizzle-orm";
import {
  neighborhoodUsersTable,
  postsTable,
  postLikesTable,
  listingsTable,
  eventsTable,
  eventRsvpsTable,
  alertsTable,
  resourcesTable,
} from "./community";

export const neighborhoodUsersRelations = relations(neighborhoodUsersTable, ({ many }) => ({
  posts: many(postsTable),
  postLikes: many(postLikesTable),
  listings: many(listingsTable),
  events: many(eventsTable),
  eventRsvps: many(eventRsvpsTable),
  alerts: many(alertsTable),
  resources: many(resourcesTable),
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  author: one(neighborhoodUsersTable, {
    fields: [postsTable.authorId],
    references: [neighborhoodUsersTable.id],
  }),
  likes: many(postLikesTable),
}));

export const postLikesRelations = relations(postLikesTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [postLikesTable.postId],
    references: [postsTable.id],
  }),
  user: one(neighborhoodUsersTable, {
    fields: [postLikesTable.userId],
    references: [neighborhoodUsersTable.id],
  }),
}));

export const listingsRelations = relations(listingsTable, ({ one }) => ({
  seller: one(neighborhoodUsersTable, {
    fields: [listingsTable.sellerId],
    references: [neighborhoodUsersTable.id],
  }),
}));

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
  organizer: one(neighborhoodUsersTable, {
    fields: [eventsTable.organizerId],
    references: [neighborhoodUsersTable.id],
  }),
  rsvps: many(eventRsvpsTable),
}));

export const eventRsvpsRelations = relations(eventRsvpsTable, ({ one }) => ({
  event: one(eventsTable, {
    fields: [eventRsvpsTable.eventId],
    references: [eventsTable.id],
  }),
  user: one(neighborhoodUsersTable, {
    fields: [eventRsvpsTable.userId],
    references: [neighborhoodUsersTable.id],
  }),
}));

export const alertsRelations = relations(alertsTable, ({ one }) => ({
  reporter: one(neighborhoodUsersTable, {
    fields: [alertsTable.reporterId],
    references: [neighborhoodUsersTable.id],
  }),
}));

export const resourcesRelations = relations(resourcesTable, ({ one }) => ({
  offerer: one(neighborhoodUsersTable, {
    fields: [resourcesTable.offererId],
    references: [neighborhoodUsersTable.id],
  }),
}));
