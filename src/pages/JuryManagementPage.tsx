import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Plus, Copy, CheckCircle, Users, Eye, EyeOff, ListChecks } from 'lucide-react';
import { judgeService, type JuryMember } from '@/services/judgeService';
import { tournamentService } from '@/services/tournamentService';
import { dashboardService } from '@/services/dashboardService';
import JuryCategoryAssignDialog from '@/components/JuryCategoryAssignDialog';

export default function JuryManagementPage() {
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string; judgeCount?: number }>>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [judges, setJudges] = useState<JuryMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [creating, setCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createdJury, setCreatedJury] = useState<{ juryCode: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Category assignment dialog
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignJudge, setAssignJudge] = useState<JuryMember | null>(null);

  useEffect(() => {
    tournamentService.getAll().then(async (data: any[]) => {
      const list = data.map((t: any) => ({ id: t.id, name: t.name || t.tournament_name }));
      setTournaments(list);
      if (list.length > 0) {
        setSelectedTournament(list[0].id);
        // Load judge counts for all tournaments
        const counts = await Promise.all(
          list.map((t: any) => judgeService.listByTournament(t.id).then(j => ({ id: t.id, count: j.length })).catch(() => ({ id: t.id, count: 0 })))
        );
        setTournaments(list.map((t: any) => ({
          ...t,
          judgeCount: counts.find(c => c.id === t.id)?.count ?? 0,
        })));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadJudges();
      loadAssignmentCounts();
    }
  }, [selectedTournament]);

  async function loadJudges() {
    setLoading(true);
    try {
      const data = await judgeService.listByTournament(selectedTournament);
      setJudges(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignmentCounts() {
    try {
      const res = await dashboardService.getJudgeAssignments(selectedTournament);
      const counts: Record<string, number> = {};
      for (const row of (res.data ?? []) as Array<{ judge_id: string; total_assigned: number | string }>) {
        counts[row.judge_id] = Number(row.total_assigned) || 0;
      }
      setAssignmentCounts(counts);
    } catch {
      // Workload summary is informational — don't block the page on it
      setAssignmentCounts({});
    }
  }

  function openAssignDialog(judge: JuryMember) {
    setAssignJudge(judge);
    setAssignOpen(true);
  }

  async function handleCreate() {
    if (!createForm.email || !createForm.password || !createForm.firstName) return;
    setCreating(true);
    setError('');
    try {
      const jury = await judgeService.createJury({
        ...createForm,
        tournamentId: selectedTournament,
      });
      // Backend returns { juryCode } (camelCase); JuryMember rows use jury_code
      setCreatedJury({ juryCode: (jury as any).juryCode ?? jury.jury_code });
      setCreateForm({ email: '', password: '', firstName: '', lastName: '' });
      setShowCreatePassword(false);
      await loadJudges();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Jury Management</h1>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreatedJury(null); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Jury Member
        </Button>
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}

      {/* Tournament selector */}
      <div>
        <Label>Tournament</Label>
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[360px]"><SelectValue placeholder="Select tournament" /></SelectTrigger>
          <SelectContent>
            {tournaments.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  {t.name}
                  {t.judgeCount !== undefined && (
                    <Badge variant="secondary" className="ml-auto text-[10px] font-normal">
                      <Users className="h-2.5 w-2.5 mr-0.5" />{t.judgeCount}
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Judges table */}
      <Card>
        <CardHeader>
          <CardTitle>Jury Members</CardTitle>
          <CardDescription>{judges.length} jury members for this tournament</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Jury Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {judges.map(judge => (
                  <TableRow key={judge.id}>
                    <TableCell className="font-medium">{judge.first_name} {judge.last_name}</TableCell>
                    <TableCell className="text-sm">{judge.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono">{judge.jury_code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(judge.jury_code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={judge.is_active ? 'default' : 'secondary'}>
                        {judge.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <ListChecks className="h-3 w-3 mr-1" />
                        {assignmentCounts[judge.user_id] ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(judge)}>
                        <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                        Assign Categories
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {judges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No jury members for this tournament
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Jury Member</DialogTitle>
          </DialogHeader>

          {createdJury ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-medium">Jury member created!</p>
              <p className="text-sm text-muted-foreground">Jury login code:</p>
              <div className="bg-slate-100 rounded-lg p-4 flex items-center justify-center gap-2">
                <code className="text-2xl font-mono font-bold">{createdJury.juryCode}</code>
                <Button variant="ghost" size="icon" onClick={() => copyCode(createdJury.juryCode)}>
                  {copiedCode ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Share this code with the jury member. They log in at /jury with just this code.</p>
              <Button onClick={() => setCreateOpen(false)}>Done</Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input value={createForm.firstName} onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })} />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={createForm.lastName} onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} />
                </div>
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showCreatePassword ? 'text' : 'password'}
                      value={createForm.password}
                      onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign categories dialog */}
      <JuryCategoryAssignDialog
        judge={assignJudge}
        tournamentId={selectedTournament}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onSaved={() => void loadAssignmentCounts()}
      />
    </div>
  );
}
