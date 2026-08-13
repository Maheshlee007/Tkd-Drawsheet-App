import { apiRequest } from './api';

export interface JuryMember {
  id: string;
  user_id: string;
  jury_code: string;
  tournament_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}

export interface JudgeAssignment {
  id: string;
  match_id: string;
  judge_id: string;
  role: string;
  judge_role?: string;
  tournament_id?: string;
  tournament_name?: string;
  category_id?: string;
  event_type?: string;
  age_category?: string;
  gender?: string;
  weight_class?: string;
  category_name?: string;
  round_number?: number;
  match_number?: number;
  player1_id?: string;
  player2_id?: string;
  player1_name?: string;
  player2_name?: string;
  player1_code?: string;
  player2_code?: string;
  player1_coach?: string;
  player2_coach?: string;
  player1_school?: string;
  player2_school?: string;
  match_status?: 'pending' | 'in_progress' | 'completed' | 'bye' | 'forfeit';
  mat_name?: string;
  scheduled_time?: string;
}

export interface JuryTournament {
  id: string;
  name: string;
  tournament_code?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  assigned_categories?: number;
  assigned_matches?: number;
  pending_matches?: number;
}

export interface JuryCategory {
  id: string;
  tournament_id: string;
  event_type: string;
  age_category: string;
  gender: string;
  weight_class: string;
  mat_number?: number | null;
  scheduled_date?: string | null;
  bracket_id?: string | null;
  bracket_status?: string | null;
  is_published?: boolean | null;
  player_count: number;
  match_count: number;
  completed_match_count: number;
}

export const judgeService = {
  /**
   * Backend responds with { accessToken, refreshToken, tournamentId, juryCode } —
   * it does NOT include a user object; callers should derive identity from the JWT claims.
   */
  async login(juryCode: string, password: string): Promise<{ accessToken: string; refreshToken: string; tournamentId?: string; juryCode?: string; user?: any }> {
    const res = await apiRequest<{ data: { accessToken: string; refreshToken: string; tournamentId?: string; juryCode?: string; user?: any } }>('/api/judges/login', {
      method: 'POST',
      body: { juryCode, password },
      skipAuth: true,
    });
    return res.data;
  },

  async createJury(data: { email: string; password: string; firstName: string; lastName: string; tournamentId: string }): Promise<JuryMember> {
    const res = await apiRequest<{ data: JuryMember }>('/api/judges/create', {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  async listByTournament(tournamentId: string): Promise<JuryMember[]> {
    const res = await apiRequest<{ data: JuryMember[] }>(`/api/judges/tournament/${tournamentId}`);
    return res.data;
  },

  async assignToMatch(data: { matchId: string; judgeId: string; role?: string }): Promise<any> {
    const res = await apiRequest<{ data: any }>('/api/judges/assign', {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  async revokeAssignment(assignmentId: string): Promise<void> {
    await apiRequest(`/api/judges/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  },

  async getMyMatches(tournamentId?: string): Promise<JudgeAssignment[]> {
    const url = tournamentId
      ? `/api/matches/judge/me?tournamentId=${tournamentId}`
      : '/api/matches/judge/me';
    const res = await apiRequest<{ data: JudgeAssignment[] }>(url);
    return res.data;
  },

  /** Tournaments the logged-in jury member has active assignments in (jury portal dropdown) */
  async listMyTournaments(): Promise<JuryTournament[]> {
    const res = await apiRequest<{ data: JuryTournament[] }>('/api/judges/my-tournaments');
    return res.data ?? [];
  },

  async getMyCategories(tournamentId?: string): Promise<JuryCategory[]> {
    const url = tournamentId
      ? `/api/judges/my-categories?tournamentId=${tournamentId}`
      : '/api/judges/my-categories';
    const res = await apiRequest<{ data: JuryCategory[] }>(url);
    return res.data;
  },

  /** Category-level assignment: judge owns the whole category (pre-draw) */
  async assignToCategory(data: { judgeId: string; categoryId: string; tournamentId: string; role?: string }): Promise<any> {
    const res = await apiRequest<{ data: any }>('/api/judges/assign', {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  /** Active assignment rows (with ids) for one jury user — admin assignment UI */
  async listAssignments(judgeUserId: string, tournamentId?: string): Promise<Array<{
    id: string; judge_id: string; tournament_id: string;
    category_id: string | null; match_id: string | null; role: string; status: string;
    event_type?: string; age_category?: string; gender?: string; weight_class?: string;
  }>> {
    const url = tournamentId
      ? `/api/judges/${judgeUserId}/assignments?tournamentId=${tournamentId}`
      : `/api/judges/${judgeUserId}/assignments`;
    const res = await apiRequest<{ data: any[] }>(url);
    return res.data ?? [];
  },
};
