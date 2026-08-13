import { apiRequest } from './api';

/** Backend draw types: 'manual' = players in as-entered (registration) order */
export type DrawType = 'random' | 'seeded' | 'manual';

export interface DrawEligiblePlayer {
  id: string;
  fullName: string;
  clubId?: string | null;
  seed?: number | null;
}

export interface DrawExecuteResult {
  bracketId: string;
  bracketSize: number;
  playerCount: number;
  byeCount: number;
  rounds: number;
  matchCount: number;
}

export const drawService = {
  /** Players eligible for a category draw, in seed/registration order */
  async getEligible(categoryId: string, tournamentId: string): Promise<DrawEligiblePlayer[]> {
    const res = await apiRequest<{ players: DrawEligiblePlayer[]; count: number }>(
      `/api/draw/eligible/${categoryId}/${tournamentId}`
    );
    return res.players ?? [];
  },

  /**
   * Generate the bracket AND persist it (creates matches).
   * Body fields accepted by POST /api/draw/execute:
   * categoryId, tournamentId, drawType ('random'|'seeded'|'manual'),
   * thirdPlaceMatch (boolean), roundsPerMatch (int 1–5).
   */
  async execute(
    categoryId: string,
    tournamentId: string,
    options: { drawType?: DrawType; thirdPlaceMatch?: boolean; roundsPerMatch?: number } = {}
  ): Promise<DrawExecuteResult> {
    return apiRequest<DrawExecuteResult>('/api/draw/execute', {
      method: 'POST',
      body: {
        categoryId,
        tournamentId,
        drawType: options.drawType ?? 'random',
        thirdPlaceMatch: options.thirdPlaceMatch ?? false,
        roundsPerMatch: options.roundsPerMatch ?? 3,
      },
    });
  },
};
