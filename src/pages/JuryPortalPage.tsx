import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gavel, LogIn, AlertCircle, Clock, CheckCircle, Play, RefreshCw, Trophy, UserRound, School, Shield, ClipboardList } from 'lucide-react';
import { judgeService, type JudgeAssignment } from '@/services/judgeService';
import { matchService as matchApiService } from '@/services/matchService';
import { tournamentService } from '@/services/tournamentService';
import { setStoredTokens } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useTournamentStore } from '@/store/useTournamentStore';
import { useToast } from '@/hooks/use-toast';

type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'bye' | 'forfeit';

const WIN_METHOD_OPTIONS = [
  { value: 'PTF', label: 'PTF - Points Final' },
  { value: 'PTG', label: 'PTG - Point Gap' },
  { value: 'SUP', label: 'SUP - Superiority' },
  { value: 'RSC', label: 'RSC - Referee Stoppage' },
  { value: 'DSQ', label: 'DSQ - Disqualification' },
  { value: 'WDR', label: 'WDR - Withdrawal' },
  { value: 'FFF', label: 'FFF - Forfeit' },
  { value: 'WLK', label: 'WLK - Walkover' },
];

const STATUS_STYLE: Record<MatchStatus, { label: string; className: string }> = {
  pending: { label: 'Upcoming', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  bye: { label: 'Bye', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  forfeit: { label: 'Forfeit', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

function formatScheduledTime(value?: string) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function playerLabel(name?: string) {
  return name?.trim() || 'TBD';
}

export default function JuryPortalPage() {
  const { toast } = useToast();
  const { user, login } = useAuthStore();
  const setActiveTournamentContext = useTournamentStore((state) => state.setActiveTournamentContext);
  const clearActiveTournamentContext = useTournamentStore((state) => state.clearActiveTournamentContext);

  // User is jury-authenticated if already logged in with jury/admin/organizer role
  const isJuryAuthenticated = !!(user && (
    user.roles?.includes('jury') ||
    user.roles?.includes('admin') ||
    user.roles?.includes('organizer')
  ));

  // Login state
  const [juryCode, setJuryCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Matches state
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string; tournament_code?: string }>>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<JudgeAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [startingMatchId, setStartingMatchId] = useState('');

  // Details and play dialogs
  const [detailMatch, setDetailMatch] = useState<JudgeAssignment | null>(null);
  const [scoreMatch, setScoreMatch] = useState<JudgeAssignment | null>(null);
  const [scorePlayer1, setScorePlayer1] = useState<number>(0);
  const [scorePlayer2, setScorePlayer2] = useState<number>(0);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');
  const [selectedWinMethod, setSelectedWinMethod] = useState('PTF');
  const [submittingScore, setSubmittingScore] = useState(false);

  useEffect(() => {
    if (isJuryAuthenticated) {
      tournamentService.getAll().then((data: any[]) => {
        const list = data.map((t: any) => ({
          id: t.id,
          name: t.name || t.tournament_name,
          tournament_code: t.tournament_code,
        }));
        setTournaments(list);
      }).catch(() => {});
    }
  }, [isJuryAuthenticated]);

  useEffect(() => {
    if (!selectedTournament) {
      clearActiveTournamentContext();
      return;
    }
    const selected = tournaments.find((item) => item.id === selectedTournament);
    if (selected?.tournament_code) {
      setActiveTournamentContext(selected.tournament_code, selected.name);
    }
  }, [selectedTournament, tournaments, setActiveTournamentContext, clearActiveTournamentContext]);

  useEffect(() => {
    if (isJuryAuthenticated) loadMatches();
  }, [isJuryAuthenticated, selectedTournament]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!juryCode) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const result = await judgeService.login(juryCode.trim(), '');
      setStoredTokens(result.accessToken, result.refreshToken);
      await login({
        name: `${result.user.firstName} ${result.user.lastName}`,
        email: result.user.email,
        roles: result.user.roles || ['jury'],
        permissions: result.user.permissions || [],
      });
    } catch (e: any) {
      setLoginError(e.message || 'Invalid jury code');
    } finally {
      setLoggingIn(false);
    }
  }

  async function loadMatches() {
    setLoading(true);
    setError('');
    try {
      const data = await judgeService.getMyMatches(selectedTournament || undefined);
      setMatches(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function pushActionMessage(message: string) {
    setActionMsg(message);
    window.setTimeout(() => {
      setActionMsg(current => (current === message ? '' : current));
    }, 3500);
  }

  async function handleStartMatch(matchId: string): Promise<boolean> {
    setStartingMatchId(matchId);
    try {
      await matchApiService.startMatch(matchId);
      pushActionMessage('Match started. You can now record the result.');
      await loadMatches();
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to start match');
      return false;
    } finally {
      setStartingMatchId('');
    }
  }

  async function handleStartAndPlay(match: JudgeAssignment) {
    if (match.match_status === 'pending') {
      const startedOk = await handleStartMatch(match.match_id);
      if (!startedOk) return;
      const startedMatch = { ...match, match_status: 'in_progress' as const };
      openScoringDialog(startedMatch);
      return;
    }
    openScoringDialog(match);
  }

  function openScoringDialog(match: JudgeAssignment) {
    const p1Score = 0;
    const p2Score = 0;
    setScoreMatch(match);
    setScorePlayer1(p1Score);
    setScorePlayer2(p2Score);
    setSelectedWinMethod('PTF');

    if (match.player1_id && match.player2_id) {
      setSelectedWinnerId(match.player1_id);
    } else {
      setSelectedWinnerId('');
    }
  }

  useEffect(() => {
    if (!scoreMatch?.player1_id || !scoreMatch?.player2_id) return;
    if (scorePlayer1 > scorePlayer2) {
      setSelectedWinnerId(scoreMatch.player1_id);
      return;
    }
    if (scorePlayer2 > scorePlayer1) {
      setSelectedWinnerId(scoreMatch.player2_id);
    }
  }, [scorePlayer1, scorePlayer2, scoreMatch]);

  async function handleSubmitScore() {
    if (!scoreMatch) return;
    if (!scoreMatch.player1_id || !scoreMatch.player2_id) {
      setError('Cannot submit result. Player IDs are missing for this match.');
      return;
    }
    if (!selectedWinnerId) {
      toast({ title: 'Select winner', description: 'Please select the winner before submitting.', variant: 'destructive' });
      return;
    }

    const winnerName = selectedWinnerId === scoreMatch.player1_id
      ? playerLabel(scoreMatch.player1_name)
      : playerLabel(scoreMatch.player2_name);

    setSubmittingScore(true);
    setError('');
    try {
      await matchApiService.completeMatch(scoreMatch.match_id, {
        winnerId: selectedWinnerId,
        winnerName,
        winMethod: selectedWinMethod,
        finalScore: {
          player1: scorePlayer1,
          player2: scorePlayer2,
        },
        rounds: [{
          roundNumber: 1,
          player1Score: scorePlayer1,
          player2Score: scorePlayer2,
        }],
      });

      setScoreMatch(null);
      pushActionMessage(`Result submitted. Winner: ${winnerName}`);
      await loadMatches();
    } catch (e: any) {
      setError(e.message || 'Failed to submit match result');
    } finally {
      setSubmittingScore(false);
    }
  }

  const pendingMatches = useMemo(
    () => matches.filter(m => (m.match_status ?? 'pending') === 'pending'),
    [matches]
  );
  const inProgressMatches = useMemo(
    () => matches.filter(m => (m.match_status ?? 'pending') === 'in_progress'),
    [matches]
  );
  const completedMatches = useMemo(
    () => matches.filter(m => (m.match_status ?? 'pending') === 'completed'),
    [matches]
  );

  // Login screen — only shown if not authenticated
  if (!isJuryAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Jury Portal</CardTitle>
            <CardDescription>Enter your jury code to access assigned matches</CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label>Jury Code</Label>
                <Input
                  value={juryCode}
                  onChange={e => setJuryCode(e.target.value.toUpperCase())}
                  placeholder="JURY-XXXXXX"
                  className="font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loggingIn}>
                <LogIn className="h-4 w-4 mr-2" />
                {loggingIn ? 'Signing in...' : 'Sign In with Jury Code'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = pendingMatches.length;
  const inProgressCount = inProgressMatches.length;
  const completedCount = completedMatches.length;

  const renderMatchCard = (match: JudgeAssignment) => {
    const status = (match.match_status ?? 'pending') as MatchStatus;
    const statusMeta = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
    const isStarting = startingMatchId === match.match_id;

    return (
      <div key={match.id} className="rounded-xl border bg-slate-50/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">{match.category_name || 'Category not set'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Round {match.round_number ?? '-'} · Match {match.match_number ?? '-'}
            </p>
          </div>
          <Badge variant="outline" className={statusMeta.className}>{statusMeta.label}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          <div className="rounded-md border bg-white p-2 text-sm">
            <p className="font-medium">{playerLabel(match.player1_name)}</p>
            <p className="text-xs text-muted-foreground mt-1">Code: {match.player1_code || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Coach: {match.player1_coach || 'N/A'}</p>
          </div>
          <div className="rounded-md border bg-white p-2 text-sm">
            <p className="font-medium">{playerLabel(match.player2_name)}</p>
            <p className="text-xs text-muted-foreground mt-1">Code: {match.player2_code || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">Coach: {match.player2_coach || 'N/A'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
          <span>Mat: {match.mat_name || '-'}</span>
          <span>When: {formatScheduledTime(match.scheduled_time)}</span>
          <span>Tournament: {match.tournament_name || 'Selected tournament'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => setDetailMatch(match)}>
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Details
          </Button>

          {status === 'pending' && (
            <Button
              size="sm"
              onClick={() => void handleStartAndPlay(match)}
              disabled={isStarting || submittingScore}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              {isStarting ? 'Starting...' : 'Start & Play'}
            </Button>
          )}

          {status === 'in_progress' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openScoringDialog(match)}
              disabled={submittingScore}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Play Match
            </Button>
          )}

          {status === 'completed' && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Result Submitted
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // Jury dashboard
  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">My Assigned Matches</h1>
            <p className="text-sm text-muted-foreground">{user?.name}</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadMatches} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tournament filter */}
      {tournaments.length > 0 && (
        <div className="flex items-center gap-3">
          <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedTournament || 'all'} onValueChange={v => setSelectedTournament(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-72"><SelectValue placeholder="All tournaments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tournaments</SelectItem>
              {tournaments.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.tournament_code ? `${t.tournament_code} • ${t.name}` : t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}
      {actionMsg && (
        <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {actionMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{matches.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Live matches highlight */}
      {inProgressCount > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-800 text-base">🔴 Live Matches</CardTitle>
          </CardHeader>
          <CardContent>
            {inProgressMatches.map(match => (
              <div key={match.id} className="flex items-center justify-between py-2 border-b border-blue-200 last:border-0">
                <div>
                  <p className="font-medium text-sm">{match.category_name}</p>
                  <p className="text-xs text-blue-700">{match.player1_name} vs {match.player2_name}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openScoringDialog(match)}>
                  Open
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upcoming Matches</CardTitle>
          <CardDescription>Matches assigned to you and waiting to start</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingMatches.length > 0 ? pendingMatches.map(renderMatchCard) : (
            <p className="text-sm text-muted-foreground">No upcoming matches assigned right now.</p>
          )}
        </CardContent>
      </Card>

      {/* In progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">In Progress</CardTitle>
          <CardDescription>Matches currently active and ready for result submission</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {inProgressMatches.length > 0 ? inProgressMatches.map(renderMatchCard) : (
            <p className="text-sm text-muted-foreground">No live matches at the moment.</p>
          )}
        </CardContent>
      </Card>

      {/* Completed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Completed Matches</CardTitle>
          <CardDescription>Matches where result has already been recorded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {completedMatches.length > 0 ? completedMatches.map(renderMatchCard) : (
            <p className="text-sm text-muted-foreground">No completed assignments yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Match details */}
      <Dialog open={!!detailMatch} onOpenChange={(open) => !open && setDetailMatch(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assigned Match Details</DialogTitle>
            <DialogDescription>
              {detailMatch?.category_name || 'Category information'}
            </DialogDescription>
          </DialogHeader>

          {detailMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Tournament</p>
                  <p className="font-medium">{detailMatch.tournament_name || 'Selected tournament'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Judge Role</p>
                  <p className="font-medium capitalize">{detailMatch.role || detailMatch.judge_role || 'judge'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Mat</p>
                  <p className="font-medium">{detailMatch.mat_name || '-'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="font-medium">{formatScheduledTime(detailMatch.scheduled_time)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-slate-50">
                  <p className="font-semibold">{playerLabel(detailMatch.player1_name)}</p>
                  <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1"><UserRound className="h-3 w-3" /> Code: {detailMatch.player1_code || 'N/A'}</p>
                    <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> Coach: {detailMatch.player1_coach || 'N/A'}</p>
                    <p className="flex items-center gap-1"><School className="h-3 w-3" /> Institution: {detailMatch.player1_school || 'N/A'}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-3 bg-slate-50">
                  <p className="font-semibold">{playerLabel(detailMatch.player2_name)}</p>
                  <div className="space-y-1 mt-2 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1"><UserRound className="h-3 w-3" /> Code: {detailMatch.player2_code || 'N/A'}</p>
                    <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> Coach: {detailMatch.player2_coach || 'N/A'}</p>
                    <p className="flex items-center gap-1"><School className="h-3 w-3" /> Institution: {detailMatch.player2_school || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailMatch(null)}>Close</Button>
            {detailMatch && detailMatch.match_status !== 'completed' && (
              <Button
                onClick={() => {
                  setDetailMatch(null);
                  void handleStartAndPlay(detailMatch);
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                {detailMatch.match_status === 'pending' ? 'Start & Play' : 'Play Match'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Play and submit result */}
      <Dialog open={!!scoreMatch} onOpenChange={(open) => !open && !submittingScore && setScoreMatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Play Match</DialogTitle>
            <DialogDescription>
              {scoreMatch ? `${playerLabel(scoreMatch.player1_name)} vs ${playerLabel(scoreMatch.player2_name)}` : ''}
            </DialogDescription>
          </DialogHeader>

          {scoreMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{playerLabel(scoreMatch.player1_name)} Score</Label>
                  <Input
                    type="number"
                    min={0}
                    value={scorePlayer1}
                    onChange={(e) => setScorePlayer1(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <Label>{playerLabel(scoreMatch.player2_name)} Score</Label>
                  <Input
                    type="number"
                    min={0}
                    value={scorePlayer2}
                    onChange={(e) => setScorePlayer2(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>

              <div>
                <Label>Winner</Label>
                <Select value={selectedWinnerId} onValueChange={setSelectedWinnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select winner" />
                  </SelectTrigger>
                  <SelectContent>
                    {scoreMatch.player1_id && (
                      <SelectItem value={scoreMatch.player1_id}>{playerLabel(scoreMatch.player1_name)}</SelectItem>
                    )}
                    {scoreMatch.player2_id && (
                      <SelectItem value={scoreMatch.player2_id}>{playerLabel(scoreMatch.player2_name)}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Win Method</Label>
                <Select value={selectedWinMethod} onValueChange={setSelectedWinMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WIN_METHOD_OPTIONS.map(method => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {scorePlayer1 === scorePlayer2 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  Scores are tied. Choose winner explicitly before submitting.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreMatch(null)} disabled={submittingScore}>Cancel</Button>
            <Button onClick={() => void handleSubmitScore()} disabled={submittingScore || !selectedWinnerId}>
              {submittingScore ? 'Submitting...' : 'Submit Result'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
