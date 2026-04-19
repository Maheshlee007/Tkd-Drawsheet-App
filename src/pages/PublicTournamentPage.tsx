import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Trophy, Users, User, Filter } from 'lucide-react';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { apiRequest } from '@/services/api';
import { AutoCloseErrorModal } from '@/components/AutoCloseErrorModal';

type AudienceRole = 'player' | 'coach';

interface PublicCategory {
  id: string;
  event_type: string;
  age_category: string;
  gender: string;
  weight_class: string;
  is_started?: boolean;
  player_count?: number;
}

interface BoardCategoryResponse {
  category: Record<string, unknown>;
  players: Array<Record<string, unknown>>;
  bracketData: unknown;
}

export default function PublicTournamentPage() {
  const [, navigate] = useLocation();

  const [tournamentCode, setTournamentCode] = useState('');
  const [role, setRole] = useState<AudienceRole>('player');
  const [participantId, setParticipantId] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingBracket, setLoadingBracket] = useState(false);
  const [modalError, setModalError] = useState('');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [subject, setSubject] = useState<Record<string, unknown> | null>(null);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [boardCategory, setBoardCategory] = useState<BoardCategoryResponse | null>(null);

  const [ageFilter, setAgeFilter] = useState('all');
  const [weightFilter, setWeightFilter] = useState('all');

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (role === 'coach' && ageFilter !== 'all' && c.age_category !== ageFilter) return false;
      if (role === 'coach' && weightFilter !== 'all' && c.weight_class !== weightFilter) return false;
      return true;
    });
  }, [categories, role, ageFilter, weightFilter]);

  const ageOptions = useMemo(
    () => Array.from(new Set(categories.map((c) => c.age_category))).sort(),
    [categories]
  );

  const weightOptions = useMemo(
    () => Array.from(new Set(categories.map((c) => c.weight_class))).sort(),
    [categories]
  );

  async function handleLoadCategories() {
    const rawTournamentRef = tournamentCode.trim();
    const code = rawTournamentRef.toUpperCase();
    const userRef = participantId.trim();
    if (!rawTournamentRef || !userRef) {
      setModalError('Tournament code and user ID are required.');
      return;
    }

    setLoading(true);
    setBoardCategory(null);
    setSelectedCategoryId('');
    try {
      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawTournamentRef);
      const resolvedTournament = looksLikeUuid
        ? await tournamentService.getTournament(rawTournamentRef)
        : await tournamentService.getByCode(code);
      setTournament(resolvedTournament);

      const res = await apiRequest<{ data: { subject: Record<string, unknown>; categories: PublicCategory[] } }>(
        `/api/board/${resolvedTournament.id}/participant/${encodeURIComponent(userRef)}/categories?role=${role}`
      );

      setSubject(res.data.subject);
      setCategories(res.data.categories ?? []);

      if (!res.data.categories?.length) {
        setModalError('No published or eligible categories are available for this user yet.');
      }
    } catch (e: any) {
      setTournament(null);
      setSubject(null);
      setCategories([]);
      setModalError(e?.message || 'Unable to load tournament data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadBracket(categoryId: string) {
    if (!tournament) return;

    if (!['in_progress', 'completed'].includes(String(tournament.status))) {
      setModalError('Tournament has not started yet. Bracket cannot be generated right now.');
      return;
    }

    const categoryMeta = categories.find((c) => c.id === categoryId);
    if (categoryMeta && !categoryMeta.is_started) {
      setModalError('This weight category has not started yet. Bracket is currently unavailable.');
      return;
    }

    setSelectedCategoryId(categoryId);
    setLoadingBracket(true);
    try {
      const res = await apiRequest<{ data: BoardCategoryResponse }>(
        `/api/board/${tournament.id}/category/${categoryId}`
      );
      setBoardCategory(res.data);
    } catch (e: any) {
      setBoardCategory(null);
      setModalError(e?.message || 'Could not load bracket details for this category.');
    } finally {
      setLoadingBracket(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate('/login')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
          </Button>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Public Tournament Brackets
          </h1>
          <div className="w-[120px]" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find Your Bracket</CardTitle>
            <CardDescription>
              Enter tournament code and your user ID. Players will only see their own category; coaches can view all categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Tournament Code or ID</Label>
              <Input
                value={tournamentCode}
                onChange={(e) => setTournamentCode(e.target.value.toUpperCase())}
                placeholder="TKD-2026-ABCD or UUID"
                className="font-mono uppercase"
              />
            </div>
            <div>
              <Label>User Type</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AudienceRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{role === 'player' ? 'Player Code / ID / Phone' : 'Coach Code or Email'}</Label>
              <Input
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder={role === 'player' ? 'TKD-P-XXXX' : 'TKD-C-XXXX'}
              />
            </div>
            <Button onClick={() => void handleLoadCategories()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Categories'}
            </Button>
          </CardContent>
        </Card>

        {tournament && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">{tournament.tournament_code}</Badge>
                <Badge variant="secondary" className="capitalize">{tournament.status.replace(/_/g, ' ')}</Badge>
                <span className="text-sm text-slate-600">{tournament.name}</span>
              </div>
              {!!subject && (
                <p className="text-sm text-slate-600 mt-2">
                  {role === 'player' ? <User className="inline h-4 w-4 mr-1" /> : <Users className="inline h-4 w-4 mr-1" />}
                  Viewing as: {String((subject.full_name ?? subject.email ?? subject.player_code ?? subject.coach_code) || 'User')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Categories ({filteredCategories.length})</CardTitle>
              {role === 'coach' && (
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Coaches can filter by age and weight.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {role === 'coach' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select value={ageFilter} onValueChange={setAgeFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by age" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All age groups</SelectItem>
                      {ageOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={weightFilter} onValueChange={setWeightFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by weight" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All weight classes</SelectItem>
                      {weightOptions.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredCategories.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => void handleLoadBracket(cat.id)}
                    disabled={!cat.is_started}
                    className={`rounded-md border p-3 text-left transition ${selectedCategoryId === cat.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium capitalize">{cat.event_type.replace(/_/g, ' ')}</p>
                      <Badge variant={cat.is_started ? 'default' : 'secondary'}>{cat.is_started ? 'Started' : 'Not started'}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{cat.age_category} • {cat.gender} • {cat.weight_class}</p>
                    {typeof cat.player_count === 'number' && <p className="text-xs text-slate-500 mt-1">Players: {cat.player_count}</p>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(loadingBracket || boardCategory) && (
          <Card>
            <CardHeader>
              <CardTitle>Bracket Details</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBracket ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading bracket...
                </div>
              ) : boardCategory ? (
                <div className="space-y-3">
                  <div className="text-sm text-slate-700">
                    Category: <strong>{String(boardCategory.category.weight_class ?? '-')}</strong>
                    {' '}({String(boardCategory.category.age_category ?? '-')}, {String(boardCategory.category.gender ?? '-')})
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Players</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {boardCategory.players.map((p, idx) => (
                        <div key={`${String(p.full_name ?? '')}-${idx}`} className="rounded border px-3 py-2 text-sm">
                          <p className="font-medium">{String(p.full_name ?? '-')}</p>
                          <p className="text-xs text-slate-500">Coach: {String(p.coach_name ?? '-')} • School: {String(p.school_college ?? '-')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Bracket Data</p>
                    <pre className="max-h-72 overflow-auto rounded bg-slate-950 text-slate-100 text-xs p-3">
                      {JSON.stringify(boardCategory.bracketData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      <AutoCloseErrorModal
        open={!!modalError}
        message={modalError}
        onOpenChange={(open) => {
          if (!open) setModalError('');
        }}
      />
    </div>
  );
}
