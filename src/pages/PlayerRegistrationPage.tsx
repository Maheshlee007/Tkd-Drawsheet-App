import React, { useState } from 'react';
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
import {
  BELT_LEVELS, getAgeCategory, getWeightCategory, isMinor, isValidAadhaarFormat, calculateAge,
} from '@/utils/categoryUtils';
import { useToast } from '@/hooks/use-toast';
import { generateRegistrationPDF } from '@/utils/registrationPDF';

const STEPS = ['Basic Info', 'TKD Details', 'Verification', 'Review & Submit'];

const PlayerRegistrationPage: React.FC = () => {
  const [, navigate] = useLocation();
  const params = useParams<{ tournamentCode?: string }>();
  const tournamentCode = params?.tournamentCode || '';
  const { toast } = useToast();
  const addPlayer = usePlayerStore((s) => s.addPlayer);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [registeredPlayer, setRegisteredPlayer] = useState<PlayerRegistration | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

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
  const canProceedStep1 = beltColor && weight > 0;

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
      const player = addPlayer({
        tournamentCode,
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
      });
      setRegisteredPlayer(player);
      try {
        const QRCode = await import('qrcode');
        const qrText = `${player.playerCode}|${tournamentCode}|${fullName}`;
        const url = await QRCode.toDataURL(qrText, { width: 200, margin: 1 });
        setQrDataUrl(url);
      } catch { /* QR non-critical */ }
      toast({ title: 'Registration Complete', description: `Player code: ${player.playerCode}` });
    } catch {
      toast({ title: 'Error', description: 'Registration failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

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
    setOccupation('');
  };

  if (registeredPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Header onLogin={() => navigate('/login')} />
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
      <Header onLogin={() => navigate('/login')} />
      <div className="max-w-3xl mx-auto px-4 py-6">
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
          <CardContent className="space-y-4">
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
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2 flex gap-2">
                    {aadhaarVerified && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Aadhaar</Badge>}
                    {emailVerified && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Email</Badge>}
                    {!aadhaarVerified && !emailVerified && <Badge variant="outline" className="text-xs">No verification</Badge>}
                  </div>
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
                }}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!termsAccepted || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Submit Registration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
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

export default PlayerRegistrationPage;
