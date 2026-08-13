import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, Trophy, Users, Timer } from 'lucide-react';
import { apiRequest, isApiConfigured } from '@/services/api';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { TournamentSelectItem } from '@/components/TournamentSelectItem';

interface MatchOverview {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  byCategory: { category: string; total: number; completed: number }[];
  byMat: { mat: string; total: number; completed: number }[];
  winMethods: { method: string; count: number }[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function MatchOverviewPage() {
  const [tournamentId, setTournamentId] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [overview, setOverview] = useState<MatchOverview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isApiConfigured()) {
      tournamentService.listTournaments().then(list => {
        setTournaments(list);
        if (list.length > 0) setTournamentId(list[0].id);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!tournamentId || !isApiConfigured()) return;
    setLoading(true);

    Promise.all([
      apiRequest<{ data: any[] }>(`/api/matches?tournamentId=${tournamentId}`).catch(() => ({ data: [] })),
      apiRequest<{ data: any[] }>(`/api/mats/${tournamentId}/mats`).catch(() => ({ data: [] })),
    ]).then(([matchRes, matRes]) => {
      const matches = matchRes.data ?? [];
      const mats = matRes.data ?? [];

      const total = matches.length;
      const pending = matches.filter((m: any) => m.status === 'pending' || m.status === 'scheduled').length;
      const inProgress = matches.filter((m: any) => m.status === 'in_progress').length;
      const completed = matches.filter((m: any) => m.status === 'completed').length;

      // Group by category
      const catMap: Record<string, { total: number; completed: number }> = {};
      for (const m of matches) {
        const key = m.weight_category ?? m.category ?? 'Unknown';
        if (!catMap[key]) catMap[key] = { total: 0, completed: 0 };
        catMap[key].total++;
        if (m.status === 'completed') catMap[key].completed++;
      }
      const byCategory = Object.entries(catMap).map(([category, v]) => ({ category, ...v }));

      // Group by mat
      const matMap: Record<string, { total: number; completed: number }> = {};
      for (const m of matches) {
        const key = m.mat_number ? `Mat ${m.mat_number}` : 'Unassigned';
        if (!matMap[key]) matMap[key] = { total: 0, completed: 0 };
        matMap[key].total++;
        if (m.status === 'completed') matMap[key].completed++;
      }
      const byMat = Object.entries(matMap).map(([mat, v]) => ({ mat, ...v }));

      // Win methods
      const wmMap: Record<string, number> = {};
      for (const m of matches) {
        if (m.win_method) {
          wmMap[m.win_method] = (wmMap[m.win_method] || 0) + 1;
        }
      }
      const winMethods = Object.entries(wmMap).map(([method, count]) => ({ method, count }));

      setOverview({ total, pending, inProgress, completed, byCategory, byMat, winMethods });
    }).finally(() => setLoading(false));
  }, [tournamentId]);

  const statusData = useMemo(() => {
    if (!overview) return [];
    return [
      { name: 'Pending', value: overview.pending },
      { name: 'In Progress', value: overview.inProgress },
      { name: 'Completed', value: overview.completed },
    ];
  }, [overview]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Match Overview</h1>
        </div>
        <div className="w-64">
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger><SelectValue placeholder="Select tournament" /></SelectTrigger>
            <SelectContent>
              {tournaments.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <TournamentSelectItem name={t.name} status={t.status} count={t.player_count} countLabel="players" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {overview && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">{overview.total}</p>
                <p className="text-sm text-muted-foreground">Total Matches</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Timer className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-3xl font-bold">{overview.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-3xl font-bold">{overview.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold">{overview.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Match Status Pie Chart */}
            <Card>
              <CardHeader><CardTitle>Match Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Win Methods Pie Chart */}
            {overview.winMethods.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Win Methods</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={overview.winMethods} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="method" label>
                        {overview.winMethods.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* By Category Bar Chart */}
            {overview.byCategory.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Matches by Category</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overview.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-30} textAnchor="end" height={80} fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#3b82f6" name="Total" />
                      <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* By Mat Bar Chart */}
            {overview.byMat.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Matches by Mat</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overview.byMat}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mat" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#8b5cf6" name="Total" />
                      <Bar dataKey="completed" fill="#06b6d4" name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {!overview && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a tournament to view match overview charts.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
