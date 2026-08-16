import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  QrCode, Search, CheckCircle, AlertCircle, AlertTriangle, User, Weight, CreditCard,
  MapPin, GraduationCap, Phone, Calendar, Shield, UserCog, Trophy, Camera, CameraOff,
  PlusCircle, History, RefreshCw, Pencil, Check, X,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { checkinService, type CheckinPlayer, type CheckinData } from '@/services/checkinService';
import { weightCategoryService, type WeightCategory } from '@/services/weightCategoryService';
import {
  normalizeWeightAssociationType, resolveWeightCategoryFromRows, formatWeightCategoryLabel,
} from '@/utils/weightCategoryUtils';
import { apiRequest } from '@/services/api';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { staffService, type StaffTournamentScope } from '@/services/staffService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTournamentStore } from '@/store/useTournamentStore';
import { useToast } from '@/hooks/use-toast';

const PAYMENT_REASONS = [
  'Full payment',
  'Balance collection',
  'Additional event fee',
  'Late registration fee',
  'Penalty payment',
  'Other',
];

type VerifyTournamentOption = Pick<Tournament, 'id' | 'tournament_code' | 'name' | 'status' | 'start_date' | 'end_date'> & {
  association_type?: string | null;
  assigned_role?: string;
};

/** Poll for the scanner container div rendered inside the dialog (replaces a blind sleep). */
async function waitForScannerContainer(elementId: string, timeoutMs = 2000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (document.getElementById(elementId)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

function isCameraPermissionError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? '';
  return name === 'NotAllowedError' || /permission|denied/i.test(String((err as { message?: string })?.message ?? err ?? ''));
}

/** Turn a camera/scanner start failure into an actionable message for the officer. */
function describeCameraError(err: unknown): string {
  const name = (err as { name?: string })?.name ?? '';
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  if (isCameraPermissionError(err)) {
    return 'Camera permission denied. Allow camera access for this site in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || /no camera|not found|requested device/i.test(msg)) {
    return 'No camera was found on this device. Enter the player code manually instead.';
  }
  if (name === 'NotReadableError' || /in use|not readable|could not start video/i.test(msg)) {
    return 'The camera is unavailable — it may be in use by another app. Close other apps using the camera and try again.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'Camera access requires a secure connection. Open this page over HTTPS (or on localhost) to use the QR scanner.';
  }
  return 'Could not start the camera. Try again, or enter the player code manually.';
}

export default function VerifyPage() {
  const { toast } = useToast();
  const authUser = useAuthStore((s) => s.user);
  const setActiveTournamentContext = useTournamentStore((state) => state.setActiveTournamentContext);
  const clearActiveTournamentContext = useTournamentStore((state) => state.clearActiveTournamentContext);
  const [playerCode, setPlayerCode] = useState('');
  const [player, setPlayer] = useState<CheckinPlayer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableTournaments, setAvailableTournaments] = useState<VerifyTournamentOption[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  // QR Scanner
  const [scanning, setScanning] = useState(false);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const [scannerDialogOpen, setScannerDialogOpen] = useState(false);

  // Check-in form state
  const [weight, setWeight] = useState('');
  const [weighInPassed, setWeighInPassed] = useState(true);
  const [totalFee, setTotalFee] = useState('500');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gpay' | 'upi' | 'card' | 'online' | 'waived'>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment update (for already checked-in players)
  const [payUpdateOpen, setPayUpdateOpen] = useState(false);
  const [payUpdateAmount, setPayUpdateAmount] = useState('');
  const [payUpdateMethod, setPayUpdateMethod] = useState<'cash' | 'gpay' | 'upi' | 'card' | 'online' | 'waived'>('cash');
  const [payUpdateType, setPayUpdateType] = useState<'payment' | 'refund' | 'adjustment' | 'waiver'>('payment');
  const [payUpdateRef, setPayUpdateRef] = useState('');
  const [payUpdateReason, setPayUpdateReason] = useState('Balance collection');
  const [payUpdateNotes, setPayUpdateNotes] = useState('');
  const [payUpdating, setPayUpdating] = useState(false);

  // Name correction
  const [nameEditing, setNameEditing] = useState(false);
  const [correctedName, setCorrectedName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Weight category suggestion
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [categoryMismatch, setCategoryMismatch] = useState(false);
  const [weightRows, setWeightRows] = useState<WeightCategory[]>([]);
  const [eventManageOpen, setEventManageOpen] = useState(false);

  useEffect(() => {
    void loadTournamentScope();
    return () => { void stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.email]);

  async function loadTournamentScope() {
    setLoadingTournaments(true);
    try {
      const roles = (authUser?.roles ?? []).map((r) => String(r).toLowerCase());
      const isPrivileged = roles.some((r) => ['admin', 'organizer', 'manager'].includes(r));

      let options: VerifyTournamentOption[] = [];
      if (isPrivileged) {
        const all = await tournamentService.listTournaments({ limit: 200 });
        options = all.map((t) => ({
          id: t.id,
          tournament_code: t.tournament_code,
          name: t.name,
          status: t.status,
          start_date: t.start_date,
          end_date: t.end_date,
          association_type: t.association_type,
        }));
      } else {
        const scoped = await staffService.myTournaments();
        options = (scoped.data ?? []) as StaffTournamentScope[];
      }

      setAvailableTournaments(options);

      if (options.length > 0) {
        const preferred = options.find((t) => ['registration_open', 'in_progress'].includes(t.status));
        setSelectedTournamentId((preferred ?? options[0]).id);
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to load assigned tournaments for verification.');
    } finally {
      setLoadingTournaments(false);
    }
  }

  async function startScanner() {
    setError('');
    if (!selectedTournamentId) {
      setError('Select a tournament before starting QR scan.');
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Camera access requires a secure connection. Open this page over HTTPS (or on localhost) to use the QR scanner.');
      return;
    }
    setScannerDialogOpen(true);
    setScanning(true);

    // Wait for the dialog DOM to render the scanner container
    const containerReady = await waitForScannerContainer('qr-reader-container');
    if (!containerReady) {
      setError('Scanner failed to initialise. Please try again.');
      setScannerDialogOpen(false);
      setScanning(false);
      return;
    }

    const startCamera = async () => {
      const qr = new Html5Qrcode('qr-reader-container');
      html5QrRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          let rawCode = decodedText.trim();
          if (rawCode.includes('|')) rawCode = rawCode.split('|')[0];
          const cleaned = rawCode.toUpperCase();
          setPlayerCode(cleaned);
          void stopScanner();
          void lookupPlayer(cleaned);
        },
        () => { /* ignore scan failures */ }
      );
    };

    const cleanupFailedStart = () => {
      try { html5QrRef.current?.clear(); } catch { /* ignore */ }
      html5QrRef.current = null;
    };

    try {
      await startCamera();
    } catch (firstErr) {
      cleanupFailedStart();
      // Permission denials won't recover on an immediate retry — fail fast with guidance.
      if (isCameraPermissionError(firstErr)) {
        setError(describeCameraError(firstErr));
        setScannerDialogOpen(false);
        setScanning(false);
        return;
      }
      // Transient failures (camera warming up, previous instance releasing) — retry once.
      await new Promise((r) => setTimeout(r, 500));
      try {
        await startCamera();
      } catch (err) {
        cleanupFailedStart();
        setError(describeCameraError(err));
        setScannerDialogOpen(false);
        setScanning(false);
      }
    }
  }

  async function stopScanner() {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch { /* already stopped */ }
      html5QrRef.current = null;
    }
    setScanning(false);
    setScannerDialogOpen(false);
  }

  async function lookupPlayer(code: string) {
    if (!code.trim()) return;
    if (!selectedTournamentId) {
      setError('Select a tournament first.');
      return;
    }
    setLoading(true); setError(''); setPlayer(null); setSuccess('');
    try {
      const data = await checkinService.lookupPlayer(code.trim(), selectedTournamentId);
      setPlayer(data);
      if (data.player.weight_kg) setWeight(String(data.player.weight_kg));
      if (!data.checkin) {
        // Server-computed amount due (includes any late fee) takes priority;
        // fall back to summing per-event fees for older responses.
        const amountDue = (data as CheckinPlayer & { amount_due?: number | string | null }).amount_due;
        if (amountDue != null && Number.isFinite(Number(amountDue))) {
          setTotalFee(String(Number(amountDue)));
        } else {
          const calculatedFee = data.events.reduce((sum, event) => sum + Number(event.entry_fee_paid ?? 0), 0);
          if (calculatedFee > 0) {
            setTotalFee(String(calculatedFee));
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Player not found');
    } finally { setLoading(false); }
  }

  async function handleCheckin() {
    if (!player) return;
    setSubmitting(true); setError('');
    try {
      const data: CheckinData = {
        playerId: player.player.id,
        tournamentId: selectedTournamentId || player.player.tournament_id,
        weightRecordedKg: weight ? parseFloat(weight) : undefined,
        weighInPassed,
        eventsConfirmed: player.events.map(e => e.id),
        totalFee: parseFloat(totalFee) || 0,
        amountPaid: parseFloat(amountPaid) || 0,
        paymentMethod,
        paymentReference: paymentRef || undefined,
        notes: notes || undefined,
      };
      await checkinService.createCheckin(data);
      setSuccess('Check-in recorded successfully!');
      const updated = await checkinService.lookupPlayer(playerCode.trim(), selectedTournamentId || undefined);
      setPlayer(updated);
    } catch (e: any) {
      setError(e.message || 'Check-in failed');
    } finally { setSubmitting(false); }
  }

  async function handlePaymentUpdate() {
    if (!player?.checkin?.id || !payUpdateAmount) return;
    setPayUpdating(true);
    try {
      await checkinService.updatePayment(player.checkin.id, {
        amountPaid: parseFloat(payUpdateAmount),
        transactionType: payUpdateType,
        paymentMethod: payUpdateMethod,
        paymentReference: payUpdateRef || undefined,
        reasonCode: payUpdateReason,
        reasonNotes: payUpdateNotes || undefined,
      });
      toast({ title: 'Payment updated', description: `₹${payUpdateAmount} ${payUpdateType} via ${payUpdateMethod}` });
      setPayUpdateOpen(false);
      setPayUpdateAmount(''); setPayUpdateRef(''); setPayUpdateNotes('');
      const updated = await checkinService.lookupPlayer(playerCode.trim(), selectedTournamentId || undefined);
      setPlayer(updated);
      setSuccess('Payment updated successfully!');
    } catch (e: any) {
      toast({ title: 'Payment update failed', description: e.message, variant: 'destructive' });
    } finally { setPayUpdating(false); }
  }

  function reset() {
    setPlayerCode(''); setPlayer(null); setError(''); setSuccess('');
    setWeight(''); setWeighInPassed(true); setTotalFee('500'); setAmountPaid('');
    setPaymentMethod('cash'); setPaymentRef(''); setNotes(''); stopScanner();
    setNameEditing(false); setCorrectedName(''); setSuggestedCategory(''); setCategoryMismatch(false);
  }

  async function handleNameCorrection() {
    if (!player || !correctedName.trim()) return;
    setNameSaving(true);
    try {
      await apiRequest(`/api/players/${player.player.id}`, { method: 'PUT', body: { fullName: correctedName.trim() } });
      toast({ title: 'Name updated' });
      setNameEditing(false);
      const updated = await checkinService.lookupPlayer(playerCode.trim(), selectedTournamentId || undefined);
      setPlayer(updated);
    } catch (e: any) {
      toast({ title: 'Name update failed', description: e.message, variant: 'destructive' });
    } finally { setNameSaving(false); }
  }

  // Load weight-category reference data for the player's division (association + age category + gender)
  useEffect(() => {
    let cancelled = false;
    async function loadWeightRows() {
      const ageCategory = player?.player.age_category;
      const gender = player?.player.gender;
      if (!player || !ageCategory || !gender) {
        setWeightRows([]);
        return;
      }
      try {
        const tournament = availableTournaments.find((t) => t.id === selectedTournamentId);
        const association = normalizeWeightAssociationType(tournament?.association_type);
        const rows = await weightCategoryService.getAll({ association, age_category: ageCategory, gender });
        if (!cancelled) setWeightRows(rows);
      } catch {
        if (!cancelled) setWeightRows([]);
      }
    }
    void loadWeightRows();
    return () => { cancelled = true; };
  }, [player, selectedTournamentId, availableTournaments]);

  const registeredCategoryLabel = player?.player.weight_category
    || player?.events.find((e) => e.weight_category)?.weight_category
    || '';

  // Resolve the entered weigh-in weight to its actual weight class and flag mismatches vs registration
  useEffect(() => {
    const w = parseFloat(weight);
    if (!weight || !player || isNaN(w) || weightRows.length === 0) {
      setSuggestedCategory('');
      setCategoryMismatch(false);
      return;
    }
    const match = resolveWeightCategoryFromRows(w, weightRows);
    if (!match) {
      setSuggestedCategory('');
      setCategoryMismatch(false);
      return;
    }
    setSuggestedCategory(formatWeightCategoryLabel(match));
    // Mismatch when the registered category doesn't reference the weighed-in class (compare loosely by class name)
    const registered = registeredCategoryLabel.trim().toLowerCase();
    const weighedClass = match.weight_class.trim().toLowerCase();
    setCategoryMismatch(
      !!registered && !registered.includes(weighedClass) && !weighedClass.includes(registered)
    );
  }, [weight, player, weightRows, registeredCategoryLabel]);

  const playerName = player?.player.full_name
    || `${player?.player.first_name ?? ''} ${player?.player.last_name ?? ''}`.trim();
  const balance = player?.checkin ? Number(player.checkin.balance) : 0;
  const selectedTournament = availableTournaments.find((t) => t.id === selectedTournamentId) ?? null;

  useEffect(() => {
    if (!selectedTournament) {
      clearActiveTournamentContext();
      return;
    }
    setActiveTournamentContext(selectedTournament.tournament_code, selectedTournament.name, selectedTournament.association_type ?? null);
  }, [selectedTournament, setActiveTournamentContext, clearActiveTournamentContext]);

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <QrCode className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Verification & Check-in</h1>
      </div>

      {/* QR / Code lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Player Lookup</CardTitle>
          <CardDescription>Select your assigned tournament, then scan QR or enter player code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tournament Scope</Label>
            <Select
              value={selectedTournamentId}
              onValueChange={(v) => {
                setSelectedTournamentId(v);
                setPlayer(null);
                setError('');
                setSuccess('');
              }}
              disabled={loadingTournaments}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTournaments ? 'Loading tournaments...' : 'Select tournament'} />
              </SelectTrigger>
              <SelectContent>
                {availableTournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.tournament_code} • {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTournament && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Badge variant={['registration_open', 'in_progress'].includes(selectedTournament.status) ? 'default' : 'secondary'} className="capitalize">
                  {selectedTournament.status.replace(/_/g, ' ')}
                </Badge>
                <span>{selectedTournament.name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter player code..."
                value={playerCode}
                onChange={e => setPlayerCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && void lookupPlayer(playerCode)}
                disabled={!selectedTournamentId}
              />
            </div>
            <Button onClick={() => void lookupPlayer(playerCode)} disabled={loading || !selectedTournamentId}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Lookup'}
            </Button>
            <Button variant={scanning ? 'destructive' : 'outline'} onClick={() => void (scanning ? stopScanner() : startScanner())} disabled={!selectedTournamentId}>
              {scanning ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
              {scanning ? 'Stop' : 'QR Scan'}
            </Button>
            {player && <Button variant="outline" onClick={reset}><RefreshCw className="h-4 w-4" /></Button>}
          </div>

          {/* QR Scanner Dialog Popup */}
          <Dialog open={scannerDialogOpen} onOpenChange={(open) => { if (!open) void stopScanner(); }}>
            <DialogContent className="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" /> Scan QR Code
                </DialogTitle>
              </DialogHeader>
              <div className="relative rounded-lg overflow-hidden bg-black min-h-[300px]">
                <div id="qr-reader-container" className="w-full" />
              </div>
              <p className="text-xs text-center text-slate-500">
                Position the player's QR code within the viewfinder
              </p>
              <DialogFooter>
                <Button variant="destructive" onClick={() => void stopScanner()}>
                  <CameraOff className="h-4 w-4 mr-2" /> Close Scanner
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-800 p-3 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      {player && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Player Info — Full Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Player Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {playerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    {nameEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={correctedName}
                          onChange={e => setCorrectedName(e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Corrected name..."
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNameCorrection} disabled={nameSaving}>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setNameEditing(false)}>
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-lg">{playerName}</p>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setCorrectedName(playerName); setNameEditing(true); }}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                    <p className="text-sm font-mono text-muted-foreground">{player.player.player_code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><User className="h-3.5 w-3.5" /> Gender</div>
                  <span className="capitalize font-medium">{player.player.gender}</span>

                  <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> DOB</div>
                  <span className="font-medium">{player.player.date_of_birth ? new Date(player.player.date_of_birth).toLocaleDateString() : '-'}</span>

                  <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Phone</div>
                  <span className="font-medium">{player.player.phone || '-'}</span>

                  {player.player.belt_color && <>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Shield className="h-3.5 w-3.5" /> Belt</div>
                    <span className="font-medium">{player.player.belt_color}</span>
                  </>}

                  {player.player.weight_kg != null && <>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Weight className="h-3.5 w-3.5" /> Reg Weight</div>
                    <span className="font-medium">{player.player.weight_kg} kg</span>
                  </>}

                  {player.player.age_category && <>
                    <div className="text-muted-foreground">Age Cat</div>
                    <span className="font-medium">{player.player.age_category}</span>
                  </>}

                  {player.player.weight_category && <>
                    <div className="text-muted-foreground">Weight Cat</div>
                    <span className="font-medium">{player.player.weight_category}</span>
                  </>}

                  {player.player.club_name && <>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Trophy className="h-3.5 w-3.5" /> Club</div>
                    <span className="font-medium">{player.player.club_name}</span>
                  </>}

                  {player.player.coach_name && <>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><UserCog className="h-3.5 w-3.5" /> Coach</div>
                    <span className="font-medium">{player.player.coach_name}</span>
                  </>}

                  {player.player.state && <>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Location</div>
                    <span className="font-medium">{player.player.city ? `${player.player.city}, ` : ''}{player.player.state}</span>
                  </>}

                  {player.player.school_college && <>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><GraduationCap className="h-3.5 w-3.5" /> School</div>
                    <span className="font-medium">{player.player.school_college}</span>
                  </>}
                </div>

                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Badge variant={player.player.registration_status === 'verified' ? 'default' : 'secondary'} className="capitalize">
                    Reg: {player.player.registration_status || 'unknown'}
                  </Badge>
                  <Badge variant={player.player.payment_status === 'paid' ? 'default' : 'destructive'} className="capitalize">
                    Pay: {player.player.payment_status || 'unknown'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Enrolled Events ({player.events.length})</span>
                  {!player.checkin && (
                    <Button variant="outline" size="sm" onClick={() => setEventManageOpen(true)}>
                      <Pencil className="h-3 w-3 mr-1" /> Manage
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {player.events.length > 0 ? (
                  <div className="space-y-1.5">
                    {player.events.map(evt => (
                      <div key={evt.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                        <span className="capitalize font-medium">{evt.event_type?.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {evt.age_category ? `${evt.age_category} ` : ''}{evt.gender ? `${evt.gender} ` : ''}{evt.weight_category || evt.category_name || ''}
                          </span>
                          {evt.status && <Badge variant="outline" className="capitalize text-xs">{evt.status}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No events enrolled</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Check-in form or status */}
          <div className="space-y-4">
            {player.checkin ? (
              <>
                <Card className={balance > 0 ? 'border-orange-200 bg-orange-50/50' : 'border-green-200 bg-green-50/50'}>
                  <CardHeader>
                    <CardTitle className={`text-lg flex items-center gap-2 ${balance > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                      <CheckCircle className="h-5 w-5" />
                      {balance > 0 ? 'Checked In — Balance Pending' : 'Fully Checked In'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className="capitalize w-fit">{player.checkin.status}</Badge>
                      <span className="text-muted-foreground">Weight</span>
                      <span className="font-medium">
                        {player.checkin.weight_recorded_kg} kg
                        <span className={`ml-1 text-xs ${player.checkin.weigh_in_passed ? 'text-green-600' : 'text-red-600'}`}>
                          ({player.checkin.weigh_in_passed ? '✓ Passed' : '✗ Failed'})
                        </span>
                      </span>
                      <span className="text-muted-foreground">Total Fee</span>
                      <span className="font-medium">₹{player.checkin.total_fee}</span>
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium text-green-700">₹{player.checkin.amount_paid}</span>
                      {balance > 0 && <>
                        <span className="text-muted-foreground font-medium">Balance Due</span>
                        <span className="font-bold text-red-600">₹{balance}</span>
                      </>}
                      <span className="text-muted-foreground">Method</span>
                      <span className="font-medium capitalize">{player.checkin.payment_method || '-'}</span>
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{new Date(player.checkin.checked_in_at).toLocaleString()}</span>
                      {player.checkin.verified_by_name && <>
                        <span className="text-muted-foreground">Verified By</span>
                        <span className="font-medium">{player.checkin.verified_by_name}</span>
                      </>}
                    </div>

                    {balance > 0 && (
                      <Button className="w-full mt-2" onClick={() => setPayUpdateOpen(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Collect Balance Payment (₹{balance})
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setPayUpdateOpen(true)}>
                      <History className="h-4 w-4 mr-2" /> Add Payment / Adjustment
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Weight className="h-4 w-4" /> Weigh-in & Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Actual Weight (kg)</Label>
                    <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 66.5" />
                    {suggestedCategory && !categoryMismatch && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Weighed into: <span className="font-medium text-primary">{suggestedCategory}</span>
                        {registeredCategoryLabel && <span className="text-green-600 ml-1">(matches registration)</span>}
                      </p>
                    )}
                    {suggestedCategory && categoryMismatch && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>
                          <span className="font-semibold">Weight category mismatch:</span>{' '}
                          registered <span className="font-semibold">{registeredCategoryLabel}</span>{' '}
                          but weighed into <span className="font-semibold">{suggestedCategory}</span>.
                          Verify the weigh-in result and event enrolment before check-in.
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Weigh-in Result</Label>
                    <div className="flex gap-2 mt-1">
                      <Button size="sm" variant={weighInPassed ? 'default' : 'outline'} onClick={() => setWeighInPassed(true)}
                        className={weighInPassed ? 'bg-green-600 hover:bg-green-700' : ''}>✓ Passed</Button>
                      <Button size="sm" variant={!weighInPassed ? 'default' : 'outline'} onClick={() => setWeighInPassed(false)}
                        className={!weighInPassed ? 'bg-red-600 hover:bg-red-700' : ''}>✗ Failed</Button>
                    </div>
                  </div>
                  <Separator />
                  {authUser && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 px-3 py-1.5 rounded">
                      <User className="h-3 w-3" /> Verifier: <span className="font-medium text-foreground">{authUser.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><Label className="font-medium">Payment</Label></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Total Fee (₹)</Label><Input type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} /></div>
                    <div><Label>Amount Paid (₹)</Label><Input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as typeof paymentMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="gpay">GPay</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="waived">Waived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Reference</Label><Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Transaction ID (optional)" /></div>
                  <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." /></div>
                  <Button className="w-full" onClick={handleCheckin} disabled={submitting}>
                    <CheckCircle className="h-4 w-4 mr-2" />{submitting ? 'Recording...' : 'Record Check-in'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Payment Update Dialog */}
      <Dialog open={payUpdateOpen} onOpenChange={setPayUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Add Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {player?.checkin && balance > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-orange-800">Balance Due: ₹{balance}</p>
                <p className="text-orange-600 text-xs">Total: ₹{player.checkin.total_fee} | Paid: ₹{player.checkin.amount_paid}</p>
              </div>
            )}
            <div>
              <Label>Transaction Type</Label>
              <Select value={payUpdateType} onValueChange={v => setPayUpdateType(v as typeof payUpdateType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment — collect amount now</SelectItem>
                  <SelectItem value="refund">Refund — return amount</SelectItem>
                  <SelectItem value="adjustment">Adjustment — set corrected paid total</SelectItem>
                  <SelectItem value="waiver">Waiver — waive part of the balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                value={payUpdateAmount}
                onChange={e => setPayUpdateAmount(e.target.value)}
                placeholder={balance > 0 ? `Balance: ₹${balance}` : 'Enter amount'}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Select value={payUpdateReason} onValueChange={setPayUpdateReason}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payUpdateMethod} onValueChange={v => setPayUpdateMethod(v as typeof payUpdateMethod)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gpay">GPay</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction Reference</Label>
              <Input value={payUpdateRef} onChange={e => setPayUpdateRef(e.target.value)} placeholder="e.g. GPay txn ID" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={payUpdateNotes} onChange={e => setPayUpdateNotes(e.target.value)} placeholder="Optional notes about this payment..." rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayUpdateOpen(false)}>Cancel</Button>
            <Button onClick={handlePaymentUpdate} disabled={payUpdating || !payUpdateAmount}>
              {payUpdating ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Management Dialog */}
      <Dialog open={eventManageOpen} onOpenChange={setEventManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Events</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Add or remove events for this player. Fee adjustments will be reflected in the payment section.
            </p>
            {player && player.events.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Current Events</Label>
                {player.events.map(evt => (
                  <div key={evt.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <span className="text-sm capitalize">{evt.event_type?.replace(/_/g, ' ')}</span>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-7 px-2"
                      onClick={() => {
                        toast({ title: 'Remove Event', description: `Event removal for "${evt.event_type}" will be supported via API. Contact organizer for now.`, variant: 'destructive' });
                      }}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <div>
              <Label className="text-xs font-medium">Add New Event</Label>
              <div className="flex gap-2 mt-1">
                <Select>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kyorugi">Kyorugi (Sparring)</SelectItem>
                    <SelectItem value="poomsae">Poomsae (Forms)</SelectItem>
                    <SelectItem value="pair_poomsae">Pair Poomsae</SelectItem>
                    <SelectItem value="group_poomsae">Group Poomsae</SelectItem>
                    <SelectItem value="board_breaking">Board Breaking</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => {
                  toast({ title: 'Add Event', description: 'Event addition will be available via API integration. Contact organizer.' });
                }}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Additional event fee will be added to the player's total.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventManageOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
