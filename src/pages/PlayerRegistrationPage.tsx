import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, ArrowLeft, ArrowRight, CheckCircle, Loader2, Download, LogIn, Copy, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { usePlayerStore, PlayerRegistration } from '@/store/usePlayerStore';
import { playerService, type RegisteredPlayer, type TeamEntryPayload } from '@/services/playerService';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { useAuthStore } from '@/store/useAuthStore';
import {
  BELT_LEVELS, getAgeCategory, getWeightCategory, isMinor, isValidAadhaarFormat, calculateAge,
} from '@/utils/categoryUtils';
import { useToast } from '@/hooks/use-toast';
import { generateRegistrationPDF } from '@/utils/registrationPDF';

const STEPS = ['Basic Info', 'TKD Details', 'Verification', 'Review & Submit'];

const EVENT_OPTIONS = [
  { value: 'kyorugi', label: 'Kyorugi (Sparring)' },
  { value: 'poomsae', label: 'Poomsae (Individual)' },
  { value: 'poomsae_pair', label: 'Poomsae Pair' },
  { value: 'poomsae_group', label: 'Poomsae Group' },
  { value: 'freestyle_poomsae', label: 'Freestyle Poomsae' },
];

const GROUP_EVENT_OPTIONS = ['poomsae_pair', 'poomsae_group'];

interface TeamEntryFormState {
  teamName: string;
  members: string[];
}

