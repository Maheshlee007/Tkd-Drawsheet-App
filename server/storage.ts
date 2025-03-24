import { users, type User, type InsertUser, type Tournament, type InsertTournament } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Tournament related methods
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: number): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tournaments: Map<number, Tournament>;
  private userCurrentId: number;
  private tournamentCurrentId: number;

  constructor() {
    this.users = new Map();
    this.tournaments = new Map();
    this.userCurrentId = 1;
    this.tournamentCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const id = this.tournamentCurrentId++;
    const tournament: Tournament = { ...insertTournament, id };
    this.tournaments.set(id, tournament);
    return tournament;
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    return this.tournaments.get(id);
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return Array.from(this.tournaments.values());
  }
}

export const storage = new MemStorage();
