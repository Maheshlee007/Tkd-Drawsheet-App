import { apiRequest } from './api';

export interface Match {
  id: string;
  bracket_id: string;
  match_number: number;
  round: number;
  position: number;
  player1_id?: string;
  player2_id?: string;
  player1_name?: string;
  player2_name?: string;
  winner_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'bye' | 'forfeit';
  mat_id?: string;
  mat_name?: string;
  scheduled_time?: string;
  category_name?: string;
}

export interface MatchResult {
  winnerId: string;
  winnerName: string;
  winMethod: string;
  finalScore?: {
    player1: number;
    player2: number;
  };
  rounds?: Array<{
    roundNumber: number;
    player1Score: number;
    player2Score: number;
    player1Gamjeom?: number;
    player2Gamjeom?: number;
  }>;
}

export const matchService = {
  async getByCategory(categoryId: string): Promise<Match[]> {
    const res = await apiRequest<{ data: Match[] }>(`/api/matches/category/${categoryId}`);
    return res.data;
  },

  async getById(matchId: string): Promise<Match> {
    const res = await apiRequest<{ data: Match }>(`/api/matches/${matchId}`);
    return res.data;
  },

  async submitResult(matchId: string, result: MatchResult): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/matches/${matchId}/result`, {
      method: 'POST',
      body: result,
    });
    return res.data;
  },

  async startMatch(matchId: string): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/matches/${matchId}/start`, {
      method: 'POST',
    });
    return res.data;
  },

  async completeMatch(matchId: string, data: MatchResult): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/matches/${matchId}/complete`, {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  async forfeitMatch(matchId: string, data: { forfeit_player_id: string; reason?: string }): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/matches/${matchId}/forfeit`, {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  async scheduleMatch(matchId: string, data: { mat_id: string; scheduled_time?: string }): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/matches/${matchId}/schedule`, {
      method: 'PATCH',
      body: data,
    });
    return res.data;
  },
};
