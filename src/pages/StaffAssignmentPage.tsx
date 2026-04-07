import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { staffService, type StaffMember, type StaffUser } from '@/services/staffService';
import { tournamentService } from '@/services/tournamentService';
import { Users, UserPlus, X, Shield, Gavel, QrCode, Monitor, UserCog, Stethoscope, Megaphone, Timer } from 'lucide-react';

const STAFF_ROLES = [
  { value: 'organizer', label: 'Organizer', icon: UserCog, color: 'bg-blue-100 text-blue-800' },
  { value: 'jury', label: 'Jury / Judge', icon: Gavel, color: 'bg-purple-100 text-purple-800' },
  { value: 'verification_officer', label: 'Verification Officer', icon: QrCode, color: 'bg-green-100 text-green-800' },
  { value: 'board', label: 'Board Operator', icon: Monitor, color: 'bg-slate-100 text-slate-800' },
  { value: 'coach', label: 'Coach', icon: Shield, color: 'bg-orange-100 text-orange-800' },
  { value: 'timekeeper', label: 'Timekeeper', icon: Timer, color: 'bg-cyan-100 text-cyan-800' },
  { value: 'medical', label: 'Medical Staff', icon: Stethoscope, color: 'bg-red-100 text-red-800' },
  { value: 'announcer', label: 'Announcer', icon: Megaphone, color: 'bg-yellow-100 text-yellow-800' },
];

interface Tournament { id: string; name: string; tournament_code: string; status: string }

export default function StaffAssignmentPage() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<StaffUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tournamentService.getAll().then(data => {
      setTournaments((Array.isArray(data) ? data : []) as unknown as Tournament[]);
    }).catch(() => {});
  }, []);

  const loadStaff = useCallback(async (tid: string) => {
    if (!tid) return;
    setLoading(true);
    try {
      const res = await staffService.listByTournament(tid);
      setStaff(res.data ?? []);
    } catch { toast({ title: 'Error loading staff', variant: 'destructive' }); }
    setLoading(false);
  }, [toast]);

  const loadAvailableUsers = useCallback(async () => {
    try {
      const res = await staffService.listUsersByRole('all');
      setAvailableUsers(res.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadStaff(selectedTournament);
      loadAvailableUsers();
    }
  }, [selectedTournament, loadStaff, loadAvailableUsers]);

  const handleAssign = async () => {
    if (!selectedTournament || !selectedUser || selectedRoles.length === 0) {
      toast({ title: 'Select a user and at least one role', variant: 'destructive' });
      return;
    }
    try {
      await staffService.assignStaff({
        tournamentId: selectedTournament,
        userId: selectedUser,
        roles: selectedRoles,
      });
      toast({ title: `Staff assigned with ${selectedRoles.length} role(s)` });
      setSelectedUser('');
      setSelectedRoles([]);
      loadStaff(selectedTournament);
    } catch (err) {
      toast({ title: 'Assignment failed', description: String(err), variant: 'destructive' });
    }
  };

  const handleRemove = async (userId: string, role: string) => {
    if (!selectedTournament) return;
    try {
      await staffService.removeStaff({ tournamentId: selectedTournament, userId, role });
      toast({ title: 'Staff removed' });
      loadStaff(selectedTournament);
    } catch (err) {
      toast({ title: 'Remove failed', description: String(err), variant: 'destructive' });
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const getRoleConfig = (role: string) => STAFF_ROLES.find(r => r.value === role) ?? STAFF_ROLES[0];

  // Group staff by user
  const staffByUser = staff.reduce<Record<string, StaffMember[]>>((acc, s) => {
    (acc[s.user_id] ??= []).push(s);
    return acc;
  }, {});

  return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Assignment</h1>
            <p className="text-muted-foreground">Assign staff to tournaments with multiple roles</p>
          </div>
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Tournament selector */}
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Select Tournament</label>
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a tournament..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.tournament_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedTournament && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Assign new staff */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" /> Assign Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Assign Roles</label>
                  <div className="flex flex-wrap gap-2">
                    {STAFF_ROLES.map(role => (
                      <button
                        key={role.value}
                        onClick={() => toggleRole(role.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          selectedRoles.includes(role.value)
                            ? `${role.color} border-current ring-2 ring-offset-1`
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <role.icon className="h-3.5 w-3.5" />
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleAssign} disabled={!selectedUser || selectedRoles.length === 0} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign {selectedRoles.length > 0 ? `${selectedRoles.length} Role(s)` : 'Roles'}
                </Button>
              </CardContent>
            </Card>

            {/* Right: Current staff cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Current Staff
                  <Badge variant="secondary" className="ml-auto">{Object.keys(staffByUser).length} staff</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-sm">Loading...</p>
                ) : Object.keys(staffByUser).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No staff assigned yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {Object.entries(staffByUser).map(([userId, assignments]) => {
                      const first = assignments[0];
                      return (
                        <div key={userId} className="rounded-lg border bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-medium text-sm">{first.first_name} {first.last_name}</p>
                              <p className="text-xs text-muted-foreground">{first.email}</p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {assignments.length} role{assignments.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <Separator className="mb-2" />
                          <div className="flex flex-wrap gap-1.5">
                            {assignments.map(a => {
                              const rc = getRoleConfig(a.role);
                              return (
                                <span
                                  key={a.role}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rc.color} cursor-pointer hover:opacity-80 transition-opacity`}
                                  title={`Click to remove ${rc.label}`}
                                  onClick={() => handleRemove(userId, a.role)}
                                >
                                  <rc.icon className="h-3 w-3" />
                                  {rc.label}
                                  <X className="h-2.5 w-2.5 ml-0.5" />
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}
