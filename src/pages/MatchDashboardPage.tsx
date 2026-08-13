import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { dashboardService } from '@/services/dashboardService';
import { tournamentService } from '@/services/tournamentService';
import { judgeService, type JuryMember } from '@/services/judgeService';
import { matchService } from '@/services/matchService';
import {
  drawPreviewService,
  drawResultToBracketData,
  matchRowsToBracketData,
  playersFromSavedRows,
  type SavedMatchRow,
} from '@/services/drawPreviewService';
import { useBracketPDF, type PDFOrientation } from '@/hooks/useBracketPDF';
import { useAuthStore } from '@/store/useAuthStore';
import JuryCategoryAssignDialog from '@/components/JuryCategoryAssignDialog';
import { BracketMatch } from '@shared/schema';
import {
  BarChart3, Trophy, Users, CheckCircle2, Clock, AlertCircle, Gavel,
  ExternalLink, ListChecks, FileText, Download, RefreshCw, RotateCw, Loader2,
} from 'lucide-react';

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

interface DrawCategory {
  id: string;
  event_type: string;
  age_category: string;
  gender: string;
  weight_class: string;
  player_count?: number;
}

interface DialogPlayer {
  name: string;
  club?: string;
  seed?: number;
}

type DrawDialogMode = 'saved' | 'preview' | 'insufficient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface OverviewData { [key: string]: any }

function titleCase(value: string | undefined | null): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function drawCategoryLabel(cat: DrawCategory): string {
  return `${titleCase(cat.event_type)} • ${cat.age_category} • ${titleCase(cat.gender)} • ${cat.weight_class}`;
}

