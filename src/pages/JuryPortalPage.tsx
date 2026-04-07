import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gavel, LogIn, AlertCircle, Clock, CheckCircle, Play, RefreshCw, Trophy } from 'lucide-react';
import { judgeService, type JudgeAssignment } from '@/services/judgeService';
import { matchService as matchApiService } from '@/services/matchService';
import { tournamentService } from '@/services/tournamentService';
import { setStoredTokens } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function JuryPortalPage() {
  const { user, login } = useAuthStore();

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
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<JudgeAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (isJuryAuthenticated) {
      tournamentService.getAll().then((data: any[]) => {
        const list = data.map((t: any) => ({ id: t.id, name: t.name || t.tournament_name }));
        setTournaments(list);
      }).catch(() => {});
    }
  }, [isJuryAuthenticated]);

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

  async function handleStartMatch(matchId: string) {
    try {
      await matchApiService.startMatch(matchId);
      setActionMsg('Match started!');
      await loadMatches();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  const pendingCount = matches.filter(m => m.match_status === 'pending').length;
  const inProgressCount = matches.filter(m => m.match_status === 'in_progress').length;
  const completedCount = matches.filter(m => m.match_status === 'completed').length;

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
              {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{matches.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
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
            {matches.filter(m => m.match_status === 'in_progress').map(match => (
              <div key={match.id} className="flex items-center justify-between py-2 border-b border-blue-200 last:border-0">
                <div>
                  <p className="font-medium text-sm">{match.category_name}</p>
                  <p className="text-xs text-blue-700">{match.player1_name} vs {match.player2_name}</p>
                </div>
                <Badge className="bg-blue-600 text-white">In Progress</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Matches Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Assigned Matches</CardTitle>
          <CardDescription>{matches.length} matches · {pendingCount} pending</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Mat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map(match => (
                <TableRow key={match.id}>
                  <TableCell className="font-medium">{match.category_name || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span>{match.player1_name || 'TBD'}</span>
                      <span className="text-muted-foreground mx-1">vs</span>
                      <span>{match.player2_name || 'TBD'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{match.mat_name || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusColor(match.match_status || 'pending')} variant="secondary">
                      {match.match_status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {match.scheduled_time ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(match.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {match.match_status === 'pending' && (
                      <Button size="sm" onClick={() => handleStartMatch(match.match_id)}>
                        <Play className="h-3 w-3 mr-1" /> Start
                      </Button>
                    )}
                    {match.match_status === 'in_progress' && (
                      <Button size="sm" variant="secondary">Score</Button>
                    )}
                    {match.match_status === 'completed' && (
                      <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Done</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {matches.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No matches assigned yet</TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
