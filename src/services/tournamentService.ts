import { BracketMatch } from '@shared/schema';

interface SavedTournament {
  id: string;
  name: string;
  date: string;
  participantCount: number;
  bracketData: BracketMatch[][];
}

const STORAGE_KEY = 'tournament-history';

function getStoredTournaments(): SavedTournament[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setStoredTournaments(tournaments: SavedTournament[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
}

export const tournamentService = {
  async getAll(): Promise<SavedTournament[]> {
    return getStoredTournaments();
  },

  async getById(id: string): Promise<SavedTournament | null> {
    const tournaments = getStoredTournaments();
    return tournaments.find(t => t.id === id) || null;
  },

  async save(tournament: SavedTournament): Promise<SavedTournament> {
    const tournaments = getStoredTournaments();
    tournaments.push(tournament);
    setStoredTournaments(tournaments);
    return tournament;
  },

  async remove(id: string): Promise<boolean> {
    const tournaments = getStoredTournaments();
    const filtered = tournaments.filter(t => t.id !== id);
    if (filtered.length === tournaments.length) return false;
    setStoredTournaments(filtered);
    return true;
  },
};
