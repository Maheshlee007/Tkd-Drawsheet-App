import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, Users } from 'lucide-react';
import { checkinService, type VerifierStat } from '@/services/checkinService';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { useAuthStore } from '@/store/useAuthStore';

export default function VerifierStatsPage() {
  const authUser = useAuthStore((s) => s.user);
  const roles = (authUser?.roles ?? []).map(r => String(r).toLowerCase());
  const isPrivileged = roles.some(r => ['admin', 'organizer', 'manager'].includes(r));

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTid, setSelectedTid] = useState('');
  const [stats, setStats] = useState<VerifierStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    tournamentService.listTournaments({ limit: 100 }).then(setTournaments).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTid) return;
    setLoading(true);
    setError('');
    checkinService.getVerifierStats(selectedTid)
      .then(setStats)
      .catch((e: any) => setError(e.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, [selectedTid]);

  const totalCheckins = stats.reduce((s, v) => s + v.total_checkins, 0);
  const totalCollected = stats.reduce((s, v) => s + Number(v.total_collected || 0), 0);

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Verifier Statistics</h1>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label>Select Tournament</Label>
            <Select value={selectedTid} onValueChange={setSelectedTid}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Choose a tournament..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.tournament_code} — {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md">{error}</div>}

      {selectedTid && !loading && stats.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">{stats.length}</p>
                <p className="text-sm text-muted-foreground">Verifiers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">{totalCheckins}</p>
                <p className="text-sm text-muted-foreground">Total Check-ins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-green-600">₹{totalCollected.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">
                  {stats.reduce((s, v) => s + v.rejected, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" /> Per-Verifier Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Verifier</th>
                      <th className="text-center py-2 px-3">Check-ins</th>
                      <th className="text-center py-2 px-3">Completed</th>
                      <th className="text-center py-2 px-3">Pending</th>
                      <th className="text-center py-2 px-3">Rejected</th>
                      <th className="text-right py-2 px-3">Collected</th>
                      <th className="text-right py-2 px-3">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map(v => (
                      <tr key={v.verifier_id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3">
                          <div className="font-medium">{v.verifier_name}</div>
                          <div className="text-xs text-muted-foreground">{v.verifier_email}</div>
                        </td>
                        <td className="text-center py-2 px-3 font-semibold">{v.total_checkins}</td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="default" className="bg-green-600">{v.completed}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          {v.pending_payment > 0 ? <Badge variant="secondary">{v.pending_payment}</Badge> : '-'}
                        </td>
                        <td className="text-center py-2 px-3">
                          {v.rejected > 0 ? <Badge variant="destructive">{v.rejected}</Badge> : '-'}
                        </td>
                        <td className="text-right py-2 px-3 font-medium text-green-700">
                          ₹{Number(v.total_collected || 0).toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-3 text-xs text-muted-foreground">
                          {v.last_checkin ? new Date(v.last_checkin).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedTid && !loading && stats.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No check-in data found for this tournament.
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground">Loading verifier stats...</div>
      )}
    </div>
  );
}
