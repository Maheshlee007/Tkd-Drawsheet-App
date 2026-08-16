import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { staffService } from '@/services/staffService';
import { apiRequest } from '@/services/api';
import {
  Trophy, Plus, Edit, MapPin, Calendar, Users, Search,
  Building2, Phone, Mail, Shield, CheckCircle, Clock, XCircle, X,
  Copy, Link2, Eye, EyeOff,
} from 'lucide-react';

const STATUSES = ['draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled'];
/** Only these statuses may be set at creation time; everything else goes through the detail panel transitions */
const CREATE_STATUSES = ['draft', 'published', 'registration_open'];
const ASSOCIATION_TYPES = ['Association', 'WT', 'SGFI', 'University', 'National', 'Club', 'Other'];

/** Sensible default fee per event type for a brand-new tournament */
const DEFAULT_EVENT_FEES: Record<string, number> = {
  kyorugi: 500, poomsae: 400, poomsae_pair: 600, poomsae_group: 800, freestyle_poomsae: 500,
};

interface EventTypeRow { code: string; name: string; sort_order?: number }
interface EventFeeFormRow { enabled: boolean; fee: string }

/** ISO date-time → value for <input type="datetime-local"> in the user's local timezone */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local input value → ISO string for the API */
function localInputToIso(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  draft: { color: 'bg-slate-100 text-slate-700', icon: Clock, label: 'Draft (Not visible)' },
  published: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Published' },
  registration_open: { color: 'bg-green-100 text-green-800', icon: Users, label: 'Registration Open' },
  registration_closed: { color: 'bg-orange-100 text-orange-800', icon: Clock, label: 'Registration Closed' },
  in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'In Progress' },
  completed: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
};

interface FormData {
  name: string;
  description: string;
  registrationInstructions: string;
  playerFormLinks: string;
  coachFormLinks: string;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  lateRegistrationCloseAt: string;
  lateFeeAmount: string;
  lateFeeMode: 'flat' | 'per_event';
  requireEmailVerification: boolean;
  status: string;
  entryFee: string;
  maxParticipants: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  associationType: string;
}

const emptyForm: FormData = {
  name: '', description: '', registrationInstructions: '', playerFormLinks: '', coachFormLinks: '', venue: '', city: '', state: '',
  startDate: '', endDate: '', registrationDeadline: '',
  registrationOpenAt: '', registrationCloseAt: '', lateRegistrationCloseAt: '',
  lateFeeAmount: '0', lateFeeMode: 'flat',
  // DB default is false — the UI deliberately opts new tournaments in
  requireEmailVerification: true,
  status: 'draft',
  entryFee: '500', maxParticipants: '200',
  organizerName: '', organizerEmail: '', organizerPhone: '',
  associationType: 'Association',
};

