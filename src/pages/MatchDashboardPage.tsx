import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { dashboardService } from '@/services/dashboardService';
import { tournamentService } from '@/services/tournamentService';
import { BarChart3, Trophy, Users, CheckCircle2, Clock, AlertCircle, Gavel } from 'lucide-react';

interface Tournament { id: string; name: string; tournament_code: string }

interface CategoryProgress {
  category_id: string;
  event_type: string;
  age_category: string;
  gender: string;
  weight_class: string;
  mat_number: number | null;
  total_matches: number;
  completed_matches: number;
  in_progress_matches: number;
  pending_matches: number;
  completion_pct: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface OverviewData { [key: string]: any }

export default function MatchDashboardPage() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [judges, setJudges] = useState<OverviewData[]>([]);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tournamentService.getAll().then(data => {
      setTournaments((Array.isArray(data) ? data : []) as unknown as Tournament[]);
    }).catch(() => {});
  }, []);

  const loadData = useCallback(async (tid: string) => {
    if (!tid) return;
    setLoading(true);
    try {
      const [catRes, ovRes, jRes] = await Promise.all([
        dashboardService.getMatchProgress(tid, {
          eventType: filterEvent || undefined,
          gender: filterGender || undefined,
        }),
        dashboardService.getOverview(tid),
        dashboardService.getJudgeAssignments(tid),
      ]);
      setCategories(catRes.data ?? []);
      setOverview(ovRes.data ?? null);
      setJudges(jRes.data ?? []);
    } catch {
      toast({ title: 'Error loading dashboard', variant: 'destructive' });
    }
    setLoading(false);
  }, [filterEvent, filterGender, toast]);

  useEffect(() => {
    if (selectedTournament) loadData(selectedTournament);
  }, [selectedTournament, loadData]);

  const statusColor = (pct: number) => {
    if (pct >= 100) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Match Dashboard</h1>
            <p className="text-muted-foreground">Track match progress by category, age, gender & weight</p>
          </div>
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Tournament + Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select tournament..." />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEvent || 'all'} onValueChange={v => setFilterEvent(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="kyorugi">Kyorugi</SelectItem>
              <SelectItem value="poomsae">Poomsae</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterGender || 'all'} onValueChange={v => setFilterGender(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && <p className="text-muted-foreground">Loading...</p>}

        {selectedTournament && overview && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Trophy className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                  <p className="text-2xl font-bold">{overview.total_categories ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <BarChart3 className="h-6 w-6 mx-auto text-indigo-500 mb-1" />
                  <p className="text-2xl font-bold">{overview.total_matches ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Matches</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1" />
                  <p className="text-2xl font-bold">{overview.completed_matches ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Clock className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
                  <p className="text-2xl font-bold">{overview.in_progress_matches ?? 0}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Users className="h-6 w-6 mx-auto text-slate-500 mb-1" />
                  <p className="text-2xl font-bold">{overview.total_players ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Players</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Gavel className="h-6 w-6 mx-auto text-purple-500 mb-1" />
                  <p className="text-2xl font-bold">{overview.active_judges ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Active Judges</p>
                </CardContent>
              </Card>
            </div>

            {/* Per event type breakdown */}
            {overview.byEventType?.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Progress by Event Type</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(overview.byEventType as { event_type: string; categories: number; total_matches: number; completed: number; pct: number }[]).map(evt => (
                      <div key={evt.event_type} className="flex items-center gap-4">
                        <span className="font-medium w-24 capitalize">{evt.event_type}</span>
                        <div className="flex-1">
                          <Progress value={Number(evt.pct)} className="h-2" />
                        </div>
                        <span className={`text-sm font-semibold w-16 text-right ${statusColor(Number(evt.pct))}`}>
                          {evt.pct}%
                        </span>
                        <span className="text-xs text-muted-foreground w-24 text-right">
                          {evt.completed}/{evt.total_matches} matches
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Category-level match progress */}
            <Card>
              <CardHeader>
                <CardTitle>Category Progress ({categories.length} categories)</CardTitle>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-muted-foreground">No categories found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Event</th>
                          <th className="pb-2 font-medium">Age</th>
                          <th className="pb-2 font-medium">Gender</th>
                          <th className="pb-2 font-medium">Weight</th>
                          <th className="pb-2 font-medium">Mat</th>
                          <th className="pb-2 font-medium">Matches</th>
                          <th className="pb-2 font-medium">Progress</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map(cat => (
                          <tr key={cat.category_id} className="border-b hover:bg-slate-50">
                            <td className="py-2 capitalize">{cat.event_type}</td>
                            <td className="py-2">{cat.age_category}</td>
                            <td className="py-2 capitalize">{cat.gender}</td>
                            <td className="py-2">{cat.weight_class}</td>
                            <td className="py-2">{cat.mat_number ?? '-'}</td>
                            <td className="py-2">
                              <span className="text-green-600">{cat.completed_matches}</span>
                              <span className="text-muted-foreground">/</span>
                              <span>{cat.total_matches}</span>
                            </td>
                            <td className="py-2 w-32">
                              <Progress value={Number(cat.completion_pct)} className="h-2" />
                            </td>
                            <td className="py-2">
                              {Number(cat.completion_pct) >= 100 ? (
                                <Badge className="bg-green-100 text-green-800">Complete</Badge>
                              ) : Number(cat.in_progress_matches) > 0 ? (
                                <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                              ) : Number(cat.total_matches) > 0 ? (
                                <Badge className="bg-slate-100 text-slate-600">Scheduled</Badge>
                              ) : (
                                <Badge variant="outline">No Matches</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Judge workload */}
            {judges.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Judge Assignment Workload</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {judges.map((j: OverviewData) => (
                      <div key={j.judge_id} className="border rounded-lg p-3">
                        <p className="font-medium">{j.first_name} {j.last_name}</p>
                        <p className="text-xs text-muted-foreground mb-2">{j.email}</p>
                        <div className="flex gap-2">
                          <Badge variant="outline">{j.total_assigned} total</Badge>
                          <Badge className="bg-green-100 text-green-800">{j.completed} done</Badge>
                          {j.in_progress > 0 && (
                            <Badge className="bg-yellow-100 text-yellow-800">{j.in_progress} active</Badge>
                          )}
                          {j.pending > 0 && (
                            <Badge className="bg-slate-100 text-slate-600">{j.pending} pending</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
}
