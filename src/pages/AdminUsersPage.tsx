import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { UserCog, Search, UserPlus, CheckCircle, XCircle, Shield, Eye, EyeOff, X, Users, ShieldCheck, ChevronsUpDown, ChevronDown } from 'lucide-react';
import { adminService, type StaffUser, type RoleInfo } from '@/services/adminService';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  organizer: 'bg-blue-100 text-blue-800 border-blue-200',
  coach: 'bg-green-100 text-green-800 border-green-200',
  jury: 'bg-purple-100 text-purple-800 border-purple-200',
  verification_officer: 'bg-amber-100 text-amber-800 border-amber-200',
  board: 'bg-slate-100 text-slate-700 border-slate-200',
  player: 'bg-teal-100 text-teal-800 border-teal-200',
};

// ── Multi-select Role Dropdown ──────────────────────────────
function RoleMultiSelect({
  value,
  onChange,
  options,
  roleColors,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  roleColors: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]"
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground">Select roles…</span>
          ) : (
            value.map(r => (
              <Badge key={r} variant="outline" className={`text-[10px] capitalize border ${roleColors[r] ?? ''}`}>
                {r.replace(/_/g, ' ')}
                <button
                  type="button"
                  className="ml-1 hover:text-destructive"
                  onClick={e => { e.stopPropagation(); onChange(value.filter(v => v !== r)); }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="max-h-60 overflow-auto p-1">
            {options.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => onChange(value.includes(r) ? value.filter(v => v !== r) : [...value, r])}
                className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox checked={value.includes(r)} className="pointer-events-none" />
                <span className="capitalize">{r.replace(/_/g, ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', roles: [] as string[] });
  const [creating, setCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Role management dialog
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<StaffUser | null>(null);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  // User detail dialog
  const [detailUser, setDetailUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        adminService.getUsers(),
        adminService.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (e: any) {
      toast({ title: 'Failed to load data', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  const roleNames = useMemo(() => roles.map(r => r.name), [roles]);

  const filtered = useMemo(() => users.filter(u => {
    const uRoles = u.roles ?? [];
    if (filterRole !== 'all' && !uRoles.includes(filterRole)) return false;
    if (filterStatus === 'active' && !u.is_active) return false;
    if (filterStatus === 'inactive' && u.is_active) return false;
    if (filterStatus === 'no_role' && uRoles.length > 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        uRoles.some(r => r.toLowerCase().includes(q))
      );
    }
    return true;
  }), [users, search, filterRole, filterStatus]);

  // Role counts for stats
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of roleNames) counts[r] = 0;
    for (const u of users) {
      for (const r of u.roles ?? []) {
        counts[r] = (counts[r] ?? 0) + 1;
      }
    }
    return counts;
  }, [users, roleNames]);

  // ── Create user ──
  async function handleCreateUser() {
    if (!createForm.email || !createForm.password || !createForm.firstName) return;
    setCreating(true);
    try {
      // Create user then assign each selected role
      await adminService.createUser({
        email: createForm.email,
        password: createForm.password,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        phone: createForm.phone,
      });
      // Reload to get user ID, then assign roles
      const refreshed = await adminService.getUsers();
      const created = refreshed.find(u => u.email === createForm.email.toLowerCase());
      if (created && createForm.roles.length > 0) {
        for (const role of createForm.roles) {
          await adminService.assignRole(created.id, role);
        }
      }
      setCreateOpen(false);
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', phone: '', roles: [] });
      setShowCreatePassword(false);
      await loadData();
      toast({ title: 'User created' });
    } catch (e: any) {
      toast({ title: 'Failed to create user', description: e.message, variant: 'destructive' });
    }
    setCreating(false);
  }

  // ── Role management ──
  function openRoleDialog(user: StaffUser) {
    setRoleUser(user);
    setPendingRoles([...(user.roles ?? [])]);
    setRoleOpen(true);
  }

  function togglePendingRole(role: string) {
    setPendingRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }

  async function saveRoles() {
    if (!roleUser) return;
    setSavingRoles(true);
    try {
      const current = roleUser.roles ?? [];
      const toAdd = pendingRoles.filter(r => !current.includes(r));
      const toRemove = current.filter(r => !pendingRoles.includes(r));
      for (const role of toAdd) await adminService.assignRole(roleUser.id, role);
      for (const role of toRemove) await adminService.removeRole(roleUser.id, role);
      setRoleOpen(false);
      await loadData();
      await useAuthStore.getState().refreshProfile();
      toast({ title: 'Roles updated' });
    } catch (e: any) {
      toast({ title: 'Failed to update roles', description: e.message, variant: 'destructive' });
    }
    setSavingRoles(false);
  }

  // ── Toggle status ──
  async function handleToggleStatus(user: StaffUser) {
    try {
      await adminService.toggleUserStatus(user.id, !user.is_active);
      await loadData();
      await useAuthStore.getState().refreshProfile();
      toast({ title: `User ${!user.is_active ? 'activated' : 'deactivated'}` });
    } catch (e: any) {
      toast({ title: 'Failed to update status', description: e.message, variant: 'destructive' });
    }
  }

  function getRoleInfo(roleName: string) {
    return roles.find(r => r.name === roleName);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          <h1 className="text-2xl font-bold">User Management</h1>
          <Badge variant="secondary" className="ml-2">{users.length} users</Badge>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Staff User
        </Button>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        <Card className="cursor-pointer hover:ring-2 ring-primary/30 transition-all" onClick={() => { setFilterRole('all'); setFilterStatus('all'); }}>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xl font-bold">{users.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase">Total</p>
          </CardContent>
        </Card>
        {roleNames.map(role => (
          <Card
            key={role}
            className={`cursor-pointer hover:ring-2 ring-primary/30 transition-all ${filterRole === role ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilterRole(filterRole === role ? 'all' : role)}
          >
            <CardContent className="pt-3 pb-2 text-center">
              <p className="text-xl font-bold">{roleCounts[role] ?? 0}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase truncate">{role.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleNames.map(r => (
              <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="no_role">No Role</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Staff Users
          </CardTitle>
          <CardDescription>
            Showing {filtered.length} of {users.length} users
            {filterRole !== 'all' && <> &middot; Role: <span className="capitalize font-medium">{filterRole.replace('_', ' ')}</span></>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => {
                  const uRoles = user.roles ?? [];
                  return (
                    <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {uRoles.map(role => (
                            <Badge key={role} variant="outline" className={`text-[10px] capitalize border ${ROLE_COLORS[role] ?? ''}`}>
                              {role.replace('_', ' ')}
                            </Badge>
                          ))}
                          {uRoles.length === 0 && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">No role</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() => handleToggleStatus(user)}
                            className="scale-75"
                          />
                          <span className={`text-xs ${user.is_active ? 'text-green-700' : 'text-red-600'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDetailUser(user)} title="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openRoleDialog(user)}>
                            <Shield className="h-3.5 w-3.5 mr-1" /> Roles
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Create User Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Staff User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label>Phone</Label>
              <Input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">Assign Roles</Label>
              <RoleMultiSelect
                value={createForm.roles}
                onChange={roles => setCreateForm(prev => ({ ...prev, roles }))}
                options={roleNames}
                roleColors={ROLE_COLORS}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating || !createForm.email || !createForm.password || !createForm.firstName}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Management Dialog ── */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Manage Roles — {roleUser?.first_name} {roleUser?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="mb-2 block">Assigned Roles</Label>
              <RoleMultiSelect
                value={pendingRoles}
                onChange={setPendingRoles}
                options={roleNames}
                roleColors={ROLE_COLORS}
              />
            </div>
            {/* Role details for selected roles */}
            {pendingRoles.length > 0 && (
              <div className="space-y-2">
                {pendingRoles.map(roleName => {
                  const info = getRoleInfo(roleName);
                  return (
                    <div key={roleName} className={`p-3 rounded-lg border ${ROLE_COLORS[roleName] ?? 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm capitalize">{roleName.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-[10px]">{info?.permissions?.length ?? 0} permissions</Badge>
                      </div>
                      {info?.description && <p className="text-xs text-muted-foreground mb-2">{info.description}</p>}
                      {info?.permissions && info.permissions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {info.permissions.map(p => (
                            <span key={p.name} title={p.description} className="text-[9px] bg-white/60 border border-current/20 px-1.5 py-0.5 rounded cursor-help">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
            <Button onClick={saveRoles} disabled={savingRoles}>
              {savingRoles ? 'Saving...' : 'Save Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── User Detail Dialog ── */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{detailUser.first_name} {detailUser.last_name}</span>

                <span className="text-muted-foreground">Email</span>
                <span>{detailUser.email}</span>

                <span className="text-muted-foreground">Phone</span>
                <span>{detailUser.phone ?? '—'}</span>

                <span className="text-muted-foreground">Status</span>
                <span>{detailUser.is_active ? (
                  <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>
                ) : (
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Inactive</Badge>
                )}</span>

                <span className="text-muted-foreground">Email Verified</span>
                <span>{detailUser.email_verified ? 'Yes' : 'No'}</span>

                <span className="text-muted-foreground">Login Count</span>
                <span>{detailUser.login_count ?? 0}</span>

                <span className="text-muted-foreground">Last Login</span>
                <span>{detailUser.last_login_at ? new Date(detailUser.last_login_at).toLocaleString() : 'Never'}</span>

                <span className="text-muted-foreground">Created</span>
                <span>{new Date(detailUser.created_at).toLocaleString()}</span>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Assigned Roles &amp; Permissions</p>
                <div className="space-y-3">
                  {(detailUser.roles ?? []).map(roleName => {
                    const info = getRoleInfo(roleName);
                    return (
                      <div key={roleName} className={`p-3 rounded-lg border ${ROLE_COLORS[roleName] ?? 'border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm capitalize">{roleName.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-[10px]">{info?.permissions?.length ?? 0} permissions</Badge>
                        </div>
                        {info?.description && <p className="text-xs text-muted-foreground mb-2">{info.description}</p>}
                        {info?.permissions && info.permissions.length > 0 && (
                          <div className="space-y-0.5">
                            {info.permissions.map(p => (
                              <div key={p.name} className="flex items-start gap-2 text-xs">
                                <span className="font-mono bg-white/50 px-1 rounded shrink-0">{p.name}</span>
                                <span className="text-muted-foreground">{p.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(detailUser.roles ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No roles assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailUser(null)}>Close</Button>
            {detailUser && (
              <Button onClick={() => { openRoleDialog(detailUser); setDetailUser(null); }}>
                <Shield className="h-3.5 w-3.5 mr-1" /> Edit Roles
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