function parseLinks(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function joinLinks(list?: string[]): string {
  return (list ?? []).join('\n');
}

export default function AdminTournamentPage() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Event fees grid (Create/Edit dialog)
  const [eventTypes, setEventTypes] = useState<EventTypeRow[]>([]);
  const [eventFeeRows, setEventFeeRows] = useState<Record<string, EventFeeFormRow>>({});
  // Only PUT event fees on edit when the existing rows loaded — never wipe config blindly
  const [feesLoaded, setFeesLoaded] = useState(false);

  // Detail view
  const [detailTournament, setDetailTournament] = useState<Tournament | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Organizer assignment
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTid, setAssignTid] = useState('');
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; email: string; first_name: string; last_name: string }>>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignTab, setAssignTab] = useState<'existing' | 'create'>('existing');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [newOrg, setNewOrg] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [showOrgPassword, setShowOrgPassword] = useState(false);
  const [orgConflict, setOrgConflict] = useState<{ message: string; existingUserId?: string } | null>(null);

  useEffect(() => { loadTournaments(); }, []);

  async function loadTournaments() {
    setLoading(true);
    try {
      const list = await tournamentService.listTournaments({ limit: 200 });
      setTournaments(list);
    } catch (e: any) {
      toast({ title: 'Failed to load tournaments', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  const years = Array.from(new Set(tournaments.map(t => new Date(t.start_date).getFullYear()))).sort((a, b) => b - a);

  const filtered = tournaments.filter(t => {
    if (filterYear !== 'all' && new Date(t.start_date).getFullYear() !== parseInt(filterYear)) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.tournament_code.toLowerCase().includes(q)
        || (t.city ?? '').toLowerCase().includes(q) || (t.organizer_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  /** Fetch (and cache) the canonical event-type list from the public endpoint */
  async function fetchEventTypes(): Promise<EventTypeRow[]> {
    if (eventTypes.length) return eventTypes;
    const res = await apiRequest<{ data: EventTypeRow[] }>('/api/event-types', { skipAuth: true });
    const list = res.data ?? [];
    setEventTypes(list);
    return list;
  }

  async function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setEventFeeRows({});
    setFeesLoaded(false);
    setDialogOpen(true);
    try {
      const types = await fetchEventTypes();
      const rows: Record<string, EventFeeFormRow> = {};
      for (const et of types) {
        const isKyorugi = et.code === 'kyorugi';
        const fallback = DEFAULT_EVENT_FEES[et.code] ?? 500;
        rows[et.code] = {
          enabled: isKyorugi,
          fee: String(isKyorugi ? (parseFloat(emptyForm.entryFee) || fallback) : fallback),
        };
      }
      setEventFeeRows(rows);
      setFeesLoaded(true);
    } catch { /* event types unavailable — create proceeds without eventFees */ }
  }

  async function openEdit(t: Tournament) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || '',
      registrationInstructions: t.registration_instructions || '',
      playerFormLinks: joinLinks(t.player_form_links),
      coachFormLinks: joinLinks(t.coach_form_links),
      venue: t.venue || '',
      city: t.city || '', state: t.state || '',
      startDate: t.start_date?.slice(0, 10) || '', endDate: t.end_date?.slice(0, 10) || '',
      registrationDeadline: t.registration_deadline?.slice(0, 10) || '',
      registrationOpenAt: isoToLocalInput(t.registration_open_at),
      registrationCloseAt: isoToLocalInput(t.registration_close_at),
      lateRegistrationCloseAt: isoToLocalInput(t.late_registration_close_at),
      lateFeeAmount: String(parseFloat(String(t.late_fee_amount ?? 0)) || 0),
      lateFeeMode: t.late_fee_mode === 'per_event' ? 'per_event' : 'flat',
      requireEmailVerification: !!t.require_email_verification,
      status: t.status,
      entryFee: String(t.entry_fee || 500), maxParticipants: String(t.max_participants || 200),
      organizerName: t.organizer_name || '', organizerEmail: t.organizer_email || '',
      organizerPhone: t.organizer_phone || '', associationType: t.association_type || 'WT',
    });
    setEventFeeRows({});
    setFeesLoaded(false);
    setDialogOpen(true);
    try {
      const [types, existing] = await Promise.all([fetchEventTypes(), tournamentService.getEventFees(t.id)]);
      const rows: Record<string, EventFeeFormRow> = {};
      for (const et of types) {
        const fallback = et.code === 'kyorugi' ? (t.entry_fee || DEFAULT_EVENT_FEES.kyorugi) : (DEFAULT_EVENT_FEES[et.code] ?? 500);
        rows[et.code] = { enabled: false, fee: String(fallback) };
      }
      for (const row of existing) {
        rows[row.event_type] = { enabled: row.is_enabled, fee: String(parseFloat(String(row.fee_amount)) || 0) };
      }
      setEventFeeRows(rows);
      setFeesLoaded(true);
    } catch { /* leave feesLoaded false — save will skip putEventFees to avoid wiping config */ }
  }

  async function handleSave() {
    if (!form.name || !form.startDate || !form.endDate) {
      toast({ title: 'Name, start date, and end date are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Enabled event-fee rows only — putEventFees is a full replace (omitted events become disabled)
      const enabledEventFees = eventTypes
        .filter(et => eventFeeRows[et.code]?.enabled)
        .map(et => ({
          eventType: et.code,
          fee: parseFloat(eventFeeRows[et.code].fee) || 0,
          isEnabled: true,
          ...(et.sort_order != null ? { sortOrder: et.sort_order } : {}),
        }));

      const payload = {
        name: form.name, description: form.description || undefined,
        registrationInstructions: form.registrationInstructions || undefined,
        playerFormLinks: parseLinks(form.playerFormLinks),
        coachFormLinks: parseLinks(form.coachFormLinks),
        venue: form.venue || undefined, city: form.city || undefined, state: form.state || undefined,
        startDate: form.startDate, endDate: form.endDate,
        // Legacy deadline auto-mirrors into registrationCloseAt server-side — only send it when no explicit close time
        registrationDeadline: form.registrationCloseAt ? undefined : (form.registrationDeadline || undefined),
        registrationOpenAt: localInputToIso(form.registrationOpenAt),
        registrationCloseAt: localInputToIso(form.registrationCloseAt),
        lateRegistrationCloseAt: localInputToIso(form.lateRegistrationCloseAt),
        lateFeeAmount: parseFloat(form.lateFeeAmount) || 0,
        lateFeeMode: form.lateFeeMode,
        requireEmailVerification: form.requireEmailVerification,
        entryFee: parseFloat(form.entryFee) || 0,
        maxParticipants: parseInt(form.maxParticipants) || undefined,
        organizerName: form.organizerName || undefined,
        organizerEmail: form.organizerEmail || undefined,
        organizerPhone: form.organizerPhone || undefined,
        associationType: form.associationType || undefined,
      };
      if (editingId) {
        await tournamentService.updateTournament(editingId, payload);
        let feeError: string | null = null;
        if (feesLoaded) {
          try {
            await tournamentService.putEventFees(editingId, enabledEventFees);
          } catch (feeErr: any) {
            feeError = feeErr.message;
          }
        }
        if (feeError) {
          toast({ title: 'Tournament updated, but event fees failed to save', description: feeError, variant: 'destructive' });
        } else {
          toast({ title: 'Tournament updated' });
        }
      } else {
        const created = await tournamentService.createTournament({
          ...payload,
          status: form.status,
          ...(feesLoaded && enabledEventFees.length ? { eventFees: enabledEventFees } : {}),
        });
        toast({ title: 'Tournament created' });
        setDialogOpen(false);
        await loadTournaments();
        // Prompt organizer assignment right after creation
        if (created?.id) {
          openAssign(created.id);
        }
        setSaving(false);
        return;
      }
      setDialogOpen(false);
      await loadTournaments();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  }

  async function handleStatusChange(tid: string, newStatus: string) {
    try {
      await tournamentService.updateStatus(tid, newStatus);
      toast({ title: `Status updated to ${newStatus}` });
      await loadTournaments();
    } catch (e: any) {
      // 409 = illegal transition; server sends { message, data: { from, to, allowed[] } }
      const allowed = e?.details?.data?.allowed;
      if (e?.status === 409 && Array.isArray(allowed)) {
        toast({
          title: 'Status change not allowed',
          description: `${e.message} Allowed: ${allowed.length ? allowed.join(', ') : 'none'}`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Status update failed', description: e.message, variant: 'destructive' });
      }
    }
  }

  const [currentOrganizer, setCurrentOrganizer] = useState<string | null>(null);

  async function loadAssignUsers(all: boolean) {
    try {
      const res = await staffService.listUsersByRole(all ? 'all' : 'organizer');
      setAvailableUsers(res.data ?? []);
    } catch {
      setAvailableUsers([]);
    }
  }

  async function openAssign(tid: string) {
    setAssignTid(tid);
    setSelectedOrganizer('');
    setCurrentOrganizer(null);
    setAssignTab('existing');
    setShowAllUsers(false);
    setNewOrg({ fullName: '', email: '', password: '', phone: '' });
    setShowOrgPassword(false);
    setOrgConflict(null);
    setAssignOpen(true);
    loadAssignUsers(false);
    try {
      // Load current assigned staff for this tournament to show existing organizer
      const staffRes = await staffService.listByTournament(tid);
      const orgAssignment = (staffRes.data ?? []).find((s: any) => s.role === 'organizer');
      if (orgAssignment) {
        setCurrentOrganizer(`${orgAssignment.first_name} ${orgAssignment.last_name} (${orgAssignment.email})`);
      }
    } catch { /* ignore */ }
  }

  async function handleAssignOrganizer() {
    if (!selectedOrganizer || !assignTid) return;
    setAssigning(true);
    try {
      await tournamentService.createOrganizer(assignTid, { userId: selectedOrganizer });
      toast({ title: 'Organizer assigned to tournament' });
      setAssignOpen(false);
    } catch (e: any) {
      toast({ title: 'Assignment failed', description: e.message, variant: 'destructive' });
    }
    setAssigning(false);
  }

  async function handleCreateOrganizer() {
    if (!newOrg.fullName || !newOrg.email || !newOrg.password || !assignTid) return;
    setAssigning(true);
    setOrgConflict(null);
    try {
      await tournamentService.createOrganizer(assignTid, {
        email: newOrg.email,
        fullName: newOrg.fullName,
        password: newOrg.password,
        phone: newOrg.phone || undefined,
      });
      toast({ title: 'Organizer created and assigned to tournament' });
      setAssignOpen(false);
    } catch (e: any) {
      const existingUserId = e?.details?.data?.existingUserId ?? e?.data?.existingUserId;
      if (e?.status === 409 || existingUserId || /already exists/i.test(e?.message ?? '')) {
        setOrgConflict({ message: e.message, existingUserId });
      } else {
        toast({ title: 'Failed to create organizer', description: e.message, variant: 'destructive' });
      }
    }
    setAssigning(false);
  }

  async function handleAttachExisting(userId: string) {
    setAssigning(true);
    try {
      await tournamentService.createOrganizer(assignTid, { userId });
      toast({ title: 'Existing user attached as organizer' });
      setOrgConflict(null);
      setAssignOpen(false);
    } catch (e: any) {
      toast({ title: 'Assignment failed', description: e.message, variant: 'destructive' });
    }
    setAssigning(false);
  }

  async function openDetail(t: Tournament) {
    try {
      const detail = await tournamentService.getTournament(t.id);
      setDetailTournament(detail);
      setDetailOpen(true);
    } catch {
      setDetailTournament(t);
      setDetailOpen(true);
    }
  }

  const f = (d: string | null) => d ? new Date(d).toLocaleDateString() : '-';
  const sc = (s: string) => statusConfig[s] ?? statusConfig.draft;
  const anyEventFeeEnabled = Object.values(eventFeeRows).some(r => r.enabled);

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6" /> Tournament Management</h1>
          <p className="text-muted-foreground">Create, manage, and assign tournaments to organizers</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Create Tournament</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['draft', 'registration_open', 'in_progress', 'completed', 'cancelled'] as const).map(s => {
          const count = tournaments.filter(t => t.status === s).length;
          const { color } = sc(s);
          return (
            <Card key={s}>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <Badge variant="secondary" className={`${color} mt-1 capitalize`}>{s.replace('_', ' ')}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, code, city, organizer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tournament Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tournaments ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Venue / City</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Association</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => {
                    const { color } = sc(t.status);
                    const isActiveTournament = ['registration_open', 'in_progress'].includes(t.status);
                    return (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(t)}>
                        <TableCell className="font-mono text-xs">{t.tournament_code}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{t.name}</TableCell>
                        <TableCell className="text-sm">
                          {t.venue && <span className="block truncate max-w-[150px]">{t.venue}</span>}
                          <span className="text-muted-foreground">{[t.city, t.state].filter(Boolean).join(', ')}</span>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{f(t.start_date)} — {f(t.end_date)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{t.association_type || '-'}</Badge></TableCell>
                        <TableCell className="text-sm">{t.organizer_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${isActiveTournament ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <Badge className={`${color} capitalize text-xs`}>{t.status.replace('_', ' ')}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Edit className="h-3 w-3" /></Button>
                            <Button variant="outline" size="sm" onClick={() => openAssign(t.id)}>
                              <Users className="h-3 w-3 mr-1" /> Assign
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tournaments found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Tournament' : 'Create Tournament'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Tournament Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. State Championship 2026" />
            </div>
            {!editingId && (
              <div>
                <Label>Initial Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREATE_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{statusConfig[s]?.label || s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Further status transitions are made from the tournament detail panel.</p>
              </div>
            )}
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Registration Instructions</Label>
              <Textarea
                value={form.registrationInstructions}
                onChange={e => setForm({ ...form, registrationInstructions: e.target.value })}
                placeholder="Show important registration instructions for this tournament"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Player Form Links (one URL per line)</Label>
                <Textarea
                  value={form.playerFormLinks}
                  onChange={e => setForm({ ...form, playerFormLinks: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Coach Form Links (one URL per line)</Label>
                <Textarea
                  value={form.coachFormLinks}
                  onChange={e => setForm({ ...form, coachFormLinks: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  rows={3}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Venue</Label><Input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Indoor Stadium" /></div>
              <div><Label>City / District</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>State</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
              <div>
                <Label>Association Type *</Label>
                <Select value={form.associationType} onValueChange={v => setForm({ ...form, associationType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSOCIATION_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <Separator />
            <p className="text-sm font-medium">Registration Window</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Registration opens at</Label>
                <Input type="datetime-local" value={form.registrationOpenAt} onChange={e => setForm({ ...form, registrationOpenAt: e.target.value })} />
              </div>
              <div>
                <Label>Registration closes at</Label>
                <Input id="registrationCloseAt" type="datetime-local" value={form.registrationCloseAt} onChange={e => setForm({ ...form, registrationCloseAt: e.target.value })} />
              </div>
            </div>
            {!form.registrationCloseAt && (
              <div>
                <Label>Deadline (legacy — sets close time to end of that day)</Label>
                <Input id="registrationDeadline" type="date" value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Late registration until (optional)</Label>
                <Input type="datetime-local" value={form.lateRegistrationCloseAt} onChange={e => setForm({ ...form, lateRegistrationCloseAt: e.target.value })} />
              </div>
              <div>
                <Label>Late fee (₹)</Label>
                <Input type="number" value={form.lateFeeAmount} onChange={e => setForm({ ...form, lateFeeAmount: e.target.value })} />
              </div>
              <div>
                <Label>Late fee mode</Label>
                <Select value={form.lateFeeMode} onValueChange={v => setForm({ ...form, lateFeeMode: v as 'flat' | 'per_event' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="per_event">Per event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!form.lateRegistrationCloseAt && (
              <p className="text-xs text-muted-foreground">Late fee only applies when "Late registration until" is set.</p>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="require-email-verification"
                checked={form.requireEmailVerification}
                onCheckedChange={c => setForm({ ...form, requireEmailVerification: c === true })}
              />
              <Label htmlFor="require-email-verification" className="font-normal">Require email verification (player registrations)</Label>
            </div>
            <Separator />
            <p className="text-sm font-medium">Event Fees</p>
            {eventTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Loading event types…</p>
            ) : (
              <div className="space-y-2">
                {eventTypes.map(et => {
                  const row = eventFeeRows[et.code] ?? { enabled: false, fee: String(DEFAULT_EVENT_FEES[et.code] ?? 500) };
                  return (
                    <div key={et.code} className="flex items-center gap-3">
                      <Checkbox
                        id={`event-fee-${et.code}`}
                        checked={row.enabled}
                        onCheckedChange={c => setEventFeeRows({ ...eventFeeRows, [et.code]: { ...row, enabled: c === true } })}
                      />
                      <Label htmlFor={`event-fee-${et.code}`} className="flex-1 font-normal">{et.name}</Label>
                      <Input
                        type="number"
                        className="w-28"
                        value={row.fee}
                        disabled={!row.enabled}
                        onChange={e => setEventFeeRows({ ...eventFeeRows, [et.code]: { ...row, fee: e.target.value } })}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className={anyEventFeeEnabled ? 'opacity-50' : ''}>
                <Label>Legacy entry fee (fallback) (₹)</Label>
                <Input type="number" value={form.entryFee} onChange={e => setForm({ ...form, entryFee: e.target.value })} />
              </div>
              <div><Label>Max Participants</Label><Input type="number" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })} /></div>
            </div>
            <Separator />
            <p className="text-sm font-medium">Organizer Details</p>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Organizer Name</Label><Input value={form.organizerName} onChange={e => setForm({ ...form, organizerName: e.target.value })} /></div>
              <div><Label>Organizer Email</Label><Input type="email" value={form.organizerEmail} onChange={e => setForm({ ...form, organizerEmail: e.target.value })} /></div>
              <div><Label>Organizer Phone</Label><Input value={form.organizerPhone} onChange={e => setForm({ ...form, organizerPhone: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet (aside drawer) */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center justify-between">
              <span>{detailTournament?.name}</span>
            </SheetTitle>
          </SheetHeader>
          {detailTournament && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">{detailTournament.tournament_code}</Badge>
                <Badge className={sc(detailTournament.status).color + ' capitalize'}>{detailTournament.status.replace('_', ' ')}</Badge>
                {detailTournament.association_type && <Badge variant="secondary">{detailTournament.association_type}</Badge>}
              </div>
              {detailTournament.description && <p className="text-muted-foreground">{detailTournament.description}</p>}
              {detailTournament.registration_instructions && (
                <div className="rounded-md border bg-slate-50 p-3 text-xs whitespace-pre-line">
                  {detailTournament.registration_instructions}
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Location</div>
                <span>{[detailTournament.venue, detailTournament.city, detailTournament.state].filter(Boolean).join(', ') || '-'}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Dates</div>
                <span>{f(detailTournament.start_date)} — {f(detailTournament.end_date)}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Deadline</div>
                <span>{f(detailTournament.registration_deadline)}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-3.5 w-3.5" /> Max</div>
                <span>{detailTournament.max_participants ?? 'No limit'}</span>
                <div className="text-muted-foreground">Entry Fee</div>
                <span>₹{detailTournament.entry_fee}</span>
              </div>
              <Separator />
              <p className="font-medium">Organizer</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-3.5 w-3.5" /> Name</div>
                <span>{detailTournament.organizer_name || '-'}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</div>
                <span>{detailTournament.organizer_email || '-'}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Phone</div>
                <span>{detailTournament.organizer_phone || '-'}</span>
              </div>
              {detailTournament.stats && <>
                <Separator />
                <p className="font-medium">Stats</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold">{detailTournament.stats.total_players ?? 0}</p><p className="text-xs text-muted-foreground">Players</p></div>
                  <div><p className="text-lg font-bold">{detailTournament.stats.active_categories ?? 0}</p><p className="text-xs text-muted-foreground">Categories</p></div>
                  <div><p className="text-lg font-bold">{detailTournament.stats.total_matches ?? 0}</p><p className="text-xs text-muted-foreground">Matches</p></div>
                </div>
              </>}
              <Separator />
              <p className="font-medium flex items-center gap-2"><Link2 className="h-4 w-4" /> Registration Links</p>
              <div className="space-y-2">
                {([
                  { label: 'Player Registration', path: `/register/${detailTournament.tournament_code}` },
                  { label: 'Coach Registration', path: `/coach-register/${detailTournament.tournament_code}` },
                ] as const).map(({ label, path }) => {
                  const url = `${window.location.origin}${path}`;
                  return (
                    <div key={path} className="rounded-lg border bg-slate-50 p-2">
                      <p className="text-xs font-medium mb-1 text-slate-600">{label}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs flex-1 truncate font-mono text-muted-foreground">{url}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(url); toast({ title: `${label} link copied!` }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!!detailTournament.player_form_links?.length && (
                <>
                  <Separator />
                  <p className="font-medium">Player Forms</p>
                  <div className="space-y-1.5">
                    {detailTournament.player_form_links.map((url, idx) => (
                      <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline break-all">
                        {url}
                      </a>
                    ))}
                  </div>
                </>
              )}
              {!!detailTournament.coach_form_links?.length && (
                <>
                  <Separator />
                  <p className="font-medium">Coach Forms</p>
                  <div className="space-y-1.5">
                    {detailTournament.coach_form_links.map((url, idx) => (
                      <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline break-all">
                        {url}
                      </a>
                    ))}
                  </div>
                </>
              )}
              <Separator />
              <p className="font-medium">Change Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <Button key={s} size="sm" variant={detailTournament.status === s ? 'default' : 'outline'}
                    onClick={() => { handleStatusChange(detailTournament.id, s); setDetailOpen(false); }}
                    disabled={detailTournament.status === s} className="text-xs">
                    {statusConfig[s]?.label || s.replace('_', ' ')}
                  </Button>
                ))}
              </div>
              <Separator />
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => { openEdit(detailTournament); setDetailOpen(false); }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { openAssign(detailTournament.id); setDetailOpen(false); }}>
                  <Users className="h-4 w-4 mr-2" /> Assign Organizer
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  openEdit(detailTournament);
                  setDetailOpen(false);
                  // Focus the close-time field (or the legacy deadline field when no close time set) after dialog opens
                  setTimeout(() => (document.getElementById('registrationCloseAt') ?? document.getElementById('registrationDeadline'))?.focus(), 300);
                }}>
                  <Calendar className="h-4 w-4 mr-2" /> Extend Deadline
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Organizer Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Organizer</DialogTitle></DialogHeader>
          <div className="py-2 space-y-4">
            {currentOrganizer && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs text-blue-600 font-medium">Currently Assigned</p>
                <p className="text-sm font-medium text-blue-900">{currentOrganizer}</p>
              </div>
            )}
            <Tabs value={assignTab} onValueChange={v => setAssignTab(v as 'existing' | 'create')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing user</TabsTrigger>
                <TabsTrigger value="create">Create new organizer</TabsTrigger>
              </TabsList>
              <TabsContent value="existing" className="space-y-4 pt-2">
                <div>
                  <Label>Select User to assign as Organizer</Label>
                  <Select value={selectedOrganizer} onValueChange={setSelectedOrganizer}>
                    <SelectTrigger><SelectValue placeholder="Choose user..." /></SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {showAllUsers ? 'No users found.' : 'No organizer-role users found — try "Show all users".'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-all-users"
                    checked={showAllUsers}
                    onCheckedChange={c => {
                      const v = c === true;
                      setShowAllUsers(v);
                      setSelectedOrganizer('');
                      loadAssignUsers(v);
                    }}
                  />
                  <Label htmlFor="show-all-users" className="text-xs font-normal">Show all users (not just organizers)</Label>
                </div>
              </TabsContent>
              <TabsContent value="create" className="space-y-3 pt-2">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={newOrg.fullName} onChange={e => setNewOrg({ ...newOrg, fullName: e.target.value })} placeholder="e.g. Ravi Kumar" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={newOrg.email} onChange={e => setNewOrg({ ...newOrg, email: e.target.value })} placeholder="organizer@example.com" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showOrgPassword ? 'text' : 'password'}
                      value={newOrg.password}
                      onChange={e => setNewOrg({ ...newOrg, password: e.target.value })}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowOrgPassword(s => !s)}
                      aria-label={showOrgPassword ? 'Hide password' : 'Show password'}
                    >
                      {showOrgPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={newOrg.phone} onChange={e => setNewOrg({ ...newOrg, phone: e.target.value })} />
                </div>
                {orgConflict && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                    <p className="text-sm text-amber-900">{orgConflict.message}</p>
                    {orgConflict.existingUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={assigning}
                        onClick={() => handleAttachExisting(orgConflict.existingUserId!)}
                      >
                        Attach the existing user instead
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            {assignTab === 'existing' ? (
              <Button onClick={handleAssignOrganizer} disabled={assigning || !selectedOrganizer}>
                {assigning ? 'Assigning...' : 'Assign Organizer'}
              </Button>
            ) : (
              <Button onClick={handleCreateOrganizer} disabled={assigning || !newOrg.fullName || !newOrg.email || !newOrg.password}>
                {assigning ? 'Working...' : 'Create & Assign'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
