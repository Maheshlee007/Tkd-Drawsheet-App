import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Download, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';
import { apiRequest } from '@/services/api';
import { tournamentService } from '@/services/tournamentService';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Player {
  id: string;
  player_code: string;
  full_name: string;
  gender: string;
  date_of_birth?: string;
  age_category?: string;
  weight_kg?: number;
  weight_category?: string;
  belt_color?: string;
  phone?: string;
  email?: string;
  coach_name?: string;
  club_name?: string;
  registration_status: string;
  payment_status: string;
  events?: string[];
  created_at: string;
}

const PAYMENT_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  waived: 'bg-blue-100 text-blue-800',
};

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-slate-100 text-slate-700',
  verified: 'bg-green-100 text-green-800',
  checked_in: 'bg-blue-100 text-blue-800',
  withdrawn: 'bg-red-100 text-red-800',
  disqualified: 'bg-red-200 text-red-900',
};

export default function PlayersListPage() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string; start_date?: string }>>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAge, setFilterAge] = useState('all');

  useEffect(() => {
    tournamentService.getAll().then((data: any[]) => {
      const list = data.map((t: any) => ({ id: t.id, name: t.name || t.tournament_name }));
      setTournaments(list);
      if (list.length > 0) setSelectedTournament(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTournament) loadPlayers();
  }, [selectedTournament]);

  async function loadPlayers() {
    if (!selectedTournament) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ data: Player[] }>(`/api/players/tournament/${selectedTournament}`);
      setPlayers(res.data ?? []);
    } catch (e: any) {
      toast({ title: 'Failed to load players', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  const ageCategories = useMemo(() => {
    return Array.from(new Set(players.map(p => p.age_category).filter(Boolean)));
  }, [players]);

  const filtered = useMemo(() => players.filter(p => {
    if (filterGender !== 'all' && p.gender !== filterGender) return false;
    if (filterPayment !== 'all' && p.payment_status !== filterPayment) return false;
    if (filterStatus !== 'all' && p.registration_status !== filterStatus) return false;
    if (filterAge !== 'all' && p.age_category !== filterAge) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.player_code.toLowerCase().includes(q) ||
        (p.coach_name ?? '').toLowerCase().includes(q) ||
        (p.club_name ?? '').toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q)
      );
    }
    return true;
  }), [players, filterGender, filterPayment, filterStatus, filterAge, search]);

  // Stats
  const stats = useMemo(() => ({
    total: players.length,
    paid: players.filter(p => p.payment_status === 'paid').length,
    pending: players.filter(p => p.payment_status === 'pending').length,
    verified: players.filter(p => p.registration_status === 'verified' || p.registration_status === 'checked_in').length,
    male: players.filter(p => p.gender === 'male').length,
    female: players.filter(p => p.gender === 'female').length,
  }), [players]);

  function exportCSV() {
    const headers = ['Code', 'Name', 'Gender', 'Age Category', 'Weight', 'Belt', 'Phone', 'Coach', 'Club', 'Payment', 'Status'];
    const rows = filtered.map(p => [
      p.player_code, p.full_name, p.gender, p.age_category ?? '',
      p.weight_kg ?? '', p.belt_color ?? '', p.phone ?? '',
      p.coach_name ?? '', p.club_name ?? '', p.payment_status, p.registration_status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'players.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const tournament = tournaments.find(t => t.id === selectedTournament);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const title = tournament ? tournament.name : 'Players List';
    const dateStr = tournament?.start_date ? new Date(tournament.start_date).toLocaleDateString() : new Date().toLocaleDateString();

    // Group by category (age_category + weight_category + gender)
    type CategoryGroup = { key: string; ageCategory: string; weightCategory: string; gender: string; players: Player[] };
    const groups: CategoryGroup[] = [];
    const grouped = new Map<string, Player[]>();
    for (const p of filtered) {
      const key = `${p.age_category ?? 'Unknown'}|${p.weight_category ?? 'Unknown'}|${p.gender}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(p);
    }
    grouped.forEach((players, key) => {
      const [ageCategory, weightCategory, gender] = key.split('|');
      groups.push({ key, ageCategory, weightCategory, gender, players });
    });
    groups.sort((a, b) => a.ageCategory.localeCompare(b.ageCategory) || a.gender.localeCompare(b.gender) || a.weightCategory.localeCompare(b.weightCategory));

    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Date: ${dateStr} | Total Players: ${filtered.length}`, pageWidth / 2, 18, { align: 'center' });
    let y = 24;

    for (const grp of groups) {
      if (y > 180) { doc.addPage(); y = 12; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${grp.ageCategory} — ${grp.gender.toUpperCase()} — ${grp.weightCategory} (${grp.players.length})`, 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['#', 'Code', 'Name', 'Weight', 'Belt', 'Coach', 'Club', 'Phone', 'Payment']],
        body: grp.players.map((p, i) => [
          String(i + 1), p.player_code, p.full_name, p.weight_kg ? `${p.weight_kg} kg` : '-',
          p.belt_color ?? '-', p.coach_name ?? '-', p.club_name ?? '-', p.phone ?? '-', p.payment_status,
        ]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    }

    doc.save(`${title.replace(/\s+/g, '_')}_Players.pdf`);
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Players List</h1>
            <p className="text-sm text-muted-foreground">All registered players by tournament</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPlayers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={exportPDF} disabled={filtered.length === 0}>
            <FileText className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Tournament selector */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Tournament</Label>
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-80"><SelectValue placeholder="Select tournament..." /></SelectTrigger>
          <SelectContent>
            {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {selectedTournament && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xl font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground uppercase">Total</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xl font-bold text-blue-600">{stats.male}</p><p className="text-[10px] text-muted-foreground uppercase">Male</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xl font-bold text-pink-600">{stats.female}</p><p className="text-[10px] text-muted-foreground uppercase">Female</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xl font-bold text-green-600">{stats.paid}</p><p className="text-[10px] text-muted-foreground uppercase">Paid</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xl font-bold text-yellow-600">{stats.pending}</p><p className="text-[10px] text-muted-foreground uppercase">Pending</p></CardContent></Card>
          <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xl font-bold text-emerald-600">{stats.verified}</p><p className="text-[10px] text-muted-foreground uppercase">Verified</p></CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, code, phone, coach..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterGender} onValueChange={setFilterGender}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Gender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAge} onValueChange={setFilterAge}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Age Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {ageCategories.map(a => <SelectItem key={a} value={a!}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Players Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Players
          </CardTitle>
          <CardDescription>Showing {filtered.length} of {players.length} players</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !selectedTournament ? (
            <div className="text-center py-12 text-muted-foreground">Select a tournament to view players</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Belt</TableHead>
                    <TableHead>Coach / Club</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(player => (
                    <TableRow key={player.id}>
                      <TableCell className="font-mono text-xs">{player.player_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{player.full_name}</p>
                          {player.phone && <p className="text-xs text-muted-foreground">{player.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{player.gender}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{player.age_category ?? '-'}</p>
                          {player.weight_category && <p className="text-xs text-muted-foreground">{player.weight_category}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{player.weight_kg ? `${player.weight_kg} kg` : '-'}</TableCell>
                      <TableCell className="capitalize">{player.belt_color ?? '-'}</TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {player.coach_name && <p>{player.coach_name}</p>}
                          {player.club_name && <p className="text-xs text-muted-foreground">{player.club_name}</p>}
                          {!player.coach_name && !player.club_name && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] capitalize ${PAYMENT_COLORS[player.payment_status] ?? ''}`}>
                          {player.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] capitalize ${STATUS_COLORS[player.registration_status] ?? ''}`}>
                          {player.registration_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && players.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No players match the current filters</TableCell>
                    </TableRow>
                  )}
                  {players.length === 0 && selectedTournament && !loading && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No players registered for this tournament yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

