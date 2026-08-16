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
  registration_open_at?: string | null;
  registration_close_at?: string | null;
  late_registration_close_at?: string | null;
  late_fee_amount?: number;
  late_fee_mode?: 'flat' | 'per_event';
  require_email_verification?: boolean;
  currency?: string;
  created_by: string | null;
  created_at: string;
  stats?: Record<string, number>;
  player_count?: number;
  staff_count?: number;
}

export interface TournamentEventFee {
  id?: string;
  event_type: string;
  event_name?: string;
  fee_amount: number | string;
  is_enabled: boolean;
  max_entries?: number | null;
  sort_order?: number;
}

export interface RegistrationConfigEvent {
  eventType: string;
  name: string;
  fee: number;
  isGroupEvent: boolean;
  maxEntries: number | null;
  sortOrder: number;
}

export interface RegistrationConfig {
  tournament: Pick<Tournament,
    'id' | 'tournament_code' | 'name' | 'description' | 'venue' | 'city' | 'state' |
    'start_date' | 'end_date' | 'association_type' | 'registration_instructions' |
    'player_form_links' | 'coach_form_links' | 'currency'>;
  registration: {
    isOpen: boolean;
    status: string;
    reason?: string;
    opensAt: string | null;
    closesAt: string | null;
    lateClosesAt: string | null;
    isLateWindow: boolean;
    isPastRegularClose: boolean;
    requireEmailVerification: boolean;
    serverTime: string;
  };
  events: RegistrationConfigEvent[];
  fees: {
    mode: 'per_event' | 'legacy';
    currency: string;
    firstEventFee: number;
    additionalEventFee: number;
    lateFeeAmount: number;
    lateFeeMode: 'flat' | 'per_event';
  };
}

export interface RegistrationQuote {
  currency: string;
  lines: Array<{ eventType: string; label: string; amount: number }>;
  subtotal: number;
  lateFee: { applied: boolean; amount: number; mode: 'flat' | 'per_event' };
  total: number;
  mode: 'per_event' | 'legacy';
  registration?: { isOpen: boolean; isLateWindow: boolean; closesAt: string | null; lateClosesAt: string | null };
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

  /** Public registration config (window + enabled events + fees). Accepts code or id. */
  async getRegistrationConfig(codeOrId: string): Promise<RegistrationConfig> {
    const res = await apiRequest<{ data: RegistrationConfig }>(
      `/api/tournaments/${encodeURIComponent(codeOrId)}/registration-config`,
      { skipAuth: true }
    );
    return res.data;
  },

  /** Public server-authoritative fee quote for selected events */
  async getQuote(tournamentCode: string, events: string[]): Promise<RegistrationQuote> {
    const res = await apiRequest<{ data: RegistrationQuote }>('/api/tournaments/quote', {
      method: 'POST',
      body: { tournamentCode, events },
      skipAuth: true,
    });
    return res.data;
  },

  /** Admin: all configured event-fee rows (incl. disabled) */
  async getEventFees(tournamentId: string): Promise<TournamentEventFee[]> {
    const res = await apiRequest<{ data: TournamentEventFee[] }>(`/api/tournaments/${tournamentId}/event-fees`);
    return res.data ?? [];
  },

  /** Admin: full-replace event fees (omitted events are disabled) */
  async putEventFees(
    tournamentId: string,
    eventFees: Array<{ eventType: string; fee: number; isEnabled?: boolean; maxEntries?: number; sortOrder?: number }>
  ): Promise<TournamentEventFee[]> {
    const res = await apiRequest<{ data: TournamentEventFee[] }>(`/api/tournaments/${tournamentId}/event-fees`, {
      method: 'PUT',
      body: { eventFees },
    });
    return res.data ?? [];
  },

  /** Attach an existing organizer ({userId}) or create + attach a new one ({email, fullName, password, phone?}) */
  async createOrganizer(
    tournamentId: string,
    data: { userId?: string; email?: string; fullName?: string; password?: string; phone?: string }
  ): Promise<{ user: any; staff: any; created: boolean }> {
    const res = await apiRequest<{ data: { user: any; staff: any; created: boolean } }>(
      `/api/tournaments/${tournamentId}/organizer`,
      { method: 'POST', body: data }
    );
    return res.data;
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
