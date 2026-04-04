import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Trophy, Clock, Swords } from 'lucide-react';
import { boardService, type BoardMatch, type BoardResult } from '@/services/boardService';
import { tournamentService } from '@/services/tournamentService';

export default function BoardPage() {
  const [tournamentId, setTournamentId] = useState('');
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string }>>([]);
  const [matches, setMatches] = useState<BoardMatch[]>([]);
  const [results, setResults] = useState<BoardResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Load tournaments
  useEffect(() => {
    tournamentService.getAll().then(data => {
      setTournaments(data.map((t: any) => ({ id: t.id, name: t.name || t.tournament_name })));
      if (data.length > 0) setTournamentId(data[0].id);
    }).catch(() => {});
  }, []);

  // Fetch board data
  const fetchData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const [m, r] = await Promise.all([
        boardService.getMatches(tournamentId),
        boardService.getResults(tournamentId),
      ]);
      setMatches(m);
      setResults(r);
    } catch {
      // Silently retry on next interval
    }
  }, [tournamentId]);

  // Initial load + auto-refresh every 15s
  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    fetchData().finally(() => setLoading(false));
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [tournamentId, fetchData]);

  const liveMatches = matches.filter(m => m.status === 'in_progress');
  const upcomingMatches = matches.filter(m => m.status === 'pending').slice(0, 8);
  const recentResults = results.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Monitor className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">Live Tournament Board</h1>
            <p className="text-slate-400 text-sm">Auto-refreshes every 15 seconds</p>
          </div>
        </div>
        {tournaments.length > 1 && (
          <select
            value={tournamentId}
            onChange={e => setTournamentId(e.target.value)}
            className="bg-slate-800 text-white border border-slate-700 rounded-md px-3 py-2 text-sm"
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
        </div>
      )}

      {!loading && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live Matches */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <Swords className="h-5 w-5" /> Live Matches
              {liveMatches.length > 0 && (
                <span className="animate-pulse inline-block h-2 w-2 rounded-full bg-red-500 ml-1" />
              )}
            </h2>

            {liveMatches.length === 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center text-slate-400">
                  No matches in progress
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {liveMatches.map(match => (
                <Card key={match.id} className="bg-slate-800 border-blue-500/30 border-2">
                  <CardContent className="pt-4">
                    <div className="text-xs text-blue-400 mb-2 flex items-center justify-between">
                      <span>{match.category_name}</span>
                      {match.mat_name && <Badge variant="outline" className="text-xs border-slate-600">{match.mat_name}</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="font-bold text-lg text-white">{match.player1_name || 'TBD'}</p>
                        <p className="text-xs text-slate-400">{match.player1_club || ''}</p>
                      </div>
                      <div className="px-4">
                        <Badge className="bg-red-600 text-white animate-pulse">LIVE</Badge>
                      </div>
                      <div className="text-center flex-1">
                        <p className="font-bold text-lg text-white">{match.player2_name || 'TBD'}</p>
                        <p className="text-xs text-slate-400">{match.player2_club || ''}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Upcoming */}
            <h2 className="text-lg font-semibold text-yellow-400 mt-6 mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Upcoming Matches
            </h2>
            {upcomingMatches.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-8 text-center text-slate-400">
                  No upcoming matches
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {upcomingMatches.map(match => (
                  <Card key={match.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-sm text-slate-300">{match.player1_name || 'TBD'}</span>
                        <span className="text-slate-500 mx-2">vs</span>
                        <span className="text-sm text-slate-300">{match.player2_name || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{match.category_name}</Badge>
                        {match.mat_name && <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{match.mat_name}</Badge>}
                        {match.scheduled_time && (
                          <span className="text-xs text-slate-500">
                            {new Date(match.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <div>
            <h2 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5" /> Results
            </h2>
            {recentResults.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-8 text-center text-slate-400">
                  No results yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentResults.map((r, i) => (
                  <Card key={i} className="bg-slate-800 border-slate-700">
                    <CardContent className="py-3">
                      <p className="text-xs text-slate-400 mb-1">{r.category_name}</p>
                      <div className="space-y-1 text-sm">
                        {r.gold && (
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">🥇</span>
                            <span className="text-white">{r.gold}</span>
                          </div>
                        )}
                        {r.silver && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-300">🥈</span>
                            <span className="text-slate-300">{r.silver}</span>
                          </div>
                        )}
                        {r.bronze1 && (
                          <div className="flex items-center gap-2">
                            <span className="text-orange-400">🥉</span>
                            <span className="text-slate-400">{r.bronze1}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
