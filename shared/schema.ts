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

// Extended Participant Management (for future features)
export interface ParticipantDetails {
  id: string; // Unique identifier
  name: string; // Display name
  number?: string; // Participant number/bib
  education?: string; // Educational background
  currentBelt?: string; // Current belt level (e.g., "Black Belt 1st Dan")
  category?: string; // Competition category (e.g., "Adult Male", "Junior Female")
  age?: number; // Age
  dateOfBirth?: string; // Date of birth
  coach?: string; // Coach name
  club?: string; // Club/School affiliation
  weight?: number; // Weight in kg
  height?: number; // Height in cm
  experience?: string; // Years of experience
  medicalNotes?: string; // Any medical considerations
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string; // When participant was added
  updatedAt: string; // Last updated
}

// For backwards compatibility, we'll keep using string arrays for now
// but plan to migrate to ParticipantDetails[] in the future
export type ParticipantIdentifier = string; // For now, just the name
