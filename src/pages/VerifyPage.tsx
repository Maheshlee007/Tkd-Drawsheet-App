import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QrCode, Search, CheckCircle, AlertCircle, User, Weight, CreditCard } from 'lucide-react';
import { checkinService, type CheckinPlayer, type CheckinData } from '@/services/checkinService';

export default function VerifyPage() {
  const [playerCode, setPlayerCode] = useState('');
  const [player, setPlayer] = useState<CheckinPlayer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check-in form
  const [weight, setWeight] = useState('');
  const [weightStatus, setWeightStatus] = useState<'pass' | 'fail' | 'overweight' | 'underweight'>('pass');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gpay' | 'bank_transfer' | 'other'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [submitting, setSubmitting] = useState(false);

  async function handleLookup() {
    if (!playerCode.trim()) return;
    setLoading(true);
    setError('');
    setPlayer(null);
    setSuccess('');
    try {
      const data = await checkinService.lookupPlayer(playerCode.trim());
      setPlayer(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin() {
    if (!player || !weight) return;
    setSubmitting(true);
    setError('');
    try {
      const data: CheckinData = {
        player_id: player.player.id,
        tournament_id: '', // Will be inferred from player
        actual_weight_kg: parseFloat(weight),
        weight_status: weightStatus,
        payment_amount: parseFloat(paymentAmount) || 0,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
      };
      await checkinService.createCheckin(data);
      setSuccess('Check-in recorded successfully!');
      // Refresh player data
      const updated = await checkinService.lookupPlayer(playerCode.trim());
      setPlayer(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPlayerCode('');
    setPlayer(null);
    setError('');
    setSuccess('');
    setWeight('');
    setWeightStatus('pass');
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentStatus('paid');
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <QrCode className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Verification & Check-in</h1>
      </div>

      {/* QR / Code lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Player Lookup</CardTitle>
          <CardDescription>Scan QR code or enter player code (e.g. TKD-XXXXX)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter player code..."
                value={playerCode}
                onChange={e => setPlayerCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
              />
            </div>
            <Button onClick={handleLookup} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Lookup'}
            </Button>
            {player && (
              <Button variant="outline" onClick={reset}>Clear</Button>
            )}
          </div>
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

      {/* Player Details */}
      {player && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Player Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" /> Player Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{player.player.first_name} {player.player.last_name}</span>
                <span className="text-muted-foreground">Code:</span>
                <span className="font-mono font-medium">{player.player.player_code}</span>
                <span className="text-muted-foreground">Gender:</span>
                <span className="capitalize">{player.player.gender}</span>
                <span className="text-muted-foreground">DOB:</span>
                <span>{new Date(player.player.date_of_birth).toLocaleDateString()}</span>
                <span className="text-muted-foreground">Phone:</span>
                <span>{player.player.phone}</span>
                {player.player.club_name && <>
                  <span className="text-muted-foreground">Club:</span>
                  <span>{player.player.club_name}</span>
                </>}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Enrolled Events:</p>
                <div className="flex flex-wrap gap-1">
                  {player.events.map(evt => (
                    <Badge key={evt.id} variant="outline">{evt.category_name} — {evt.event_type}</Badge>
                  ))}
                  {player.events.length === 0 && <p className="text-sm text-muted-foreground">No events enrolled</p>}
                </div>
              </div>

              {/* Existing check-in status */}
              {player.checkin && (
                <>
                  <Separator />
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-green-800 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Already Checked In
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Weight: {player.checkin.actual_weight_kg}kg ({player.checkin.weight_status}) |
                      Payment: ₹{player.checkin.payment_amount} ({player.checkin.payment_status})
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Check-in Form */}
          {!player.checkin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Weight className="h-4 w-4" /> Weigh-in & Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Actual Weight (kg) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="e.g. 58.5"
                  />
                </div>

                <div>
                  <Label>Weight Status</Label>
                  <div className="flex gap-1 mt-1">
                    {(['pass', 'overweight', 'underweight', 'fail'] as const).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={weightStatus === s ? 'default' : 'outline'}
                        onClick={() => setWeightStatus(s)}
                        className={weightStatus === s && s === 'pass' ? 'bg-green-600 hover:bg-green-700' : weightStatus === s && s === 'fail' ? 'bg-red-600 hover:bg-red-700' : 'capitalize'}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <Label className="font-medium">Payment</Label>
                </div>

                <div>
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>

                <div>
                  <Label>Method</Label>
                  <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="gpay">GPay / UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment Status</Label>
                  <div className="flex gap-1 mt-1">
                    {(['paid', 'partial', 'unpaid'] as const).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={paymentStatus === s ? 'default' : 'outline'}
                        onClick={() => setPaymentStatus(s)}
                        className="capitalize"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={handleCheckin} disabled={submitting || !weight}>
                  {submitting ? 'Recording...' : 'Record Check-in'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
