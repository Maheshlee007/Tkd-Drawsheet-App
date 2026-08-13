import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, ArrowLeft, Printer, RefreshCw, Swords, Users } from 'lucide-react';
import CanvasBracket from '@/components/CanvasBracket';
import { matchService, type Match as ApiMatch } from '@/services/matchService';
import { drawService, type DrawEligiblePlayer, type DrawType } from '@/services/drawService';
import { useBracketPDF } from '@/hooks/useBracketPDF';
import type { BracketMatch } from '@shared/schema';
import type { JuryCategory } from '@/services/judgeService';
import { useToast } from '@/hooks/use-toast';

export function categoryLabel(cat: JuryCategory) {
  return `${cat.event_type} • ${cat.age_category} • ${cat.gender} • ${cat.weight_class}`;
}

export interface BracketDataResult {
  /** Legacy rounds shape consumed by CanvasBracket and the PDF renderer */
  rounds: BracketMatch[][];
  /** Lookup: legacy canvas match id ("match-r{round}-{index}") → original DB match row */
  matchLookup: Record<string, ApiMatch>;
}

/**
 * Map persisted category matches (DB rows) into the legacy bracket shape used by
 * CanvasBracket / the PDF renderer, plus a reverse lookup so a click on the canvas
 * can be resolved back to the underlying DB match row.
 */
export function matchesToBracketData(matches: ApiMatch[]): BracketDataResult {
  const byRound = new Map<number, ApiMatch[]>();
  matches.forEach((m) => {
    const raw = m as unknown as Record<string, unknown>;
    const round = Number(raw.round_number ?? m.round ?? 1);
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(m);
  });

  const sortedRounds = Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([roundNumber, roundMatches]) => ({
      roundNumber,
      roundMatches: [...roundMatches].sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0)),
    }));

  // First pass: assign stable legacy ids and build DB-id → legacy-id map
  // (needed to rewire next_match_id references onto the legacy ids).
  const dbIdToLegacyId = new Map<string, string>();
  const matchLookup: Record<string, ApiMatch> = {};
  sortedRounds.forEach(({ roundNumber, roundMatches }) => {
    roundMatches.forEach((m, index) => {
      const legacyId = `match-r${roundNumber}-${index}`;
      dbIdToLegacyId.set(m.id, legacyId);
      matchLookup[legacyId] = m;
    });
  });

  const rounds = sortedRounds.map(({ roundNumber, roundMatches }) =>
    roundMatches.map((m, index) => {
      const raw = m as unknown as Record<string, unknown>;
      const isBye = Boolean(raw.is_bye);
      const p1 = m.player1_name ?? (isBye ? '(bye)' : null);
      const p2 = m.player2_name ?? (isBye ? '(bye)' : null);
      const nextDbId = raw.next_match_id as string | null | undefined;
      return {
        id: `match-r${roundNumber}-${index}`,
        participants: [p1, p2] as [string | null, string | null],
        winner: (raw.winner_name as string | undefined) ?? null,
        nextMatchId: (nextDbId && dbIdToLegacyId.get(nextDbId)) || null,
        position: m.match_number ?? 0,
      };
    })
  );

  return { rounds, matchLookup };
}

/** A match the jury can act on: real (non-bye) match, both players decided, not finished */
export function isScorableMatch(m: ApiMatch): boolean {
  const raw = m as unknown as Record<string, unknown>;
  if (raw.is_bye) return false;
  if (!m.player1_id || !m.player2_id) return false;
  return ['pending', 'scheduled', 'in_progress'].includes(String(m.status));
}

interface JuryCategoryBoardProps {
  category: JuryCategory;
  onBack: () => void;
  /** Called with the DB match row when the jury clicks a scorable match on the canvas */
  onOpenScoring: (match: ApiMatch) => void;
  /** Lets the parent refresh its category cards / match lists after a draw */
  onBracketCreated?: () => void;
  /** Bump to force a refetch of the category matches (e.g. after a score is submitted) */
  refreshKey?: number;
}

