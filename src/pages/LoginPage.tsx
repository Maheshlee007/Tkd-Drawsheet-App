import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '@/store/useAuthStore';
import { useLocation, Redirect } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle, Trophy, Eye, EyeOff, UserPlus, UserCog, ScrollText,
  Layout as LayoutIcon, ArrowRight, Shield, ExternalLink,
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, loginWithCredentials, loginWithGoogle, isAuthenticated } = useAuthStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const devLoginEnabled = import.meta.env.VITE_DEV_LOGIN_ENABLED === 'true';

  // Registration modal state
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [regType, setRegType] = useState<'player' | 'coach'>('player');
  const [regCode, setRegCode] = useState('');

  // ── Google login ──
  const handleGoogleSuccess = async (cred: CredentialResponse) => {
    if (!cred.credential) return;
    setIsLoading(true);
    try {
      await loginWithGoogle(cred.credential);
    } catch {
      login(cred.credential);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Form login ──
  const handleLocalLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    const formData = new FormData(event.target as HTMLFormElement);
    const email = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      if (devLoginEnabled && email === 'mahesh' && password === 'Mahesh@007') {
        login({ name: email });
      } else {
        const msg = err.message || 'Invalid credentials.';
        setError(msg);
        toast({ variant: 'destructive', title: 'Login Failed', description: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated()) {
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect') || '/';
    return <Redirect to={redirectUrl} />;
  }

  function openRegDialog(type: 'player' | 'coach') {
    setRegType(type);
    setRegCode('');
    setRegDialogOpen(true);
  }

  function goToRegistration() {
    const code = regCode.trim().toUpperCase();
    if (!code) {
      toast({
        variant: 'destructive',
        title: 'Tournament code required',
        description: 'Ask your organizer for the tournament code.',
      });
      return;
    }
    navigate(regType === 'player' ? `/register/${code}` : `/coach-register/${code}`);
    setRegDialogOpen(false);
  }

  // ── Quick links shown on the LEFT panel ──────────────────────────────────
  const QUICK_LINKS = [
    {
      label: 'Quick Drawsheet',
      description: 'Generate a draw without an account',
      icon: LayoutIcon,
      onClick: () => navigate('/guest'),
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      label: 'Public tournaments',
      description: 'Browse upcoming events',
      icon: Trophy,
      onClick: () => navigate('/guest'),
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: 'Help / FAQ',
      description: 'Registration & rules',
      icon: ScrollText,
      onClick: () => window.open('https://example.com/help', '_blank'),
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    },
  ];

  return (
    <div
      className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2"
      style={{
        background: 'linear-gradient(to bottom, #86c7f2 0%, #e9f4fb 50%, #FFFFFF 100%)',
      }}
    >
      {/* ── LEFT PANE: registration + quick links ─────────────────────────── */}
      <section className="flex flex-col justify-center p-8 lg:p-12">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Trophy className="h-7 w-7 text-amber-500" />
              <h1 className="text-2xl font-bold">TKD Tournament Hub</h1>
            </div>
            <p className="text-slate-600 text-sm">
              Welcome! If you have a tournament code, register below. Internal
              staff (admin / jury / verification / board) can sign in on the right.
            </p>
          </div>

          {/* Player + Coach registration buttons */}
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => openRegDialog('player')}
              className="group flex items-center justify-between gap-3 rounded-xl border-2 border-blue-200 bg-white p-4 text-left shadow-sm hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Player Registration</p>
                  <p className="text-xs text-slate-500">Register with your tournament code</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition" />
            </button>

            <button
              type="button"
              onClick={() => openRegDialog('coach')}
              className="group flex items-center justify-between gap-3 rounded-xl border-2 border-green-200 bg-white p-4 text-left shadow-sm hover:border-green-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Coach Registration</p>
                  <p className="text-xs text-slate-500">Register your academy & team</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-green-500 transition" />
            </button>
          </div>

          <Separator className="my-2" />

          {/* Quick links */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick links
            </p>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={link.onClick}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm hover:shadow-sm transition ${link.color}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{link.label}</p>
                      <p className="text-xs opacity-80">{link.description}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── RIGHT PANE: staff login form ─────────────────────────────────── */}
      <section className="flex items-center justify-center p-8 lg:p-12 bg-white/40 backdrop-blur-sm border-l border-white/60">
        <Card className="w-full max-w-md shadow-xl border border-gray-200/40 bg-gradient-to-b from-white to-blue-50">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-gray-800 via-gray-700 to-black rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Staff Sign In</CardTitle>
            <CardDescription className="text-gray-500">
              For admins, organizers, jury, verification &amp; board operators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLocalLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Email or Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="you@example.com"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/password-reset')}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5"
              >
                {isLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <div className="relative">
              <Separator className="bg-gray-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-white px-3 text-sm text-gray-500">or continue with</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  toast({
                    variant: 'destructive',
                    title: 'Google Login Failed',
                    description: 'Please try again.',
                  });
                }}
                useOneTap
              />
            </div>

            <p className="text-xs text-center text-gray-500">
              By signing in, you agree to our terms of service.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Tournament-code dialog */}
      <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {regType === 'player' ? '🥋 Player Registration' : '🏆 Coach Registration'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter the tournament code provided by your organizer to continue.
              Registration is only allowed against an existing tournament.
            </p>
            <div>
              <Label>Tournament Code *</Label>
              <Input
                value={regCode}
                onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                placeholder="e.g. TKD-2026-ABCD"
                className="mt-1 font-mono uppercase"
                onKeyDown={(e) => e.key === 'Enter' && goToRegistration()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={goToRegistration} disabled={!regCode.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