const PlayerRegistrationPage: React.FC = () => {
  const [, navigate] = useLocation();
  const params = useParams<{ tournamentCode?: string }>();
  const routeTournamentCode = params?.tournamentCode || '';
  const { toast } = useToast();
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const authUser = useAuthStore((s) => s.user);
  const isInternalUser = !!authUser?.roles?.some((r) =>
    ['admin', 'organizer', 'manager'].includes(String(r).toLowerCase())
  );

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [registeredPlayer, setRegisteredPlayer] = useState<RegisteredPlayer | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [tournamentCodeInput, setTournamentCodeInput] = useState(routeTournamentCode);
  const [resolvedTournament, setResolvedTournament] = useState<Tournament | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [tournamentError, setTournamentError] = useState('');

  // Selected events for multi-event support
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['kyorugi']);
  const [teamEntries, setTeamEntries] = useState<Record<string, TeamEntryFormState>>({});

  function toggleEvent(value: string) {
    setSelectedEvents(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    );
  }

  function upsertTeamEntry(eventType: string, updater: (prev: TeamEntryFormState) => TeamEntryFormState) {
    setTeamEntries(prev => ({
      ...prev,
      [eventType]: updater(prev[eventType] ?? { teamName: '', members: [''] }),
    }));
  }

  function resolveTournamentPricing() {
    const firstEventFee = Number(resolvedTournament?.first_event_fee ?? resolvedTournament?.entry_fee ?? 500);
    const additionalEventFee = Number(resolvedTournament?.additional_event_fee ?? 300);
    const eventFees = selectedEvents.map((_, index) => (index === 0 ? firstEventFee : additionalEventFee));
    return {
      firstEventFee,
      additionalEventFee,
      eventFees,
      totalFee: eventFees.reduce((sum, fee) => sum + fee, 0),
    };
  }

  const pricingPreview = resolveTournamentPricing();

  useEffect(() => {
    if (!routeTournamentCode) return;
    void handleTournamentLookup(routeTournamentCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTournamentCode]);

  async function handleTournamentLookup(rawCode?: string) {
    const code = (rawCode ?? tournamentCodeInput).trim().toUpperCase();
    if (!code) {
      setTournamentError('Tournament code is required');
      return;
    }

    setLoadingTournament(true);
    setTournamentError('');
    try {
      const tournament = await tournamentService.getByCode(code);
      setResolvedTournament(tournament);
      setTournamentCodeInput(code);
    } catch (error: any) {
      setResolvedTournament(null);
      setTournamentError(error.message || 'Tournament not found');
    } finally {
      setLoadingTournament(false);
    }
  }

  // Basic info
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [occupation, setOccupation] = useState('');
  // TKD
  const [beltColor, setBeltColor] = useState('');
  const [danId, setDanId] = useState('');
  const [weight, setWeight] = useState<number>(0);
  const [club, setClub] = useState('');
  const [coach, setCoach] = useState('');
  const [experience, setExperience] = useState('');
  // Verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarVerifying, setAadhaarVerifying] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const ageCategory = dateOfBirth ? getAgeCategory(dateOfBirth) : '';
  const weightCategory = weight > 0 && ageCategory && ageCategory !== 'Unknown' ? getWeightCategory(weight, ageCategory, gender) : '';
  const needsGuardian = dateOfBirth ? isMinor(dateOfBirth) : false;
  const age = dateOfBirth ? calculateAge(dateOfBirth) : null;
  const canProceedStep0 = fullName.trim() && dateOfBirth && phone.trim() && email.trim() && (!needsGuardian || guardianName.trim());
  const groupEventValidationPassed = selectedEvents
    .filter(eventType => GROUP_EVENT_OPTIONS.includes(eventType))
    .every(eventType => (teamEntries[eventType]?.members ?? []).filter(name => name.trim()).length > 0);
  const canProceedStep1 = !!resolvedTournament && beltColor && weight > 0 && selectedEvents.length > 0 && groupEventValidationPassed;

  const handleMockAadhaarVerify = async () => {
    if (!isValidAadhaarFormat(aadhaarNumber)) {
      toast({ title: 'Invalid Aadhaar', description: 'Must be 12 digits, not starting with 0 or 1', variant: 'destructive' });
      return;
    }
    setAadhaarVerifying(true);
    await new Promise((r) => setTimeout(r, 2000));
    setAadhaarVerified(true);
    setAadhaarVerifying(false);
    toast({ title: 'Aadhaar Verified', description: 'Verification successful (mock)' });
  };

  const handleSendEmailOtp = async () => {
    if (!email.trim()) return;
    setEmailVerifying(true);
    await new Promise((r) => setTimeout(r, 1500));
    setEmailOtpSent(true);
    setEmailVerifying(false);
    toast({ title: 'OTP Sent', description: `Verification code sent to ${email} (mock)` });
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Enter a 6-digit code', variant: 'destructive' });
      return;
    }
    setEmailVerifying(true);
    await new Promise((r) => setTimeout(r, 1000));
    setEmailVerified(true);
    setEmailVerifying(false);
    toast({ title: 'Email Verified', description: 'Email verification successful (mock)' });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const playerData = {
        tournamentCode: resolvedTournament?.tournament_code ?? tournamentCodeInput,
        fullName, dateOfBirth, gender,
        guardianName: needsGuardian ? guardianName : undefined,
        phone, email,
        address: address || undefined,
        state: state || undefined,
        district: district || undefined,
        pincode: pincode || undefined,
        occupation: occupation || undefined,
        beltColor,
        danId: danId || undefined,
        weight,
        club: club || undefined,
        coach: coach || undefined,
        experience: experience || undefined,
        aadhaarNumber: aadhaarNumber || undefined,
        aadhaarVerified, emailVerified,
        dobVerified: aadhaarVerified,
        events: selectedEvents,
        teamEntries: selectedEvents
          .filter(eventType => GROUP_EVENT_OPTIONS.includes(eventType))
          .map<TeamEntryPayload>(eventType => ({
            eventType,
            teamName: teamEntries[eventType]?.teamName?.trim() || undefined,
            members: (teamEntries[eventType]?.members ?? [])
              .map(memberName => memberName.trim())
              .filter(Boolean)
              .map(memberName => ({ memberName })),
          }))
          .filter(entry => entry.members.length > 0),
      };
      // Try API first, fall back to localStorage
      let player: RegisteredPlayer;
      try {
        player = await playerService.create(playerData);
      } catch {
        player = addPlayer(playerData);
      }
      setRegisteredPlayer(player);
      try {
        const QRCode = await import('qrcode');
        const qrText = `${player.playerCode}|${resolvedTournament?.tournament_code ?? tournamentCodeInput}|${fullName}`;
        const url = await QRCode.toDataURL(qrText, { width: 200, margin: 1 });
        setQrDataUrl(url);
      } catch { /* QR non-critical */ }
      toast({ title: 'Registration Complete', description: `Player code: ${player.playerCode}` });
    } catch {
      toast({ title: 'Error', description: 'Registration failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };;

  const copyPlayerCode = () => {
    if (registeredPlayer) {
      navigator.clipboard.writeText(registeredPlayer.playerCode);
      toast({ title: 'Copied', description: 'Player code copied to clipboard' });
    }
  };

  const resetForm = () => {
    setRegisteredPlayer(null); setQrDataUrl(null); setStep(0);
    setFullName(''); setDateOfBirth(''); setPhone(''); setEmail('');
    setGuardianName(''); setBeltColor(''); setDanId(''); setWeight(0);
    setClub(''); setCoach(''); setExperience(''); setAadhaarNumber('');
    setAadhaarVerified(false); setEmailVerified(false); setEmailOtpSent(false);
    setEmailOtp(''); setTermsAccepted(false);
    setAddress(''); setState(''); setDistrict(''); setPincode('');
    setOccupation(''); setSelectedEvents(['kyorugi']);
    setTeamEntries({});
  };

  if (registeredPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <RegistrationTopBar
          isInternal={isInternalUser}
          tournament={resolvedTournament}
          onBack={() => isInternalUser ? navigate('/') : navigate('/login')}
        />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center space-y-6">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-700">Registration Successful!</h2>
                <p className="text-sm text-slate-500 mt-1">Your unique player code is:</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-mono font-bold tracking-wider text-slate-800">{registeredPlayer.playerCode}</span>
                <Button variant="ghost" size="sm" onClick={copyPlayerCode}><Copy className="h-4 w-4" /></Button>
              </div>
              {qrDataUrl && (
                <div>
                  <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-lg border" />
                  <p className="text-xs text-slate-400 mt-1">Scan for quick check-in</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-lg p-4 text-left text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <p><span className="font-medium">Name:</span> {registeredPlayer.fullName}</p>
                <p><span className="font-medium">Category:</span> {registeredPlayer.ageCategory} - {registeredPlayer.weightCategory}</p>
                <p><span className="font-medium">Belt:</span> {registeredPlayer.beltColor}</p>
                {registeredPlayer.pricing && <p><span className="font-medium">Registration Fee:</span> Rs. {registeredPlayer.pricing.totalFee}</p>}
                {registeredPlayer.club && <p><span className="font-medium">Club:</span> {registeredPlayer.club}</p>}
                {registeredPlayer.state && <p><span className="font-medium">Location:</span> {registeredPlayer.district ? `${registeredPlayer.district}, ` : ''}{registeredPlayer.state}</p>}
              </div>
              <Button variant="outline" className="w-full" onClick={() => generateRegistrationPDF(registeredPlayer, qrDataUrl)}>
                <Download className="h-4 w-4 mr-2" /> Download Registration Card (PDF)
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetForm}>Register Another</Button>
                <Button className="flex-1" onClick={() => navigate('/')}>Go to Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <RegistrationTopBar
        isInternal={isInternalUser}
        tournament={resolvedTournament}
        onBack={() => isInternalUser ? navigate('/') : navigate('/login')}
      />
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left aside (30%) — required docs / info */}
        <aside className="lg:col-span-3 space-y-4">
          <RegistrationInfoPanel tournament={resolvedTournament} pricing={pricingPreview} />
        </aside>

        {/* Right (70%) — actual stepped form */}
        <div className="lg:col-span-7">
        {!resolvedTournament && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">Tournament Code Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-900">
                Registration is tournament-specific. Enter the tournament code from the organizer link to continue.
              </p>
              <div className="flex gap-2">
                <Input
                  value={tournamentCodeInput}
                  onChange={(e) => setTournamentCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. TKD-2026-TEST1"
                  className="font-mono bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && void handleTournamentLookup()}
                />
                <Button onClick={() => void handleTournamentLookup()} disabled={loadingTournament}>
                  {loadingTournament ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                </Button>
              </div>
              {tournamentError && <p className="text-sm text-red-600">{tournamentError}</p>}
            </CardContent>
          </Card>
        )}

        {resolvedTournament && (
          <Card className="mb-4 border-emerald-200 bg-emerald-50">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-900">{resolvedTournament.name}</p>
                  <p className="text-emerald-700 font-mono text-xs">{resolvedTournament.tournament_code}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{resolvedTournament.status.replace('_', ' ')}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-900">
                <p><span className="font-medium">Venue:</span> {resolvedTournament.venue || '-'}{resolvedTournament.city ? `, ${resolvedTournament.city}` : ''}</p>
                <p><span className="font-medium">Dates:</span> {resolvedTournament.start_date} to {resolvedTournament.end_date}</p>
                <p><span className="font-medium">First Event:</span> Rs. {pricingPreview.firstEventFee}</p>
                <p><span className="font-medium">Additional Event:</span> Rs. {pricingPreview.additionalEventFee}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual form notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Pre-Registration Requirement</p>
            <p className="mt-1">Please download and fill the registration form before arriving at the venue. Bring the completed form along with required documents.</p>
            <Button variant="link" size="sm" className="p-0 h-auto text-amber-700 underline mt-1" onClick={() => toast({ title: 'Coming Soon', description: 'Registration form document will be available for download shortly.' })}>
              <ExternalLink className="h-3 w-3 mr-1" /> Download Registration Form
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
          Your details are collected exclusively for tournament organization and verification purposes.
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((name, i) => (
            <div key={name} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <span className="text-xs hidden sm:inline">{name}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-4 sm:w-8 bg-slate-300 mx-1 sm:mx-2" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">{STEPS[step]}</CardTitle></CardHeader>
          <CardContent className={`space-y-4 ${!resolvedTournament ? 'opacity-60 pointer-events-none' : ''}`}>
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" className={`mt-1 ${showErrors && !fullName.trim() ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                  {showErrors && !fullName.trim() && <p className="text-xs text-red-500 mt-1">Full name is required</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={`mt-1 ${showErrors && !dateOfBirth ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {showErrors && !dateOfBirth && <p className="text-xs text-red-500 mt-1">Date of birth is required</p>}
                    {age !== null && (
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">Age: {age}</Badge>
                        {ageCategory && <Badge variant="secondary">{ageCategory}</Badge>}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <div className="flex gap-3 mt-1">
                      <Button variant={gender === 'male' ? 'default' : 'outline'} size="sm" onClick={() => setGender('male')} className="flex-1">Male</Button>
                      <Button variant={gender === 'female' ? 'default' : 'outline'} size="sm" onClick={() => setGender('female')} className="flex-1">Female</Button>
                    </div>
                  </div>
                </div>
                {needsGuardian && (
                  <div>
                    <Label htmlFor="guardian">Guardian/Parent Name *</Label>
                    <Input id="guardian" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Required for minors" className={`mt-1 ${showErrors && needsGuardian && !guardianName.trim() ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {showErrors && needsGuardian && !guardianName.trim() && <p className="text-xs text-red-500 mt-1">Guardian name is required for minors</p>}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit phone" className={`mt-1 ${showErrors && !phone.trim() ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {showErrors && !phone.trim() && <p className="text-xs text-red-500 mt-1">Phone number is required</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className={`mt-1 ${showErrors && !email.trim() ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {showErrors && !email.trim() && <p className="text-xs text-red-500 mt-1">Email is required</p>}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-2 block text-slate-600">Residential Address</Label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, area, landmark..." className="mt-1" rows={2} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="district">District</Label>
                      <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input id="pincode" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" className="mt-1" />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Label htmlFor="occupation" className="text-sm font-medium">Current Study / Occupation</Label>
                  <p className="text-xs text-slate-400 mt-0.5">(Optional for Cadets/Juniors)</p>
                  <Input id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g., Student - Class 10, Software Engineer" className="mt-1" />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Belt Color *</Label>
                    <Select value={beltColor} onValueChange={setBeltColor}>
                      <SelectTrigger className={`mt-1 ${showErrors && !beltColor ? 'border-red-400 ring-1 ring-red-400' : ''}`}><SelectValue placeholder="Select belt level" /></SelectTrigger>
                      <SelectContent>{BELT_LEVELS.map((belt) => (<SelectItem key={belt} value={belt}>{belt}</SelectItem>))}</SelectContent>
                    </Select>
                    {showErrors && !beltColor && <p className="text-xs text-red-500 mt-1">Belt color is required</p>}
                  </div>
                  <div>
                    <Label htmlFor="danId">Dan ID / Kukkiwon Number</Label>
                    <Input id="danId" value={danId} onChange={(e) => setDanId(e.target.value)} placeholder="Optional" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weight">Weight (kg) *</Label>
                    <Input id="weight" type="number" min={15} max={200} value={weight || ''} onChange={(e) => setWeight(parseFloat(e.target.value) || 0)} placeholder="Body weight in kg" className={`mt-1 ${showErrors && weight <= 0 ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {showErrors && weight <= 0 && <p className="text-xs text-red-500 mt-1">Weight is required</p>}
                    {weightCategory && <Badge variant="secondary" className="mt-1">{weightCategory}</Badge>}
                  </div>
                  <div>
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g., 3 years" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="club">Club / Academy</Label>
                    <Input id="club" value={club} onChange={(e) => setClub(e.target.value)} placeholder="Optional" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="coach">Coach Name</Label>
                    <Input id="coach" value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="Optional" className="mt-1" />
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Label className="font-medium">Events to Participate *</Label>
                  <p className="text-xs text-slate-500 mt-0.5 mb-2">Select all events you will compete in</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EVENT_OPTIONS.map(opt => (
                      <label key={opt.value} className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                        selectedEvents.includes(opt.value) ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-50'
                      }`}>
                        <Checkbox
                          checked={selectedEvents.includes(opt.value)}
                          onCheckedChange={() => toggleEvent(opt.value)}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {showErrors && selectedEvents.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Please select at least one event</p>
                  )}
                </div>
                {selectedEvents.filter(eventType => GROUP_EVENT_OPTIONS.includes(eventType)).map(eventType => {
                  const teamEntry = teamEntries[eventType] ?? { teamName: '', members: [''] };
                  const label = EVENT_OPTIONS.find(option => option.value === eventType)?.label || eventType;
                  return (
                    <div key={eventType} className="border-t pt-4 space-y-3">
                      <div>
                        <Label>{label} Team Name</Label>
                        <Input
                          value={teamEntry.teamName}
                          onChange={(e) => upsertTeamEntry(eventType, prev => ({ ...prev, teamName: e.target.value }))}
                          placeholder="Optional team / pair name"
                          className="mt-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Additional Team Members *</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => upsertTeamEntry(eventType, prev => ({ ...prev, members: [...prev.members, ''] }))}
                          >
                            Add Member
                          </Button>
                        </div>
                        {teamEntry.members.map((member, memberIndex) => (
                          <div key={`${eventType}-${memberIndex}`} className="flex gap-2">
                            <Input
                              value={member}
                              onChange={(e) => upsertTeamEntry(eventType, prev => ({
                                ...prev,
                                members: prev.members.map((entry, index) => index === memberIndex ? e.target.value : entry),
                              }))}
                              placeholder={eventType === 'poomsae_pair' ? 'Partner full name' : `Team member ${memberIndex + 1}`}
                            />
                            {teamEntry.members.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => upsertTeamEntry(eventType, prev => ({
                                  ...prev,
                                  members: prev.members.filter((_, index) => index !== memberIndex),
                                }))}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                        {showErrors && (teamEntry.members.filter(name => name.trim()).length === 0) && (
                          <p className="text-xs text-red-500">Add at least one additional member for {label.toLowerCase()}.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {resolvedTournament && (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-700 mb-2">Pricing Preview</p>
                    <div className="space-y-1 text-slate-600">
                      {selectedEvents.map((eventType, index) => (
                        <div key={eventType} className="flex justify-between gap-3">
                          <span>{EVENT_OPTIONS.find(option => option.value === eventType)?.label || eventType}</span>
                          <span>Rs. {pricingPreview.eventFees[index] ?? 0}</span>
                        </div>
                      ))}
                      <div className="flex justify-between gap-3 border-t pt-2 font-semibold text-slate-900">
                        <span>Total</span>
                        <span>Rs. {pricingPreview.totalFee}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="aadhaar">Aadhaar Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Input id="aadhaar" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12-digit Aadhaar" disabled={aadhaarVerified} className="flex-1" />
                    <Button onClick={handleMockAadhaarVerify} disabled={aadhaarVerified || aadhaarVerifying || aadhaarNumber.length !== 12} size="sm">
                      {aadhaarVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : aadhaarVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : 'Verify'}
                    </Button>
                  </div>
                  {aadhaarVerified && <p className="text-xs text-green-600 mt-1">Aadhaar verified successfully</p>}
                </div>
                <div>
                  <Label>Email Verification</Label>
                  {!emailOtpSent ? (
                    <Button onClick={handleSendEmailOtp} disabled={emailVerifying || !email.trim()} variant="outline" size="sm" className="mt-1 w-full">
                      {emailVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send OTP to {email || '...'}
                    </Button>
                  ) : !emailVerified ? (
                    <div className="flex gap-2 mt-1">
                      <Input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" className="flex-1" />
                      <Button onClick={handleVerifyEmailOtp} disabled={emailVerifying || emailOtp.length !== 6} size="sm">
                        {emailVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Email verified</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-4">Verification is optional but recommended.</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">Please verify all details carefully before submitting. Changes cannot be made after submission.</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-sm">
                  <h4 className="font-semibold text-base mb-3">Registration Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Name</span><span className="font-medium sm:ml-2">{fullName}</span></div>
                    <div className="flex justify-between sm:block"><span className="text-slate-500">DOB</span><span className="font-medium sm:ml-2">{dateOfBirth} (Age: {age})</span></div>
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Gender</span><span className="font-medium capitalize sm:ml-2">{gender}</span></div>
                    {needsGuardian && <div className="flex justify-between sm:block"><span className="text-slate-500">Guardian</span><span className="font-medium sm:ml-2">{guardianName}</span></div>}
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Phone</span><span className="font-medium sm:ml-2">{phone}</span></div>
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Email</span><span className="font-medium sm:ml-2">{email}</span></div>
                    {occupation && <div className="flex justify-between sm:block"><span className="text-slate-500">Occupation</span><span className="font-medium sm:ml-2">{occupation}</span></div>}
                    {(address || state || district || pincode) && (
                      <>
                        {address && <div className="flex justify-between sm:block sm:col-span-2"><span className="text-slate-500">Address</span><span className="font-medium sm:ml-2">{address}</span></div>}
                        <div className="flex justify-between sm:block"><span className="text-slate-500">State</span><span className="font-medium sm:ml-2">{state || '-'}</span></div>
                        <div className="flex justify-between sm:block"><span className="text-slate-500">District, Pin</span><span className="font-medium sm:ml-2">{district || '-'}{pincode ? `, ${pincode}` : ''}</span></div>
                      </>
                    )}
                  </div>
                  <div className="border-t pt-3 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                      <div className="flex justify-between sm:block"><span className="text-slate-500">Belt</span><span className="font-medium sm:ml-2">{beltColor}</span></div>
                      {danId && <div className="flex justify-between sm:block"><span className="text-slate-500">Dan ID</span><span className="font-medium sm:ml-2">{danId}</span></div>}
                      <div className="flex justify-between sm:block"><span className="text-slate-500">Weight</span><span className="font-medium sm:ml-2">{weight} kg</span></div>
                      <div className="flex justify-between sm:block"><span className="text-slate-500">Category</span><span className="font-medium sm:ml-2">{ageCategory} - {weightCategory}</span></div>
                      {club && <div className="flex justify-between sm:block"><span className="text-slate-500">Club</span><span className="font-medium sm:ml-2">{club}</span></div>}
                      {coach && <div className="flex justify-between sm:block"><span className="text-slate-500">Coach</span><span className="font-medium sm:ml-2">{coach}</span></div>}
                      {experience && <div className="flex justify-between sm:block"><span className="text-slate-500">Experience</span><span className="font-medium sm:ml-2">{experience}</span></div>}
                      {resolvedTournament && <div className="flex justify-between sm:block"><span className="text-slate-500">Tournament</span><span className="font-medium sm:ml-2">{resolvedTournament.name}</span></div>}
                      {resolvedTournament && <div className="flex justify-between sm:block"><span className="text-slate-500">Registration Fee</span><span className="font-medium sm:ml-2">Rs. {pricingPreview.totalFee}</span></div>}
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2 flex gap-2">
                    {aadhaarVerified && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Aadhaar</Badge>}
                    {emailVerified && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Email</Badge>}
                    {!aadhaarVerified && !emailVerified && <Badge variant="outline" className="text-xs">No verification</Badge>}
                  </div>
                  <div className="border-t pt-3 mt-2">
                    <p className="text-slate-500 text-xs font-medium mb-2">Selected Events</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEvents.length > 0
                        ? selectedEvents.map(e => (
                            <Badge key={e} variant="secondary" className="capitalize">
                              {EVENT_OPTIONS.find(o => o.value === e)?.label || e}
                            </Badge>
                          ))
                        : <span className="text-xs text-red-500">No events selected</span>
                      }
                    </div>
                  </div>
                  {selectedEvents.filter(eventType => GROUP_EVENT_OPTIONS.includes(eventType)).length > 0 && (
                    <div className="border-t pt-3 mt-2 space-y-2">
                      <p className="text-slate-500 text-xs font-medium">Group Event Members</p>
                      {selectedEvents.filter(eventType => GROUP_EVENT_OPTIONS.includes(eventType)).map(eventType => (
                        <div key={eventType} className="text-xs text-slate-700">
                          <span className="font-medium">{EVENT_OPTIONS.find(option => option.value === eventType)?.label || eventType}:</span>
                          <span className="ml-2">{(teamEntries[eventType]?.members ?? []).filter(Boolean).join(', ') || 'No members added'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(v === true)} />
                  <label htmlFor="terms" className="text-sm text-slate-600 leading-tight cursor-pointer">
                    I confirm the details above are correct. I understand these details are collected solely for tournament purposes.
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => step === 0 ? navigate('/') : setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> {step === 0 ? 'Home' : 'Back'}
              </Button>
              {step < 3 ? (
                <Button onClick={() => {
                  const canProceed = (step === 0 && canProceedStep0) || (step === 1 && canProceedStep1) || step === 2;
                  if (!canProceed) {
                    setShowErrors(true);
                    return;
                  }
                  setShowErrors(false);
                  setStep(step + 1);
                }} disabled={!resolvedTournament}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!resolvedTournament || !termsAccepted || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Submit Registration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="bg-white border-b shadow-sm sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-red-500 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Player Registration</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Tournament Registration Portal</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onLogin}>
        <LogIn className="h-4 w-4 mr-2" /> Sign In
      </Button>
    </div>
  </div>
);

// ─── Top bar with back navigation (replaces public Header for new layout) ────
const RegistrationTopBar: React.FC<{
  isInternal: boolean;
  tournament: Tournament | null;
  onBack: () => void;
}> = ({ isInternal, tournament, onBack }) => (
  <div className="bg-white border-b shadow-sm sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {isInternal ? 'Back to Panel' : 'Back to Login'}
        </Button>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-red-500 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800">Player Registration</h1>
          {tournament && (
            <p className="text-xs text-slate-500 font-mono">{tournament.tournament_code}</p>
          )}
        </div>
      </div>
      {tournament && (
        <div className="hidden md:block text-sm text-slate-600 truncate max-w-xs">
          {tournament.name}
        </div>
      )}
    </div>
  </div>
);

// ─── Left aside (30%) — required docs / tournament info / pricing ───────────
const RegistrationInfoPanel: React.FC<{
  tournament: Tournament | null;
  pricing: { firstEventFee: number; additionalEventFee: number; totalFee: number };
}> = ({ tournament, pricing }) => {
  const REQUIRED_DOCS = [
    'Aadhaar / Government Photo ID (mandatory)',
    'Recent passport-size photograph',
    'Belt / Dan certificate',
    'Guardian consent (if minor)',
    'Medical fitness declaration',
  ];
  return (
    <>
      <Card className="border-blue-100">
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" /> Documents required
          </h3>
          <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
            {REQUIRED_DOCS.map((d) => <li key={d}>{d}</li>)}
          </ul>
          <p className="text-xs text-slate-500">
            Originals must be presented at the venue for verification before check-in.
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-100 bg-amber-50/40">
        <CardContent className="pt-5 space-y-2">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Download className="h-4 w-4 text-amber-700" /> Forms to download
          </h3>
          <a
            href="/forms/player-registration.pdf"
            download
            className="block text-sm text-blue-700 hover:underline"
          >
            Player registration form
          </a>
          <a
            href="/forms/medical-fitness.pdf"
            download
            className="block text-sm text-blue-700 hover:underline"
          >
            Medical fitness declaration
          </a>
          <a
            href="/forms/guardian-consent.pdf"
            download
            className="block text-sm text-blue-700 hover:underline"
          >
            Guardian consent form
          </a>
        </CardContent>
      </Card>

      {tournament && (
        <Card>
          <CardContent className="pt-5 space-y-2 text-sm">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Tournament
            </h3>
            <div className="text-slate-600 space-y-1">
              <div><span className="text-slate-400">Code:</span> <span className="font-mono">{tournament.tournament_code}</span></div>
              <div><span className="text-slate-400">Name:</span> {tournament.name}</div>
              {tournament.venue && <div><span className="text-slate-400">Venue:</span> {tournament.venue}</div>}
              <div><span className="text-slate-400">Dates:</span> {tournament.start_date} → {tournament.end_date}</div>
            </div>
            <div className="border-t pt-2 mt-2 text-slate-700">
              <div className="flex justify-between"><span>First event</span><span>₹ {pricing.firstEventFee}</span></div>
              <div className="flex justify-between"><span>Additional event</span><span>₹ {pricing.additionalEventFee}</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PlayerRegistrationPage;
