import { useState, useRef, useEffect } from 'react';
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
  QrCode, Search, CheckCircle, AlertCircle, User, Weight, CreditCard,
  MapPin, GraduationCap, Phone, Calendar, Shield, UserCog, Trophy, Camera, CameraOff,
  PlusCircle, History, RefreshCw,
} from 'lucide-react';
import jsQR from 'jsqr';
import { checkinService, type CheckinPlayer, type CheckinData } from '@/services/checkinService';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { staffService, type StaffTournamentScope } from '@/services/staffService';
import { useAuthStore } from '@/store/useAuthStore';
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
  assigned_role?: string;
};

export default function VerifyPage() {
  const { toast } = useToast();
  const authUser = useAuthStore((s) => s.user);
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const [payUpdateRef, setPayUpdateRef] = useState('');
  const [payUpdateReason, setPayUpdateReason] = useState('Balance collection');
  const [payUpdateNotes, setPayUpdateNotes] = useState('');
  const [payUpdating, setPayUpdating] = useState(false);

  useEffect(() => {
    void loadTournamentScope();
    return () => stopScanner();
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // Use jsQR as universal fallback — works in all browsers
      scanIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          // Extract player code - handle both plain code and encoded formats like "CODE|tournament|name"
          let rawCode = code.data.trim();
          if (rawCode.includes('|')) rawCode = rawCode.split('|')[0];
          const cleaned = rawCode.toUpperCase();
          setPlayerCode(cleaned);
          stopScanner();
          lookupPlayer(cleaned);
        }
      }, 250);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else {
        setError('Could not start camera. Try entering the player code manually.');
      }
    }
  }

  function stopScanner() {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
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
        const calculatedFee = data.events.reduce((sum, event) => sum + Number(event.entry_fee_paid ?? 0), 0);
        if (calculatedFee > 0) {
          setTotalFee(String(calculatedFee));
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
      const updated = await checkinService.lookupPlayer(playerCode.trim());
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
        paymentMethod: payUpdateMethod,
        paymentReference: payUpdateRef || undefined,
        reasonCode: payUpdateReason,
        reasonNotes: payUpdateNotes || undefined,
      });
      toast({ title: 'Payment updated', description: `₹${payUpdateAmount} recorded via ${payUpdateMethod}` });
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
  }

  const playerName = player?.player.full_name
    || `${player?.player.first_name ?? ''} ${player?.player.last_name ?? ''}`.trim();
  const balance = player?.checkin ? Number(player.checkin.balance) : 0;
  const selectedTournament = availableTournaments.find((t) => t.id === selectedTournamentId) ?? null;

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

          {scanning && (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video ref={videoRef} className="w-full max-h-64 object-cover" muted playsInline autoPlay />
              {/* Hidden canvas for jsQR processing */}
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-green-400 rounded-lg">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-green-400 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-green-400 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-green-400 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-green-400 rounded-br" />
                </div>
              </div>
              <p className="text-xs text-white/80 text-center py-2 bg-black/50 absolute bottom-0 w-full">
                📷 Align QR code within the frame
              </p>
            </div>
          )}
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
                  <div>
                    <p className="font-semibold text-lg">{playerName}</p>
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
                <CardTitle className="text-sm font-medium">Enrolled Events ({player.events.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {player.events.length > 0 ? (
                  <div className="space-y-1.5">
                    {player.events.map(evt => (
                      <div key={evt.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                        <span className="capitalize font-medium">{evt.event_type?.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground text-xs">
                          {evt.age_category ? `${evt.age_category} ` : ''}{evt.gender ? `${evt.gender} ` : ''}{evt.weight_category || evt.category_name || ''}
                        </span>
                        {evt.status && <Badge variant="outline" className="capitalize text-xs">{evt.status}</Badge>}
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
    </div>
  );
}