function drawCategoryFileName(cat: DrawCategory): string {
  return `${cat.event_type}-${cat.age_category}-${cat.gender}-${cat.weight_class}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-drawsheet.pdf';
}

export default function MatchDashboardPage() {
  const { toast } = useToast();
  const user = useAuthStore(s => s.user);
  const isAdminOrOrganizer = !!user?.roles?.some(r => r === 'admin' || r === 'organizer');

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [judges, setJudges] = useState<OverviewData[]>([]);
  const [filterEvent, setFilterEvent] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [loading, setLoading] = useState(false);

  // Jury members (with codes) + category-assignment dialog
  const [juryMembers, setJuryMembers] = useState<JuryMember[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignJudge, setAssignJudge] = useState<JuryMember | null>(null);

  // Draw sheets
  const [drawCats, setDrawCats] = useState<DrawCategory[]>([]);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawCat, setDrawCat] = useState<DrawCategory | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawDialogMode | null>(null);
  const [drawBracket, setDrawBracket] = useState<BracketMatch[][] | null>(null);
  const [drawPlayers, setDrawPlayers] = useState<DialogPlayer[]>([]);
  const [drawPlayerCount, setDrawPlayerCount] = useState(0);
  const [drawOrientation, setDrawOrientation] = useState<PDFOrientation>('landscape');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { generateBracketPDF, generatePDFDataUri } = useBracketPDF();

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

  // Jury members + tournament categories (not affected by event/gender filters)
  useEffect(() => {
    if (!selectedTournament) {
      setJuryMembers([]);
      setDrawCats([]);
      return;
    }
    if (isAdminOrOrganizer) {
      judgeService.listByTournament(selectedTournament)
        .then(setJuryMembers)
        .catch(() => setJuryMembers([]));
    } else {
      setJuryMembers([]);
    }
    tournamentService.getCategories(selectedTournament)
      .then(data => setDrawCats((data ?? []) as DrawCategory[]))
      .catch(() => setDrawCats([]));
  }, [selectedTournament, isAdminOrOrganizer]);

  /** Refresh judge assignment counts (after saving category assignments) */
  const refreshJudgeCounts = useCallback(async () => {
    if (!selectedTournament) return;
    try {
      const jRes = await dashboardService.getJudgeAssignments(selectedTournament);
      setJudges(jRes.data ?? []);
    } catch { /* counts are informational */ }
  }, [selectedTournament]);

  const workloadByJudge: Record<string, OverviewData> = {};
  for (const j of judges) workloadByJudge[j.judge_id] = j;

  // ---------- Draw sheet dialog ----------

  const buildPdf = useCallback(async (
    bracket: BracketMatch[][],
    cat: DrawCategory,
    participantCount: number,
    orientation: PDFOrientation,
  ) => {
    setPdfLoading(true);
    try {
      const label = drawCategoryLabel(cat);
      const tournamentName = tournaments.find(t => t.id === selectedTournament)?.name ?? '';
      const uri = await generatePDFDataUri(bracket, label, participantCount, {
        tournamentHeader: label,
        organizedBy: tournamentName,
        fileName: drawCategoryFileName(cat),
        pdfOrientation: orientation,
      });
      setPdfUri(uri);
    } finally {
      setPdfLoading(false);
    }
  }, [generatePDFDataUri, tournaments, selectedTournament]);

  async function openDrawDialog(cat: DrawCategory) {
    setDrawCat(cat);
    setDrawOpen(true);
    setDrawLoading(true);
    setDrawMode(null);
    setDrawBracket(null);
    setDrawPlayers([]);
    setDrawPlayerCount(0);
    setPdfUri(null);
    try {
      // A category whose draw was already executed has zero eligible players
      // (entry_status='drawn'), so check for saved matches FIRST.
      const rows = await matchService.getByCategory(cat.id).catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) {
        const savedRows = rows as unknown as SavedMatchRow[];
        const bracket = matchRowsToBracketData(savedRows);
        const names = playersFromSavedRows(savedRows);
        setDrawMode('saved');
        setDrawBracket(bracket);
        setDrawPlayers(names.map(name => ({ name })));
        setDrawPlayerCount(names.length);
        await buildPdf(bracket, cat, names.length, drawOrientation);
      } else {
        const { players } = await drawPreviewService.getEligible(cat.id, selectedTournament);
        setDrawPlayers(players.map(p => ({
          name: p.fullName,
          club: p.clubId ?? undefined,
          seed: p.seed ?? undefined,
        })));
        setDrawPlayerCount(players.length);
        if (players.length < 2) {
          setDrawMode('insufficient');
        } else {
          const result = await drawPreviewService.generatePreview({
            categoryId: cat.id,
            tournamentId: selectedTournament,
            drawType: 'random',
            thirdPlaceMatch: false,
          });
          const bracket = drawResultToBracketData(result);
          setDrawMode('preview');
          setDrawBracket(bracket);
          await buildPdf(bracket, cat, result.playerCount, drawOrientation);
        }
      }
    } catch (e: any) {
      toast({
        title: 'Failed to load draw sheet',
        description: e?.message || 'Could not build the draw sheet for this category.',
        variant: 'destructive',
      });
      setDrawOpen(false);
    } finally {
      setDrawLoading(false);
    }
  }

  async function regeneratePreview() {
    if (!drawCat || drawMode !== 'preview') return;
    setDrawLoading(true);
    try {
      const result = await drawPreviewService.generatePreview({
        categoryId: drawCat.id,
        tournamentId: selectedTournament,
        drawType: 'random',
        thirdPlaceMatch: false,
      });
      const bracket = drawResultToBracketData(result);
      setDrawBracket(bracket);
      await buildPdf(bracket, drawCat, result.playerCount, drawOrientation);
    } catch (e: any) {
      toast({
        title: 'Failed to regenerate preview',
        description: e?.message || 'Could not regenerate the draw preview.',
        variant: 'destructive',
      });
    } finally {
      setDrawLoading(false);
    }
  }

  function toggleDrawOrientation() {
    const next: PDFOrientation = drawOrientation === 'landscape' ? 'portrait' : 'landscape';
    setDrawOrientation(next);
    if (drawBracket && drawCat) void buildPdf(drawBracket, drawCat, drawPlayerCount, next);
  }

  function downloadDrawPdf() {
    if (!drawBracket || !drawCat) return;
    const label = drawCategoryLabel(drawCat);
    const tournamentName = tournaments.find(t => t.id === selectedTournament)?.name ?? '';
    void generateBracketPDF(drawBracket, label, drawPlayerCount, {
      tournamentHeader: label,
      organizedBy: tournamentName,
      fileName: drawCategoryFileName(drawCat),
      pdfOrientation: drawOrientation,
    });
  }

  const statusColor = (pct: number) => {
    if (pct >= 100) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const menCats = drawCats.filter(c => c.gender === 'male');
  const womenCats = drawCats.filter(c => c.gender === 'female');
  const otherCats = drawCats.filter(c => c.gender !== 'male' && c.gender !== 'female');
  const genderGroups: Array<{ key: string; title: string; cats: DrawCategory[] }> = [
    { key: 'men', title: 'Men', cats: menCats },
    { key: 'women', title: 'Women', cats: womenCats },
    ...(otherCats.length > 0 ? [{ key: 'other', title: 'Other', cats: otherCats }] : []),
  ];

  return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Match Dashboard</h1>
            <p className="text-muted-foreground">Track match progress by category, age, gender & weight</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdminOrOrganizer && (
              <Button variant="outline" onClick={() => window.open('/jury', '_blank', 'noopener')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Jury Board
              </Button>
            )}
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
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

            {/* Draw sheets — category-wise PDF draw sheets grouped by gender */}
            {drawCats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Draw Sheets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {genderGroups.map(group => group.cats.length > 0 && (
                    <div key={group.key}>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {group.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {group.cats.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => void openDrawDialog(cat)}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-slate-50 hover:border-slate-400 transition-colors"
                            title={`Open draw sheet for ${drawCategoryLabel(cat)}`}
                          >
                            <span className="capitalize">
                              {cat.event_type} • {cat.age_category} • {cat.weight_class}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              <Users className="h-2.5 w-2.5 mr-0.5" />
                              {cat.player_count ?? 0}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Jury members + judge workload */}
            {isAdminOrOrganizer && juryMembers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" /> Jury Members & Category Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {juryMembers.map(judge => {
                      const workload = workloadByJudge[judge.user_id];
                      return (
                        <div key={judge.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{judge.first_name} {judge.last_name}</p>
                            <Badge variant={judge.is_active ? 'default' : 'secondary'}>
                              {judge.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mb-2">{judge.jury_code}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline">
                              <ListChecks className="h-3 w-3 mr-1" />
                              {workload?.total_assigned ?? 0} assigned
                            </Badge>
                            {Number(workload?.completed) > 0 && (
                              <Badge className="bg-green-100 text-green-800">{workload.completed} done</Badge>
                            )}
                            {Number(workload?.in_progress) > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800">{workload.in_progress} active</Badge>
                            )}
                            {Number(workload?.pending) > 0 && (
                              <Badge className="bg-slate-100 text-slate-600">{workload.pending} pending</Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setAssignJudge(judge); setAssignOpen(true); }}
                          >
                            <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                            Assign Categories
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : judges.length > 0 && (
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

        {/* Assign categories dialog (shared with Jury Management) */}
        <JuryCategoryAssignDialog
          judge={assignJudge}
          tournamentId={selectedTournament}
          open={assignOpen}
          onOpenChange={setAssignOpen}
          onSaved={() => void refreshJudgeCounts()}
        />

        {/* Draw sheet preview dialog */}
        <Dialog open={drawOpen} onOpenChange={setDrawOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{drawCat ? drawCategoryLabel(drawCat) : 'Draw Sheet'}</DialogTitle>
              <DialogDescription>
                {drawMode === 'saved' && 'Official draw (saved)'}
                {drawMode === 'preview' && 'Preview draw (not saved — regenerated each time)'}
                {drawMode === 'insufficient' && 'Not enough players for a draw'}
                {drawMode === null && 'Loading draw information...'}
              </DialogDescription>
            </DialogHeader>

            {drawLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="sheet">
                <TabsList>
                  <TabsTrigger value="sheet">Draw Sheet</TabsTrigger>
                  <TabsTrigger value="players">Players ({drawPlayerCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="sheet" className="space-y-3">
                  {drawMode === 'insufficient' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                      <AlertCircle className="h-10 w-10 text-yellow-500 mb-3" />
                      <p className="font-medium">Not enough players for a draw</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This category has {drawPlayerCount} eligible player{drawPlayerCount === 1 ? '' : 's'}.
                        At least 2 are required to generate a draw sheet.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={toggleDrawOrientation} disabled={pdfLoading || !drawBracket}>
                          <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                          {drawOrientation === 'landscape' ? 'Portrait' : 'Landscape'}
                        </Button>
                        {drawMode === 'preview' && (
                          <Button variant="outline" size="sm" onClick={() => void regeneratePreview()} disabled={pdfLoading}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Regenerate
                          </Button>
                        )}
                        <Button size="sm" onClick={downloadDrawPdf} disabled={pdfLoading || !drawBracket}>
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Download PDF
                        </Button>
                      </div>
                      {pdfLoading ? (
                        <div className="flex justify-center items-center py-16 border rounded-lg bg-slate-50">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : pdfUri ? (
                        <div className="bg-white rounded-lg border shadow-sm relative" style={{ height: '60vh', minHeight: '360px' }}>
                          <object data={pdfUri} type="application/pdf" className="w-full h-full rounded-lg">
                            <iframe src={`${pdfUri}#view=FitH`} className="w-full h-full rounded-lg" title="Draw Sheet Preview">
                              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <FileText className="h-12 w-12 text-slate-400 mb-4" />
                                <p className="text-slate-600 mb-4">PDF preview is not supported on this device.</p>
                                <Button onClick={downloadDrawPdf}>
                                  <Download className="h-4 w-4 mr-2" /> Download PDF
                                </Button>
                              </div>
                            </iframe>
                          </object>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-8 text-center">No preview available.</p>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="players">
                  {drawPlayers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No player entries found for this category.
                    </p>
                  ) : (
                    <div className="max-h-[55vh] overflow-y-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50">
                          <tr className="border-b text-left">
                            <th className="px-3 py-2 font-medium w-10">#</th>
                            <th className="px-3 py-2 font-medium">Name</th>
                            <th className="px-3 py-2 font-medium">Club</th>
                            <th className="px-3 py-2 font-medium w-16">Seed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drawPlayers.map((p, i) => (
                            <tr key={`${p.name}-${i}`} className="border-b last:border-0 hover:bg-slate-50">
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 font-medium">{p.name}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{p.club ?? '—'}</td>
                              <td className="px-3 py-2">{p.seed ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDrawOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
