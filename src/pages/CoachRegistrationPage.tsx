import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, ArrowLeft, CheckCircle } from 'lucide-react';
import { coachService } from '@/services/coachService';

const BELT_RANKS = ['White', 'Yellow', 'Green', 'Blue', 'Red', 'Black 1st Dan', 'Black 2nd Dan', 'Black 3rd Dan', 'Black 4th Dan', 'Black 5th Dan+'];

export default function CoachRegistrationPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ tournamentCode?: string }>();
  const tournamentCode = params?.tournamentCode;
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    clubName: '',
    beltRank: '',
    experienceYears: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ coachCode: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) {
      setError('First name, email, and password are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const coach = await coachService.register({
        ...form,
        experienceYears: form.experienceYears || undefined,
      });
      setSuccess({ coachCode: coach.coach_code });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Registration Successful!</h2>
            <p className="text-muted-foreground">Your coach code is:</p>
            <div className="bg-slate-100 rounded-lg p-4">
              <p className="text-3xl font-mono font-bold tracking-wider">{success.coachCode}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Save this code. You can use your email and password to log in and manage your players.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/login')}>Go to Login</Button>
              <Button onClick={() => { setSuccess(null); setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', clubName: '', beltRank: '', experienceYears: 0 }); }}>Register Another</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" /> Coach Registration
              </CardTitle>
              <CardDescription>Register as a coach to manage your players</CardDescription>
            </div>
          </div>
          {tournamentCode && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
              Registering for tournament: <span className="font-mono font-semibold">{tournamentCode}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div>
              <Label>Club / Academy Name</Label>
              <Input value={form.clubName} onChange={e => setForm({ ...form, clubName: e.target.value })} placeholder="e.g. Tiger TKD Academy" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Belt Rank</Label>
                <Select value={form.beltRank} onValueChange={v => setForm({ ...form, beltRank: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {BELT_RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input type="number" min={0} max={50} value={form.experienceYears} onChange={e => setForm({ ...form, experienceYears: Number(e.target.value) })} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register as Coach'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
