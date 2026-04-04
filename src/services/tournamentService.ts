import { BracketMatch } from '@shared/schema';
import { apiRequest, isApiConfigured } from './api';

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
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: SavedTournament[] }>('/api/tournaments');
        return res.data;
      } catch { /* fallback */ }
    }
    return getStoredTournaments();
  },

  async getById(id: string): Promise<SavedTournament | null> {
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: SavedTournament }>(`/api/tournaments/${id}`);
        return res.data;
      } catch { /* fallback */ }
    }
    const tournaments = getStoredTournaments();
    return tournaments.find(t => t.id === id) || null;
  },

  async save(tournament: SavedTournament): Promise<SavedTournament> {
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: SavedTournament }>('/api/tournaments', {
          method: 'POST', body: tournament,
        });
        return res.data;
      } catch { /* fallback */ }
    }
    const tournaments = getStoredTournaments();
    tournaments.push(tournament);
    setStoredTournaments(tournaments);
    return tournament;
  },

  async remove(id: string): Promise<boolean> {
    if (isApiConfigured()) {
      try {
        await apiRequest(`/api/tournaments/${id}`, { method: 'DELETE' });
        return true;
      } catch { /* fallback */ }
    }
    const tournaments = getStoredTournaments();
    const filtered = tournaments.filter(t => t.id !== id);
    if (filtered.length === tournaments.length) return false;
    setStoredTournaments(filtered);
    return true;
  },
};
