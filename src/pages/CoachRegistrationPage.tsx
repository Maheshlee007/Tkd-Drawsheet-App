import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserCog, ArrowLeft, CheckCircle, FileText, ShieldCheck, Loader2,
  Download, Trophy,
} from 'lucide-react';
import { coachService } from '@/services/coachService';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { AutoCloseErrorModal } from '@/components/AutoCloseErrorModal';

const BELT_RANKS = [
  'White', 'Yellow', 'Green', 'Blue', 'Red',
  'Black 1st Dan', 'Black 2nd Dan', 'Black 3rd Dan', 'Black 4th Dan', 'Black 5th Dan+',
];

const REQUIRED_DOCS = [
  { label: 'Government Photo ID (Aadhaar / Passport)', mandatory: true },
  { label: 'Coaching Certification (Dan grade certificate)', mandatory: true },
  { label: 'Recent passport-size photograph', mandatory: true },
  { label: 'Background verification declaration', mandatory: false },
];

const DOWNLOADABLE_FORMS = [
  { label: 'Coach declaration form', href: '/forms/coach-declaration.pdf' },
  { label: 'Code of conduct', href: '/forms/code-of-conduct.pdf' },
];

export default function CoachRegistrationPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ tournamentCode?: string }>();
  const routeCode = params?.tournamentCode ?? '';
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isInternalUser = !!user?.roles?.some(r =>
    ['admin', 'organizer', 'manager'].includes(String(r).toLowerCase())
  );

  const [codeInput, setCodeInput] = useState(routeCode.toUpperCase());
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentError, setTournamentError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [modalError, setModalError] = useState('');

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
  const coachFormLinks = tournament?.coach_form_links?.length
    ? tournament.coach_form_links
    : DOWNLOADABLE_FORMS.map(f => f.href);

  useEffect(() => {
    if (routeCode) void resolveTournament(routeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCode]);

  async function resolveTournament(raw?: string) {
    const code = (raw ?? codeInput).trim().toUpperCase();
    if (!code) {
      const msg = 'Please enter the tournament code provided by your organizer.';
      setTournamentError(msg);
      setModalError(msg);
      return;
    }
    setResolving(true);
    setTournamentError('');
    try {
      const t = await tournamentService.getByCode(code);
      setTournament(t);
      setCodeInput(code);
    } catch (e: any) {
      setTournament(null);
      const rawMsg = String(e?.message || '');
      const msg = rawMsg.toLowerCase().includes('tournament not found')
        ? 'Invalid tournament code. Please check and try again.'
        : (rawMsg || 'Invalid tournament code. Please check and try again.');
      setTournamentError(msg);
      setModalError(msg);
    } finally {
      setResolving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament) {
      setError('Please verify a tournament code before registering.');
      return;
    }
    if (!form.firstName || !form.email || !form.password) {
      setError('First name, email, and password are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const coach = await coachService.register({
        tournamentCode: tournament.tournament_code,
        ...form,
        experienceYears: form.experienceYears || undefined,
      });
      setSuccess({ coachCode: coach.coach_code });
      toast({ title: 'Registration successful', description: `Coach code: ${coach.coach_code}` });
    } catch (e: any) {
      const msg = e?.message || 'Registration failed';
      setError(msg);
      setModalError(msg);
      toast({ title: 'Registration failed', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
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
              <Button onClick={() => {
                setSuccess(null);
                setForm({
                  firstName: '', lastName: '', email: '', password: '',
                  phone: '', clubName: '', beltRank: '', experienceYears: 0,
                });
              }}>Register Another</Button>
            </div>
          </CardContent>
        </Card>
        <AutoCloseErrorModal
          open={!!modalError}
          message={modalError}
          onOpenChange={(open) => {
            if (!open) setModalError('');
          }}
        />
      </div>
    );
  }

  // ── Main split layout (30/70) ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar with back navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isInternalUser ? navigate('/') : navigate('/login')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {isInternalUser ? 'Back to Panel' : 'Back to Login'}
            </Button>
            <div className="flex items-center gap-2 text-slate-700">
              <UserCog className="h-5 w-5" />
              <span className="font-semibold">Coach Registration</span>
            </div>
          </div>
          {tournament && (
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
              <Trophy className="h-4 w-4" />
              <span className="font-mono font-semibold">{tournament.tournament_code}</span>
              <span className="text-slate-400">•</span>
              <span>{tournament.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-10 gap-6 mt-4">
        {/* Left: 30% — required documents + downloads */}
        <aside className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Label className="text-sm font-semibold">Tournament Code *</Label>
              <p className="text-xs text-muted-foreground">
                Verify your code before continuing with coach registration.
              </p>
              <div className="flex gap-2">
                <Input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. TKD-2026-XXXX"
                  className="font-mono uppercase"
                  disabled={!!tournament}
                  onKeyDown={(e) => e.key === 'Enter' && void resolveTournament()}
                />
                {tournament ? (
                  <Button variant="outline" onClick={() => { setTournament(null); setTournamentError(''); }}>
                    Change
                  </Button>
                ) : (
                  <Button onClick={() => void resolveTournament()} disabled={resolving || !codeInput.trim()}>
                    {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                  </Button>
                )}
              </div>
              {tournamentError && (
                <p className="text-xs text-red-600">{tournamentError}</p>
              )}
              {tournament && (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Verified tournament code
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Documents required for verification</h3>
              </div>
              <ul className="space-y-2 text-sm">
                {REQUIRED_DOCS.map((doc) => (
                  <li key={doc.label} className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${doc.mandatory ? 'bg-red-500' : 'bg-slate-300'}`} />
                    <span className="text-slate-700">
                      {doc.label}
                      {doc.mandatory && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">
                Please carry the original documents to the venue for in-person verification.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-slate-800">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Forms to download</h3>
              </div>
              <div className="space-y-2">
                {coachFormLinks.map((href, index) => (
                  <a
                    key={`${href}-${index}`}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-slate-50 hover:bg-slate-100 text-sm text-slate-700"
                  >
                    <span>Coach Form {index + 1}</span>
                    <Download className="h-4 w-4 text-slate-500" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {tournament && (
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-800">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold">Tournament details</h3>
                </div>
                <div className="text-slate-600 space-y-1">
                  <div><span className="text-slate-500">Code:</span> <span className="font-mono">{tournament.tournament_code}</span></div>
                  <div><span className="text-slate-500">Name:</span> {tournament.name}</div>
                  {tournament.venue && <div><span className="text-slate-500">Venue:</span> {tournament.venue}</div>}
                  <div><span className="text-slate-500">Dates:</span> {tournament.start_date} → {tournament.end_date}</div>
                  <div><span className="text-slate-500">Status:</span> <span className="capitalize">{tournament.status.replace(/_/g, ' ')}</span></div>
                </div>
                {tournament.registration_instructions && (
                  <div className="border-t pt-2 mt-2">
                    <div className="text-slate-500">Instructions:</div>
                    <p className="text-slate-700 whitespace-pre-line">{tournament.registration_instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Right: 70% — registration form */}
        <section className="lg:col-span-7">
          <Card>
            <CardContent className="pt-6 space-y-5">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className={`space-y-4 ${!tournament ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10 digits"
                    />
                  </div>
                </div>

                <div>
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <Label>Club / Academy Name</Label>
                  <Input
                    value={form.clubName}
                    onChange={(e) => setForm({ ...form, clubName: e.target.value })}
                    placeholder="e.g. Tiger TKD Academy"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Belt Rank</Label>
                    <Select value={form.beltRank} onValueChange={(v) => setForm({ ...form, beltRank: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {BELT_RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Experience (years)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={form.experienceYears}
                      onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || !tournament}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering…</>
                  ) : (
                    'Register as Coach'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
      <AutoCloseErrorModal
        open={!!modalError}
        message={modalError}
        onOpenChange={(open) => {
          if (!open) setModalError('');
        }}
      />
    </div>
  );
}
