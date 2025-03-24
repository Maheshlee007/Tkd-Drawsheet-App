import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tournament related schemas
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  participants: jsonb("participants").notNull().$type<string[]>(),
  bracketData: jsonb("bracket_data").notNull().$type<BracketMatch[][]>(),
  createdAt: text("created_at").notNull(),
});

export const tournamentInsertSchema = createInsertSchema(tournaments).pick({
  name: true,
  participants: true,
  bracketData: true,
  createdAt: true,
});

export type InsertTournament = z.infer<typeof tournamentInsertSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// Custom types for bracket management
export interface BracketMatch {
  id: string;
  participants: [string | null, string | null];
  winner: string | null;
  nextMatchId: string | null;
  position: number;
}

// Schema for validating tournament creation request
export const createTournamentSchema = z.object({
  participants: z.array(z.string()).min(2),
  seedType: z.enum(["random", "ordered", "as-entered"]),
});

export type CreateTournamentRequest = z.infer<typeof createTournamentSchema>;
