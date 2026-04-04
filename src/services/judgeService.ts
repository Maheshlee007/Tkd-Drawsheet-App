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
  category_name?: string;
  player1_name?: string;
  player2_name?: string;
  match_status?: string;
  mat_name?: string;
  scheduled_time?: string;
}

export const judgeService = {
  async login(juryCode: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const res = await apiRequest<{ data: { accessToken: string; refreshToken: string; user: any } }>('/api/judges/login', {
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

  async getMyMatches(): Promise<JudgeAssignment[]> {
    const res = await apiRequest<{ data: JudgeAssignment[] }>('/api/matches/judge/me');
    return res.data;
  },
};
