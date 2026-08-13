import { apiRequest } from './api';
import { BracketMatch } from '@shared/schema';

// ============================================================
// Draw preview service — read-only bracket previews for PDF
// draw sheets. NOTE: /api/draw/* endpoints reply with FLAT
// bodies (no { success, data } wrapper).
// ============================================================

export interface EligiblePlayer {
  id: string;
  fullName: string;
  clubId?: string | null;
  seed?: number | null;
}

/** Flat match item returned by POST /api/draw/generate (camelCase) */
export interface DrawPreviewMatch {
  matchNumber: number;
  roundNumber: number;
  player1Id: string | null;
  player1Name: string | null;
  player2Id: string | null;
  player2Name: string | null;
  isBye: boolean;
  nextMatchNumber: number | null;
  nextMatchSlot: 'player1' | 'player2' | null;
}

/** Response of POST /api/draw/generate (preview only — nothing is saved) */
export interface DrawPreviewResult {
  preview?: boolean;
  bracketSize: number;
  playerCount: number;
  byeCount: number;
  rounds: number;
  matches: DrawPreviewMatch[];
  seedData?: Array<{ playerId: string; seed: number }>;
}

/** Persisted tkd_matches row shape (subset used for draw sheets) */
export interface SavedMatchRow {
  id: string;
  match_number?: number | null;
  round_number?: number | null;
  round?: number | null;
  player1_name?: string | null;
  player2_name?: string | null;
  winner_name?: string | null;
  is_bye?: boolean | null;
  next_match_id?: string | null;
}

export const drawPreviewService = {
  /** GET /api/draw/eligible/:categoryId/:tournamentId → { players, count } (flat) */
  async getEligible(categoryId: string, tournamentId: string): Promise<{ players: EligiblePlayer[]; count: number }> {
    const res = await apiRequest<{ players: EligiblePlayer[]; count: number }>(
      `/api/draw/eligible/${categoryId}/${tournamentId}`
    );
    return { players: res.players ?? [], count: res.count ?? (res.players?.length ?? 0) };
  },

  /**
   * POST /api/draw/generate → DrawPreviewResult (flat). Generates a bracket
   * WITHOUT saving anything — a new random draw on every call.
   * Backend defaults thirdPlaceMatch to TRUE, so we pass explicit false
   * unless the caller overrides it.
   */
  async generatePreview(params: {
    categoryId: string;
    tournamentId: string;
    drawType?: 'random' | 'seeded' | 'manual';
    thirdPlaceMatch?: boolean;
  }): Promise<DrawPreviewResult> {
    return apiRequest<DrawPreviewResult>('/api/draw/generate', {
      method: 'POST',
      body: {
        drawType: 'random',
        thirdPlaceMatch: false,
        ...params,
      },
    });
  },
};

/**
 * Map a flat DrawResult (preview) to the legacy BracketMatch[][] shape used
 * by useBracketPDF / BracketDisplay: rounds → matches with
 * participants [name | '(bye)' | null, ...], ids 'match-r{round}-{index}'.
 */
export function drawResultToBracketData(result: DrawPreviewResult): BracketMatch[][] {
  const byRound = new Map<number, DrawPreviewMatch[]>();
  for (const m of result.matches ?? []) {
    const round = Number(m.roundNumber) || 1;
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(m);
  }

  const sortedRounds = Array.from(byRound.entries()).sort((a, b) => a[0] - b[0]);

  // First pass: assign a stable legacy id per match so nextMatchId can be linked
  const idByMatchNumber = new Map<number, string>();
  for (const [round, roundMatches] of sortedRounds) {
    roundMatches.sort((a, b) => a.matchNumber - b.matchNumber);
    roundMatches.forEach((m, index) => {
      idByMatchNumber.set(m.matchNumber, `match-r${round}-${index}`);
    });
  }

  return sortedRounds.map(([, roundMatches]) =>
    roundMatches.map((m, index) => {
      const p1 = m.player1Name ?? (m.isBye ? '(bye)' : null);
      const p2 = m.player2Name ?? (m.isBye ? '(bye)' : null);
      return {
        id: idByMatchNumber.get(m.matchNumber)!,
        participants: [p1, p2] as [string | null, string | null],
        // BYE matches auto-advance the present player — mark them winner
        winner: m.isBye ? (m.player1Name ?? m.player2Name ?? null) : null,
        nextMatchId: m.nextMatchNumber != null
          ? (idByMatchNumber.get(m.nextMatchNumber) ?? null)
          : null,
        position: index,
      };
    })
  );
}

/**
 * Map persisted category match rows (an already-executed official draw) into
 * the legacy BracketMatch[][] shape. DB rows already carry real ids and
 * next_match_id linkage, so those are used directly.
 */
export function matchRowsToBracketData(rows: SavedMatchRow[]): BracketMatch[][] {
  const byRound = new Map<number, SavedMatchRow[]>();
  for (const row of rows ?? []) {
    const round = Number(row.round_number ?? row.round ?? 1) || 1;
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(row);
  }

  return Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, roundMatches]) =>
      roundMatches
        .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0))
        .map((row) => {
          const isBye = Boolean(row.is_bye);
          const p1 = row.player1_name ?? (isBye ? '(bye)' : null);
          const p2 = row.player2_name ?? (isBye ? '(bye)' : null);
          return {
            id: row.id,
            participants: [p1, p2] as [string | null, string | null],
            winner: row.winner_name ?? null,
            nextMatchId: row.next_match_id ?? null,
            position: row.match_number ?? 0,
          };
        })
    );
}

/** Distinct player names appearing in the first round of saved match rows */
export function playersFromSavedRows(rows: SavedMatchRow[]): string[] {
  const firstRound = Math.min(
    ...rows.map((r) => Number(r.round_number ?? r.round ?? 1) || 1)
  );
  const names = new Set<string>();
  for (const row of rows) {
    const round = Number(row.round_number ?? row.round ?? 1) || 1;
    if (round !== firstRound) continue;
    if (row.player1_name) names.add(row.player1_name);
    if (row.player2_name) names.add(row.player2_name);
  }
  return Array.from(names);
}
