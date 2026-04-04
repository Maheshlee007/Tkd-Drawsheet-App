import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Gavel, LogIn, AlertCircle, Clock, CheckCircle, Play } from 'lucide-react';
import { judgeService, type JudgeAssignment } from '@/services/judgeService';
import { matchService as matchApiService } from '@/services/matchService';
import { setStoredTokens } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function JuryPortalPage() {
  const { user, login } = useAuthStore();
  const isJuryLoggedIn = user?.roles?.includes('jury');

  // Login state
  const [juryCode, setJuryCode] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Matches state
  const [matches, setMatches] = useState<JudgeAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (isJuryLoggedIn) loadMatches();
  }, [isJuryLoggedIn]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!juryCode || !password) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const result = await judgeService.login(juryCode.trim(), password);
      setStoredTokens(result.accessToken, result.refreshToken);
      await login({
        name: `${result.user.firstName} ${result.user.lastName}`,
        email: result.user.email,
        roles: result.user.roles || ['jury'],
        permissions: result.user.permissions || [],
      });
    } catch (e: any) {
      setLoginError(e.message || 'Invalid jury code or password');
    } finally {
      setLoggingIn(false);
    }
  }

  async function loadMatches() {
    setLoading(true);
    try {
      const data = await judgeService.getMyMatches();
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

  // Login screen for jury
  if (!isJuryLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Jury Portal</CardTitle>
            <CardDescription>Enter your jury code and password to access your assigned matches</CardDescription>
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
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loggingIn}>
                <LogIn className="h-4 w-4 mr-2" />
                {loggingIn ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Jury dashboard
  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My Assigned Matches</h1>
        </div>
        <Button variant="outline" onClick={loadMatches} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

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
            <p className="text-sm text-muted-foreground">Total Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {matches.filter(m => m.match_status === 'in_progress').length}
            </p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {matches.filter(m => m.match_status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Matches Table */}
      <Card>
        <CardContent className="pt-4">
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
                      <Button size="sm" variant="secondary">
                        Score
                      </Button>
                    )}
                    {match.match_status === 'completed' && (
                      <Badge variant="outline">Done</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {matches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No matches assigned yet
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
