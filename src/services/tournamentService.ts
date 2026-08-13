import { BracketMatch } from '@shared/schema';
import { apiRequest, isApiConfigured } from './api';

interface SavedTournament {
  id: string;
  name: string;
  date: string;
  participantCount: number;
  bracketData: BracketMatch[][];
}

export interface Tournament {
  id: string;
  tournament_code: string;
  name: string;
  description: string | null;
  registration_instructions?: string | null;
  player_form_links?: string[];
  coach_form_links?: string[];
  venue: string | null;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  organizer_name: string | null;
  organizer_email: string | null;
  organizer_phone: string | null;
  status: string;
  is_public: boolean;
  max_participants: number | null;
  entry_fee: number;
  first_event_fee: number;
  additional_event_fee: number;
  association_type: string | null;
  created_by: string | null;
  created_at: string;
  stats?: Record<string, number>;
  player_count?: number;
  staff_count?: number;
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

  /** Get all tournaments with full API details */
  async listTournaments(opts?: { status?: string; limit?: number }): Promise<Tournament[]> {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    const res = await apiRequest<{ data: Tournament[] }>(`/api/tournaments${qs ? '?' + qs : ''}`);
    return res.data ?? [];
  },

  async getTournament(id: string): Promise<Tournament> {
    const res = await apiRequest<{ data: Tournament }>(`/api/tournaments/${id}`);
    return res.data;
  },

  async getByCode(code: string): Promise<Tournament> {
    const res = await apiRequest<{ data: Tournament }>(`/api/tournaments/code/${encodeURIComponent(code)}`);
    return res.data;
  },

  async createTournament(data: Record<string, unknown>): Promise<Tournament> {
    const res = await apiRequest<{ data: Tournament }>('/api/tournaments', {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  async updateTournament(id: string, data: Record<string, unknown>): Promise<Tournament> {
    const res = await apiRequest<{ data: Tournament }>(`/api/tournaments/${id}`, {
      method: 'PATCH',
      body: data,
    });
    return res.data;
  },

  async updateStatus(id: string, status: string): Promise<Tournament> {
    const res = await apiRequest<{ data: Tournament }>(`/api/tournaments/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
    return res.data;
  },

  async getCategories(tournamentId: string): Promise<any[]> {
    const res = await apiRequest<{ data: any[] }>(`/api/tournaments/${tournamentId}/categories`);
    return res.data ?? [];
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
