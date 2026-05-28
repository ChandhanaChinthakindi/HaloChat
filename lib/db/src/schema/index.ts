import { pgTable, text, integer, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  appleId: text("apple_id").unique(),
  googleId: text("google_id").unique(),
  name: text("name"),
  username: text("username").unique(),
  gender: text("gender"),
  dateOfBirth: text("date_of_birth"), // YYYY-MM-DD
  pushToken: text("push_token"),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companionsTable = pgTable("companions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  deviceId: text("device_id"), // nullable — legacy field kept for migration
  name: text("name").notNull(),
  personality: text("personality").notNull(),
  gender: text("gender"), // "male" | "female" | "nonbinary" | null
  customPersonality: text("custom_personality"),
  avatarColor: text("avatar_color").notNull().default("purple"),
  relationshipLevel: integer("relationship_level").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  lastCheckinSentAt: timestamp("last_checkin_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  companionId: uuid("companion_id")
    .notNull()
    .references(() => companionsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memoryNotesTable = pgTable("memory_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  companionId: uuid("companion_id")
    .notNull()
    .references(() => companionsTable.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tracks per-companion daily OpenAI request counts for cost control (~$0.30/day/companion)
export const dailyUsageTable = pgTable("daily_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  companionId: uuid("companion_id").notNull().references(() => companionsTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD UTC
  requests: integer("requests").notNull().default(0),
}, (t) => [unique().on(t.userId, t.companionId, t.date)]);

export const insertCompanionSchema = createInsertSchema(companionsTable).omit({
  id: true,
  createdAt: true,
});
export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});
export const insertMemoryNoteSchema = createInsertSchema(memoryNotesTable).omit({
  id: true,
  createdAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type Companion = typeof companionsTable.$inferSelect;
export type InsertCompanion = z.infer<typeof insertCompanionSchema>;
export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MemoryNote = typeof memoryNotesTable.$inferSelect;
export type InsertMemoryNote = z.infer<typeof insertMemoryNoteSchema>;
