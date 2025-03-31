import { pgTable, text, serial, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  upiId: text("upi_id"),
  hasSubscription: boolean("has_subscription").default(false).notNull(),
  subscriptionExpiryDate: timestamp("subscription_expiry_date"),
  referralCode: text("referral_code"),
  referredBy: integer("referred_by"),
  rewardPoints: integer("reward_points").default(0),
  lastLoginDate: timestamp("last_login_date"),
  dailyStreak: integer("daily_streak").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Profile customization fields
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: text("location"),
  dateOfBirth: timestamp("date_of_birth"),
  socialLinks: text("social_links").array(),
  
  // Preferences and settings
  theme: text("theme").default("system"),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  privacySettings: text("privacy_settings").default("public"),
  
  // Gaming preferences and statistics
  preferredGames: text("preferred_games").array(),
  totalGamesPlayed: integer("total_games_played").default(0),
  totalWins: integer("total_wins").default(0),
  totalLosses: integer("total_losses").default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default("0"),
  rank: text("rank").default("Beginner"),
  rankPoints: integer("rank_points").default(0)
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  phone: true,
  upiId: true,
  hasSubscription: true,
  subscriptionExpiryDate: true,
  referralCode: true,
  referredBy: true,
  rewardPoints: true,
  lastLoginDate: true,
  dailyStreak: true,
  avatarUrl: true,
  bio: true,
  location: true,
  dateOfBirth: true,
  socialLinks: true,
  theme: true,
  notificationsEnabled: true,
  privacySettings: true,
  preferredGames: true,
  totalGamesPlayed: true,
  totalWins: true,
  totalLosses: true,
  winRate: true,
  rank: true,
  rankPoints: true
});

// Wallet Schema
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertWalletSchema = createInsertSchema(wallets).pick({
  userId: true,
  balance: true
});

// Transaction Schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // deposit, withdrawal, game_win, game_lose
  status: text("status").notNull(), // pending, completed, failed
  description: text("description"),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  metadata: text("metadata"), // Store JSON string for payment screenshot URL, UPI ID, etc.
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  amount: true,
  type: true,
  status: true,
  description: true,
  commissionAmount: true,
  metadata: true
});

// Game Schema
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  minEntry: decimal("min_entry", { precision: 10, scale: 2 }).notNull(),
  maxEntry: decimal("max_entry", { precision: 10, scale: 2 }).notNull(),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).notNull(),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertGameSchema = createInsertSchema(games).pick({
  name: true,
  description: true,
  minEntry: true,
  maxEntry: true,
  commissionPercentage: true,
  image: true,
  isActive: true
});

// Game Match Schema
export const gameMatches = pgTable("game_matches", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  entryAmount: decimal("entry_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // waiting, in_progress, completed, cancelled
  winnerId: integer("winner_id").references(() => users.id),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertGameMatchSchema = createInsertSchema(gameMatches).pick({
  gameId: true,
  entryAmount: true,
  status: true,
  winnerId: true,
  startTime: true,
  endTime: true
});

// Player Match Schema
export const playerMatches = pgTable("player_matches", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => gameMatches.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull(), // joined, playing, left, won, lost
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertPlayerMatchSchema = createInsertSchema(playerMatches).pick({
  matchId: true,
  userId: true,
  status: true
});

// Waitlist Schema
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertWaitlistSchema = createInsertSchema(waitlist).pick({
  email: true
});

// Type Exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type GameMatch = typeof gameMatches.$inferSelect;
export type InsertGameMatch = z.infer<typeof insertGameMatchSchema>;

export type PlayerMatch = typeof playerMatches.$inferSelect;
export type InsertPlayerMatch = z.infer<typeof insertPlayerMatchSchema>;

export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;

// Subscriptions schema
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  amount: text("amount").notNull(),
  rewardAmount: text("reward_amount").notNull(),
  duration: integer("duration").notNull(), // in days
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // active, completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  name: true,
  amount: true,
  rewardAmount: true,
  duration: true,
  startDate: true,
  endDate: true,
  status: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Subscription rewards schema (daily payouts)
export const subscriptionRewards = pgTable("subscription_rewards", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: text("amount").notNull(),
  day: integer("day").notNull(), // which day of subscription
  status: text("status").notNull().default("pending"), // pending, paid
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubscriptionRewardSchema = createInsertSchema(subscriptionRewards).pick({
  subscriptionId: true,
  userId: true,
  amount: true,
  day: true,
  status: true,
  paidAt: true,
});

export type SubscriptionReward = typeof subscriptionRewards.$inferSelect;
export type InsertSubscriptionReward = z.infer<typeof insertSubscriptionRewardSchema>;
