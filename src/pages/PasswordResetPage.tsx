import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { passwordService } from '@/services/playerHistoryService';
import { adminService } from '@/services/adminService';
import { KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

interface UserInfo { id: string; email: string; firstName: string; lastName: string; roles: string[] }

export default function PasswordResetPage() {
  const { toast } = useToast();
  const authUser = useAuthStore(s => s.user);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mustChange, setMustChange] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Self-change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [showMyPassword, setShowMyPassword] = useState(false);

  const isAdmin = authUser?.roles?.includes('admin') || authUser?.roles?.includes('organizer');

  useEffect(() => {
    if (isAdmin) {
      adminService.getUsers().then(data => {
        const mapped = (Array.isArray(data) ? data : []).map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.first_name ?? '',
          lastName: u.last_name ?? '',
          roles: u.roles ?? [],
        }));
        setUsers(mapped);
      }).catch(() => {});
    }
  }, [isAdmin]);

  const handleResetPassword = async () => {
    if (!selectedUserId || !newPassword) {
      toast({ title: 'Select a user and enter a password', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await passwordService.resetPassword({ userId: selectedUserId, newPassword, mustChangeOnLogin: mustChange });
      toast({ title: 'Password reset successfully' });
      setNewPassword('');
      setSelectedUserId('');
    } catch (err) {
      toast({ title: 'Reset failed', description: String(err), variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleChangeMyPassword = async () => {
    if (!currentPassword || !myNewPassword) {
      toast({ title: 'Fill in both fields', variant: 'destructive' });
      return;
    }
    if (myNewPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await passwordService.changePassword({ currentPassword, newPassword: myNewPassword });
      toast({ title: 'Password changed successfully' });
      setCurrentPassword('');
      setMyNewPassword('');
    } catch (err) {
      toast({ title: 'Change failed', description: String(err), variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Password Management</h1>
            <p className="text-muted-foreground">Reset staff passwords or change your own</p>
          </div>
          <KeyRound className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Admin/Organizer: Reset staff password */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Reset Staff Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Staff User</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email}) — {u.roles?.join(', ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="mustChange"
                  checked={mustChange}
                  onCheckedChange={(c) => setMustChange(!!c)}
                />
                <label htmlFor="mustChange" className="text-sm">
                  Require user to change password on next login
                </label>
              </div>

              <Button onClick={handleResetPassword} disabled={loading}>
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Self: Change own password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Change My Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">New Password</label>
              <div className="relative">
                <Input
                  type={showMyPassword ? 'text' : 'password'}
                  value={myNewPassword}
                  onChange={e => setMyNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowMyPassword(!showMyPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showMyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleChangeMyPassword} disabled={loading}>
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
  );
}
