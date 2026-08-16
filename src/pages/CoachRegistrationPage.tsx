import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  UserCog, ArrowLeft, CheckCircle, FileText, ShieldCheck, Loader2,
  Download, Trophy, Eye, EyeOff, AlertTriangle, Share2,
} from 'lucide-react';
import { coachService } from '@/services/coachService';
import { tournamentService, type Tournament } from '@/services/tournamentService';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { AutoCloseErrorModal } from '@/components/AutoCloseErrorModal';
import { CoachIdCardPreview } from '@/components/coach/CoachIdCardPreview';
import { buildCoachQrPayload, generateCoachIdCardPDFBlob } from '@/utils/coachIdCardPDF';

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

interface CoachSuccessState {
  coachCode: string;
  coachName: string;
  tournamentCode: string;
  tournamentName: string;
  photoUrl?: string;
  beltRank?: string;
  experienceYears?: number;
}

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

  const [registrationReady, setRegistrationReady] = useState(false);
  const [gatewayOpen, setGatewayOpen] = useState(true);
  const [registrationMode, setRegistrationMode] = useState<'new' | 'existing'>('new');
  const [existingCoachCode, setExistingCoachCode] = useState('');
  const [existingSecretKey, setExistingSecretKey] = useState('');
  const [showExistingSecret, setShowExistingSecret] = useState(false);
  const [loadingExistingProfile, setLoadingExistingProfile] = useState(false);
  const [existingProfileLoaded, setExistingProfileLoaded] = useState(false);

  const [showFormSecret, setShowFormSecret] = useState(false);
  const [updateReason, setUpdateReason] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clubName: '',
    beltRank: '',
    poomDanNumber: '',
    aadhaarNumber: '',
    experienceYears: 0,
    photoUrl: '',
    registrationSecret: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<CoachSuccessState | null>(null);
  const [coachQrDataUrl, setCoachQrDataUrl] = useState<string | null>(null);

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const previewBlobRef = useRef<string | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);
  const isMobile = useIsMobile();

  // navigator.share with files — available on most mobile browsers, rarely on desktop
  const canSharePdf = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
    try {
      return nav.canShare({ files: [new File([new Blob()], 'test.pdf', { type: 'application/pdf' })] });
    } catch {
      return false;
    }
  }, []);

  const coachFormLinks = tournament?.coach_form_links?.length
    ? tournament.coach_form_links
    : DOWNLOADABLE_FORMS.map(f => f.href);

  useEffect(() => {
    if (routeCode) void resolveTournament(routeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCode]);

  useEffect(() => {
    return () => {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
      }
    };
  }, []);

  // Guard against navigating away before the coach card PDF was downloaded
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!pdfPreviewOpen || pdfDownloaded) return;
      event.preventDefault();
      event.returnValue = 'Download the coach ID card PDF before leaving this page.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pdfPreviewOpen, pdfDownloaded]);

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
      setRegistrationReady(false);
      setGatewayOpen(true);
      setRegistrationMode('new');
      setExistingCoachCode('');
      setExistingSecretKey('');
      setExistingProfileLoaded(false);
      setUpdateReason('');
    } catch (e: any) {
      setTournament(null);
      setRegistrationReady(false);
      setGatewayOpen(true);
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

  async function handleLoadExistingProfile() {
    if (!tournament) {
      setModalError('Please verify tournament code first.');
      return;
    }
    if (!existingCoachCode.trim() || !existingSecretKey.trim()) {
      setModalError('Enter coach code and secret key to load existing profile.');
      return;
    }

    setLoadingExistingProfile(true);
    try {
      const profile = await coachService.lookupProfile(existingCoachCode.trim(), existingSecretKey.trim());
      setForm((prev) => ({
        ...prev,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        clubName: profile.clubName || '',
        beltRank: profile.beltRank || '',
        poomDanNumber: profile.poomDanNumber || '',
        experienceYears: Number(profile.experienceYears || 0),
        photoUrl: profile.photoUrl || '',
        registrationSecret: existingSecretKey.trim(),
      }));
      setUpdateReason('');
      setExistingProfileLoaded(true);
      toast({ title: 'Profile loaded', description: 'You can now update details and register for this tournament.' });
    } catch (e: any) {
      const msg = e?.message || 'Could not load coach profile.';
      setExistingProfileLoaded(false);
      setModalError(msg);
      toast({ title: 'Could not load profile', description: msg, variant: 'destructive' });
    } finally {
      setLoadingExistingProfile(false);
    }
  }

  function handleGatewayContinue() {
    if (!tournament) {
      setModalError('Please verify tournament code first.');
      return;
    }
    if (registrationMode === 'existing' && !existingProfileLoaded) {
      setModalError('Load your existing coach profile before continuing.');
      return;
    }
    setRegistrationReady(true);
    setGatewayOpen(false);
  }

  async function prepareCoachCardPdf(successData: CoachSuccessState, qrDataUrl: string | null) {
    const blob = await generateCoachIdCardPDFBlob({
      coachCode: successData.coachCode,
      coachName: successData.coachName,
      tournamentCode: successData.tournamentCode,
      tournamentName: successData.tournamentName,
      beltRank: successData.beltRank,
      experienceYears: successData.experienceYears,
      photoUrl: successData.photoUrl,
      qrDataUrl,
    });

    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
    }

    const objectUrl = URL.createObjectURL(blob);
    previewBlobRef.current = objectUrl;
    pdfBlobRef.current = blob;
    setPdfPreviewUrl(objectUrl);
    setPdfDownloaded(false);
    setPdfPreviewOpen(true);
  }

  async function triggerPdfDownload() {
    if (!pdfPreviewUrl || !success) return;
    const anchor = document.createElement('a');
    anchor.href = pdfPreviewUrl;
    anchor.download = `${success.coachCode}-coach-id-card.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setPdfDownloaded(true);
  }

  async function handleSharePdf() {
    const blob = pdfBlobRef.current;
    if (!blob || !success) return;
    const file = new File([blob], `${success.coachCode}-coach-id-card.pdf`, { type: 'application/pdf' });
    try {
      await (navigator as Navigator & { share: (data: { files: File[]; title?: string }) => Promise<void> })
        .share({ files: [file], title: 'Coach ID Card PDF' });
    } catch {
      // user cancelled or the share sheet failed — nothing to do
    }
  }

  function handlePdfDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && !pdfDownloaded) {
      const shouldDownload = window.confirm('Download the coach ID card PDF before closing?');
      if (shouldDownload) {
        void triggerPdfDownload();
      }
    }
    setPdfPreviewOpen(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!registrationReady || !tournament) {
      setError('Please complete tournament setup before submitting registration.');
      return;
    }
    if (!form.firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setError('Provide at least one contact detail: email or phone.');
      return;
    }
    if (form.phone.trim() && !/^(\+)?[0-9\s\-().]{8,25}$/.test(form.phone.trim())) {
      setError('Enter a valid phone number with country code (example: +1..., +44..., +91...).');
      return;
    }
    if (form.aadhaarNumber.trim() && !/^[2-9][0-9]{11}$/.test(form.aadhaarNumber.trim())) {
      setError('Aadhaar must be 12 digits and cannot start with 0 or 1.');
      return;
    }
    if (registrationMode === 'existing') {
      if (!existingProfileLoaded) {
        setError('Load your existing coach profile first.');
        return;
      }
      if (!updateReason.trim()) {
        setError('Reason for update is required for registered coach profiles.');
        return;
      }
    } else if (!form.registrationSecret.trim()) {
      setError('Secret key is required for new coach registration.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const coach = await coachService.register({
        tournamentCode: tournament.tournament_code,
        registrationMode,
        coachCode: registrationMode === 'existing' ? existingCoachCode.trim().toUpperCase() : undefined,
        registrationSecret: registrationMode === 'existing'
          ? existingSecretKey.trim()
          : form.registrationSecret.trim(),
        updateReason: registrationMode === 'existing' ? updateReason.trim() : undefined,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        clubName: form.clubName.trim() || undefined,
        beltRank: form.beltRank || undefined,
        poomDanNumber: form.poomDanNumber.trim() || undefined,
        aadhaarNumber: form.aadhaarNumber.trim() || undefined,
        experienceYears: form.experienceYears > 0 ? form.experienceYears : undefined,
        photo_url: form.photoUrl.trim() || undefined,
      });

      const successData: CoachSuccessState = {
        coachCode: coach.coach_code,
        coachName: `${form.firstName} ${form.lastName}`.trim(),
        tournamentCode: tournament.tournament_code,
        tournamentName: tournament.name,
        photoUrl: form.photoUrl.trim() || undefined,
        beltRank: form.beltRank || undefined,
        experienceYears: form.experienceYears || undefined,
      };

      setSuccess(successData);

      let qr: string | null = null;
      try {
        const QRCode = await import('qrcode');
        const payload = buildCoachQrPayload({
          coachCode: successData.coachCode,
          coachName: successData.coachName,
          tournamentCode: successData.tournamentCode,
          tournamentName: successData.tournamentName,
          beltRank: successData.beltRank,
          experienceYears: successData.experienceYears,
          photoUrl: successData.photoUrl,
        });
        qr = await QRCode.toDataURL(payload, { width: 260, margin: 1 });
      } catch {
        qr = null;
      }

      setCoachQrDataUrl(qr);
      await prepareCoachCardPdf(successData, qr);

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

  function resetFormForNextRegistration() {
    setSuccess(null);
    setCoachQrDataUrl(null);
    setPdfPreviewOpen(false);
    setPdfPreviewUrl(null);
    setPdfDownloaded(false);
    pdfBlobRef.current = null;
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      clubName: '',
      beltRank: '',
      poomDanNumber: '',
      aadhaarNumber: '',
      experienceYears: 0,
      photoUrl: '',
      registrationSecret: '',
    });
    setUpdateReason('');
    setRegistrationMode('new');
    setExistingCoachCode('');
    setExistingSecretKey('');
    setExistingProfileLoaded(false);
    setShowExistingSecret(false);
    setError('');
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-5xl">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold mt-2">Registration Successful</h2>
              <p className="text-muted-foreground">Coach ID: <span className="font-mono font-semibold">{success.coachCode}</span></p>
              {pdfDownloaded ? (
                <p className="text-xs text-green-700 mt-1">Coach card PDF downloaded successfully.</p>
              ) : (
                <p className="text-xs text-amber-700 font-medium mt-1">
                  Not downloaded yet — download your coach card PDF before leaving this page.
                </p>
              )}
            </div>

            <CoachIdCardPreview
              coachCode={success.coachCode}
              coachName={success.coachName}
              tournamentCode={success.tournamentCode}
              tournamentName={success.tournamentName}
              beltRank={success.beltRank}
              experienceYears={success.experienceYears}
              photoUrl={success.photoUrl}
              qrDataUrl={coachQrDataUrl}
            />

            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" onClick={() => setPdfPreviewOpen(true)} disabled={!pdfPreviewUrl}>Preview PDF</Button>
              <Button onClick={() => void triggerPdfDownload()} disabled={!pdfPreviewUrl}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
              {canSharePdf && (
                <Button variant="outline" onClick={() => void handleSharePdf()} disabled={!pdfPreviewUrl}>
                  <Share2 className="h-4 w-4 mr-2" /> Share PDF
                </Button>
              )}
              <Button variant="outline" onClick={resetFormForNextRegistration}>Register Another</Button>
              <Button variant="outline" onClick={() => navigate('/login')}>Go to Login</Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={pdfPreviewOpen} onOpenChange={handlePdfDialogOpenChange}>
          <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-4">
            <DialogHeader>
              <DialogTitle>Coach ID Card PDF Preview</DialogTitle>
            </DialogHeader>
            <div className="h-[calc(90vh-130px)] rounded border overflow-hidden bg-slate-100">
              {!pdfPreviewUrl ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">PDF preview not available.</div>
              ) : isMobile ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText className="h-12 w-12 text-slate-400" />
                  <p className="text-sm text-slate-600">PDF preview isn't supported on this device.</p>
                  <Button onClick={() => void triggerPdfDownload()}>
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                  {canSharePdf && (
                    <Button variant="outline" onClick={() => void handleSharePdf()}>
                      <Share2 className="h-4 w-4 mr-2" /> Share
                    </Button>
                  )}
                </div>
              ) : (
                <object data={pdfPreviewUrl} type="application/pdf" className="w-full h-full">
                  <iframe title="Coach ID card PDF preview" src={`${pdfPreviewUrl}#view=FitH`} className="w-full h-full">
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <FileText className="h-12 w-12 text-slate-400" />
                      <p className="text-sm text-slate-600">PDF preview is not supported on this device.</p>
                      <Button onClick={() => void triggerPdfDownload()}>
                        <Download className="h-4 w-4 mr-2" /> Download PDF
                      </Button>
                    </div>
                  </iframe>
                </object>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              {!pdfDownloaded && pdfPreviewUrl && (
                <span className="text-xs text-amber-700 font-medium">Not downloaded yet</span>
              )}
              {canSharePdf && (
                <Button variant="outline" onClick={() => void handleSharePdf()} disabled={!pdfPreviewUrl}>
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
              )}
              <Button onClick={() => void triggerPdfDownload()} disabled={!pdfPreviewUrl}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

  return (
    <div className="min-h-screen bg-slate-50">
      <CoachTopBar
        isInternal={isInternalUser}
        tournament={tournament}
        onBack={() => isInternalUser ? navigate('/') : navigate('/login')}
      />

      <div className="max-w-7xl mx-auto p-4 h-[calc(100vh-3.5rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-full">
          <aside className="lg:col-span-3 space-y-4 h-full overflow-y-auto pr-1">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-5 space-y-3">
                <h3 className="font-semibold text-slate-800">Registration Setup</h3>
                <p className="text-xs text-slate-600">Verify tournament and choose mode in setup popup before registration.</p>

                {!registrationReady && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Setup pending.
                  </p>
                )}

                {tournament && (
                  <div className="rounded-md border bg-white p-3 text-sm space-y-1">
                    <p className="font-medium">{tournament.name}</p>
                    <p className="text-slate-600">Code: <span className="font-mono">{tournament.tournament_code}</span></p>
                    <p className="text-slate-600">Mode: <span className="capitalize">{registrationMode}</span></p>
                    {registrationMode === 'existing' && (
                      <p className="text-slate-600">Profile: {existingProfileLoaded ? 'Loaded' : 'Not loaded'}</p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setGatewayOpen(true)}>Open Setup</Button>
                  {tournament && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTournament(null);
                        setRegistrationReady(false);
                        setGatewayOpen(true);
                        setRegistrationMode('new');
                        setExistingCoachCode('');
                        setExistingSecretKey('');
                        setExistingProfileLoaded(false);
                        setUpdateReason('');
                      }}
                    >
                      Change Tournament
                    </Button>
                  )}
                </div>
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
                <p className="text-xs text-slate-500">Please carry original documents to the venue.</p>
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
          </aside>

          <section className="lg:col-span-7 h-full overflow-y-auto pr-1">
            <Card>
              <CardContent className="pt-6 space-y-5">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className={`space-y-4 ${(!tournament || !registrationReady) ? 'opacity-50 pointer-events-none' : ''}`}>
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
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="With country code (e.g., +1..., +91...)"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Photo URL</Label>
                    <Input
                      value={form.photoUrl}
                      onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                      placeholder="https://.../coach-photo.jpg"
                    />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Poom / Dan Number</Label>
                      <Input
                        value={form.poomDanNumber}
                        onChange={(e) => setForm({ ...form, poomDanNumber: e.target.value })}
                        placeholder="Enter Poom/Dan number"
                      />
                    </div>
                    <div>
                      <Label>Aadhaar Number</Label>
                      <Input
                        value={form.aadhaarNumber}
                        onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                        placeholder="12-digit Aadhaar"
                      />
                    </div>
                  </div>

                  {registrationMode === 'new' ? (
                    <div>
                      <Label htmlFor="registrationSecret">Secret Key *</Label>
                      <div className="relative mt-1">
                        <Input
                          id="registrationSecret"
                          type={showFormSecret ? 'text' : 'password'}
                          value={form.registrationSecret}
                          onChange={(e) => setForm({ ...form, registrationSecret: e.target.value })}
                          placeholder="Set secret key for future updates"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-7 px-2"
                          onClick={() => setShowFormSecret((v) => !v)}
                        >
                          {showFormSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                        Registered profile verified. Provide a reason for this update.
                      </div>
                      <div>
                        <Label>Reason For Update *</Label>
                        <Textarea
                          value={updateReason}
                          onChange={(e) => setUpdateReason(e.target.value)}
                          rows={3}
                          placeholder="Explain why profile details are being updated for this tournament."
                        />
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={submitting || !tournament || !registrationReady}>
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...</>
                    ) : (
                      'Register as Coach'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <CoachRegistrationGatewayDialog
        open={gatewayOpen}
        tournament={tournament}
        codeInput={codeInput}
        resolving={resolving}
        tournamentError={tournamentError}
        registrationMode={registrationMode}
        existingCoachCode={existingCoachCode}
        existingSecretKey={existingSecretKey}
        showExistingSecret={showExistingSecret}
        existingProfileLoaded={existingProfileLoaded}
        loadingExistingProfile={loadingExistingProfile}
        canContinue={!!tournament && (registrationMode === 'new' || existingProfileLoaded)}
        onOpenChange={(next) => {
          if (next) {
            setGatewayOpen(true);
            return;
          }
          setGatewayOpen(false);
        }}
        onCodeInputChange={setCodeInput}
        onVerify={() => void resolveTournament()}
        onRegistrationModeChange={(mode) => {
          setRegistrationMode(mode);
          setUpdateReason('');
          if (mode === 'new') {
            setExistingCoachCode('');
            setExistingSecretKey('');
            setExistingProfileLoaded(false);
          }
        }}
        onExistingCoachCodeChange={(value) => {
          setExistingCoachCode(value);
          setExistingProfileLoaded(false);
        }}
        onExistingSecretKeyChange={(value) => {
          setExistingSecretKey(value);
          setExistingProfileLoaded(false);
        }}
        onToggleShowExistingSecret={() => setShowExistingSecret((prev) => !prev)}
        onLoadExistingProfile={() => void handleLoadExistingProfile()}
        onContinue={handleGatewayContinue}
      />

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

const CoachTopBar: React.FC<{
  isInternal: boolean;
  tournament: Tournament | null;
  onBack: () => void;
}> = ({ isInternal, tournament, onBack }) => (
  <div className="bg-white border-b sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {isInternal ? 'Back to Panel' : 'Back to Login'}
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
);

const CoachRegistrationGatewayDialog: React.FC<{
  open: boolean;
  tournament: Tournament | null;
  codeInput: string;
  resolving: boolean;
  tournamentError: string;
  registrationMode: 'new' | 'existing';
  existingCoachCode: string;
  existingSecretKey: string;
  showExistingSecret: boolean;
  existingProfileLoaded: boolean;
  loadingExistingProfile: boolean;
  canContinue: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeInputChange: (value: string) => void;
  onVerify: () => void;
  onRegistrationModeChange: (value: 'new' | 'existing') => void;
  onExistingCoachCodeChange: (value: string) => void;
  onExistingSecretKeyChange: (value: string) => void;
  onToggleShowExistingSecret: () => void;
  onLoadExistingProfile: () => void;
  onContinue: () => void;
}> = ({
  open,
  tournament,
  codeInput,
  resolving,
  tournamentError,
  registrationMode,
  existingCoachCode,
  existingSecretKey,
  showExistingSecret,
  existingProfileLoaded,
  loadingExistingProfile,
  canContinue,
  onOpenChange,
  onCodeInputChange,
  onVerify,
  onRegistrationModeChange,
  onExistingCoachCodeChange,
  onExistingSecretKeyChange,
  onToggleShowExistingSecret,
  onLoadExistingProfile,
  onContinue,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="max-w-lg"
    >
      <DialogHeader>
        <DialogTitle>Start Coach Registration</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Tournament Code *</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={codeInput}
              onChange={(e) => onCodeInputChange(e.target.value.toUpperCase())}
              placeholder="e.g. TKD-2026-XXXX"
              className="font-mono uppercase"
              onKeyDown={(e) => e.key === 'Enter' && onVerify()}
            />
            <Button onClick={onVerify} disabled={resolving || !codeInput.trim()}>
              {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
          {tournamentError && <p className="text-xs text-red-600 mt-1">{tournamentError}</p>}
        </div>

        {tournament && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm space-y-2">
            <p className="font-semibold text-slate-800">{tournament.name}</p>
            <p className="text-slate-600">Code: <span className="font-mono">{tournament.tournament_code}</span></p>

            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs uppercase text-slate-500">Registration Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={registrationMode === 'new' ? 'default' : 'outline'}
                  onClick={() => onRegistrationModeChange('new')}
                >
                  New
                </Button>
                <Button
                  type="button"
                  variant={registrationMode === 'existing' ? 'default' : 'outline'}
                  onClick={() => onRegistrationModeChange('existing')}
                >
                  Registered
                </Button>
              </div>

              {registrationMode === 'existing' && (
                <div className="space-y-2 rounded-md border bg-white p-3">
                  <p className="text-xs text-slate-600">Enter coach code and secret key to reuse profile.</p>
                  <Input
                    value={existingCoachCode}
                    onChange={(e) => onExistingCoachCodeChange(e.target.value.toUpperCase())}
                    placeholder="Coach code"
                    className="font-mono uppercase"
                  />
                  <div className="relative">
                    <Input
                      value={existingSecretKey}
                      onChange={(e) => onExistingSecretKeyChange(e.target.value)}
                      placeholder="Secret key"
                      type={showExistingSecret ? 'text' : 'password'}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={onToggleShowExistingSecret}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showExistingSecret ? 'Hide secret key' : 'Show secret key'}
                    >
                      {showExistingSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" className="w-full" onClick={onLoadExistingProfile} disabled={loadingExistingProfile}>
                    {loadingExistingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Existing Profile'}
                  </Button>
                  {existingProfileLoaded && (
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Existing profile loaded.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onContinue} disabled={!canContinue}>Continue To Form</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
