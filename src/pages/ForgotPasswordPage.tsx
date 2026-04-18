import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { passwordService } from '@/services/playerHistoryService';
import { KeyRound, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  async function handleRequestReset() {
    if (!email.trim()) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }
    setLoadingRequest(true);
    try {
      const res = await passwordService.requestReset({ email: email.trim().toLowerCase() });
      const token = (res.data as { resetToken?: string })?.resetToken;
      if (token) {
        setResetToken(token);
        toast({ title: 'Reset token generated', description: 'Use the token below to complete password reset.' });
      } else {
        toast({ title: 'Reset requested', description: 'If the account exists, reset instructions have been generated.' });
      }
    } catch (e: any) {
      toast({ title: 'Request failed', description: e?.message || 'Try again later', variant: 'destructive' });
    } finally {
      setLoadingRequest(false);
    }
  }

  async function handleCompleteReset() {
    if (!email.trim() || !resetToken.trim() || !newPassword.trim()) {
      toast({ title: 'Email, token, and new password are required', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }

    setLoadingReset(true);
    try {
      await passwordService.completeReset({
        email: email.trim().toLowerCase(),
        resetToken: resetToken.trim(),
        newPassword,
      });
      toast({ title: 'Password reset successful', description: 'You can now sign in with your new password.' });
      navigate('/login');
    } catch (e: any) {
      toast({ title: 'Reset failed', description: e?.message || 'Invalid or expired token', variant: 'destructive' });
    } finally {
      setLoadingReset(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Forgot Password
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Login
            </Button>
          </div>
          <CardDescription>
            Request a reset token, then set your new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>

          <Button className="w-full" variant="outline" onClick={() => void handleRequestReset()} disabled={loadingRequest}>
            {loadingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Reset Token'}
          </Button>

          <div>
            <Label>Reset Token</Label>
            <Input
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value.toUpperCase())}
              placeholder="Paste reset token"
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="mt-1"
            />
          </div>

          <Button className="w-full" onClick={() => void handleCompleteReset()} disabled={loadingReset}>
            {loadingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set New Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