export default function JuryCategoryBoard({
  category,
  onBack,
  onOpenScoring,
  onBracketCreated,
  refreshKey = 0,
}: JuryCategoryBoardProps) {
  const { toast } = useToast();
  const { generateBracketPDF } = useBracketPDF();

  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardError, setBoardError] = useState('');
  const [eligiblePlayers, setEligiblePlayers] = useState<DrawEligiblePlayer[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [drawType, setDrawType] = useState<DrawType>('random');
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setBoardError('');
    try {
      const rows = await matchService.getByCategory(category.id);
      setMatches(rows);
      if (rows.length === 0) {
        setLoadingEligible(true);
        try {
          const players = await drawService.getEligible(category.id, category.tournament_id);
          setEligiblePlayers(players);
        } finally {
          setLoadingEligible(false);
        }
      }
    } catch (e: any) {
      setBoardError(e.message || 'Failed to load the category bracket');
    } finally {
      setLoading(false);
    }
  }, [category.id, category.tournament_id]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, refreshKey]);

  const { rounds, matchLookup } = useMemo(() => matchesToBracketData(matches), [matches]);
  const hasBracket = matches.length > 0;
  const totalMatches = useMemo(
    () => matches.filter((m) => !(m as unknown as Record<string, unknown>).is_bye).length,
    [matches]
  );
  const completedMatches = useMemo(
    () => matches.filter((m) =>
      !(m as unknown as Record<string, unknown>).is_bye && String(m.status) === 'completed'
    ).length,
    [matches]
  );

  async function handleCreateBracket() {
    setDrawing(true);
    setBoardError('');
    try {
      const result = await drawService.execute(category.id, category.tournament_id, {
        drawType,
        thirdPlaceMatch,
      });
      toast({
        title: 'Bracket created',
        description: `${result.matchCount} matches (${result.byeCount} byes). Click a match on the board to start scoring.`,
      });
      await loadBoard();
      onBracketCreated?.();
    } catch (e: any) {
      setBoardError(e.message || 'Failed to generate bracket');
    } finally {
      setDrawing(false);
    }
  }

  async function handlePrintChart() {
    if (!matches.length) {
      setBoardError('No bracket exists for this category yet — create it first.');
      return;
    }
    setPrinting(true);
    setBoardError('');
    try {
      await generateBracketPDF(
        rounds,
        categoryLabel(category),
        category.player_count,
        { tournamentHeader: categoryLabel(category).toUpperCase() }
      );
    } catch (e: any) {
      setBoardError(e.message || 'Failed to generate chart PDF');
    } finally {
      setPrinting(false);
    }
  }

  function handleCanvasMatchClick(legacyMatchId: string) {
    const dbMatch = matchLookup[legacyMatchId];
    if (!dbMatch) return;
    if (String(dbMatch.status) === 'completed') {
      toast({ title: 'Match completed', description: 'This match already has a recorded result.' });
      return;
    }
    if (!isScorableMatch(dbMatch)) {
      toast({
        title: 'Match not ready',
        description: 'Both players must be decided before this match can be scored.',
      });
      return;
    }
    onOpenScoring(dbMatch);
  }

  return (
    <div className="space-y-4">
      {/* Board header: back, category label, quick stats, actions */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold capitalize truncate">{categoryLabel(category)}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {category.player_count} players</span>
              {hasBracket && <span>{completedMatches}/{totalMatches} matches completed</span>}
              {category.mat_number != null && <span>Mat {category.mat_number}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadBoard()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {hasBracket && (
            <Button variant="secondary" size="sm" onClick={() => void handlePrintChart()} disabled={printing}>
              <Printer className="h-4 w-4 mr-1" />
              {printing ? 'Preparing…' : 'Print Chart'}
            </Button>
          )}
        </div>
      </div>

      {boardError && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {boardError}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading bracket…</CardContent>
        </Card>
      ) : hasBracket ? (
        /* Bracket exists — render the interactive board */
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-2">
              Click a match with both players assigned to start it and record the result.
            </p>
            <CanvasBracket
              bracketData={rounds}
              onMatchClick={handleCanvasMatchClick}
              width={900}
              height={520}
            />
          </CardContent>
        </Card>
      ) : (
        /* No bracket yet — eligible players + draw options */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Eligible Players
              </CardTitle>
              <CardDescription>Players checked in and eligible for this category's draw</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto rounded-md border">
                {loadingEligible ? (
                  <p className="p-4 text-sm text-muted-foreground">Loading players…</p>
                ) : eligiblePlayers.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No eligible players in this category yet.</p>
                ) : (
                  <ol className="divide-y">
                    {eligiblePlayers.map((p, i) => (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <span className="w-6 text-right font-mono text-xs text-muted-foreground">{i + 1}.</span>
                        <span className="font-medium">{p.fullName}</span>
                        {p.seed != null && <Badge variant="outline" className="ml-auto">Seed {p.seed}</Badge>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Swords className="h-4 w-4" /> Draw Options
              </CardTitle>
              <CardDescription>Choose how the bracket is drawn, then create it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Draw Type</Label>
                <Select value={drawType} onValueChange={(v) => setDrawType(v as DrawType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random</SelectItem>
                    <SelectItem value="seeded">Seeded</SelectItem>
                    <SelectItem value="manual">As Entered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="third-place-toggle">Third-place match</Label>
                  <p className="text-xs text-muted-foreground">Semifinal losers play for bronze</p>
                </div>
                <Switch
                  id="third-place-toggle"
                  checked={thirdPlaceMatch}
                  onCheckedChange={setThirdPlaceMatch}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => void handleCreateBracket()}
                disabled={drawing || loadingEligible || eligiblePlayers.length < 2}
              >
                <Swords className="h-4 w-4 mr-1" />
                {drawing ? 'Creating…' : 'Create Bracket & Start'}
              </Button>
              {!loadingEligible && eligiblePlayers.length < 2 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  At least 2 eligible players are required to create a bracket.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
