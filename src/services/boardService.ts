import { apiRequest } from './api';

export interface BoardMatch {
  id: string;
  match_number: number;
  round: number;
  category_name: string;
  player1_name: string;
  player2_name: string;
  player1_club?: string;
  player2_club?: string;
  status: string;
  mat_name?: string;
  scheduled_time?: string;
  winner_name?: string;
  score_summary?: string;
}

export interface BoardResult {
  category_name: string;
  gold?: string;
  silver?: string;
  bronze1?: string;
  bronze2?: string;
}

export const boardService = {
  async getMatches(tournamentId: string): Promise<BoardMatch[]> {
    const res = await apiRequest<{ data: BoardMatch[] }>(`/api/board/${tournamentId}/matches`, { skipAuth: true });
    return res.data;
  },

  async getResults(tournamentId: string): Promise<BoardResult[]> {
    const res = await apiRequest<{ data: BoardResult[] }>(`/api/board/${tournamentId}/results`, { skipAuth: true });
    return res.data;
  },

  async getCategoryDetail(tournamentId: string, categoryId: string): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/board/${tournamentId}/category/${categoryId}`, { skipAuth: true });
    return res.data;
  },
};
