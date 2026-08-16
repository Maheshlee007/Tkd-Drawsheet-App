import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, ArrowLeft, ArrowRight, CheckCircle, Loader2, Download, Copy, AlertTriangle, Eye, EyeOff,
  Clock, FileText, Share2,
} from 'lucide-react';
import { PlayerRegistration } from '@/store/usePlayerStore';
import { playerService, type RegisteredPlayer, type TeamEntryPayload } from '@/services/playerService';
import {
  tournamentService, type Tournament, type RegistrationConfig, type RegistrationQuote,
} from '@/services/tournamentService';
import { verificationService } from '@/services/verificationService';
import { weightCategoryService, type WeightCategory as WeightCategoryRow } from '@/services/weightCategoryService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/store/useAuthStore';
import { AutoCloseErrorModal } from '@/components/AutoCloseErrorModal';
import {
  BELT_LEVELS, getAgeCategoryForAssociation, isMinor, isValidAadhaarFormat, calculateAge,
} from '@/utils/categoryUtils';
import { normalizeWeightAssociationType, resolveWeightCategoryLabelFromRows } from '@/utils/weightCategoryUtils';
import { useToast } from '@/hooks/use-toast';
import { generateRegistrationPDFBlob } from '@/utils/registrationPDF';

const STEPS = ['Basic Info', 'TKD Details', 'Verification', 'Review & Submit'];

interface EventOption {
  value: string;
  label: string;
  isGroupEvent: boolean;
  fee: number;
}

/** Pricing shape returned by POST /api/players/register (superset of the typed client model) */
interface ServerPricing {
  totalFee: number;
  eventFees?: number[];
  currency?: string;
  mode?: string;
  subtotal?: number;
  lines?: Array<{ eventType: string; label: string; amount: number }>;
  lateFee?: { applied: boolean; amount: number; mode: string };
}

interface TeamEntryFormState {
  teamName: string;
  members: string[];
}

/** ISO timestamp → 'dd MMM yyyy, h:mm am/pm' (en-IN); '—' when absent */
function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? String(iso)
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Human "time left" until an ISO timestamp, measured from a given epoch-ms "now" (server clock) */
function formatRemaining(targetIso: string | null | undefined, fromMs: number): string | null {
  if (!targetIso) return null;
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return null;
  const diffMin = Math.floor((target - fromMs) / 60000);
  if (diffMin <= 0) return null;
  const days = Math.floor(diffMin / 1440);
  const hours = Math.floor((diffMin % 1440) / 60);
  const mins = diffMin % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${Math.max(mins, 1)}m left`;
}

const PlayerRegistrationPage: React.FC = () => {
  const [, navigate] = useLocation();
  const params = useParams<{ tournamentCode?: string }>();
  const routeTournamentCode = params?.tournamentCode || '';
  const { toast } = useToast();
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
  const [modalError, setModalError] = useState('');
  const [registrationReady, setRegistrationReady] = useState(false);
  const [gatewayOpen, setGatewayOpen] = useState(true);
  const [registrationMode, setRegistrationMode] = useState<'new' | 'existing'>('new');
  const [updateReason, setUpdateReason] = useState('');
  const [existingPlayerCode, setExistingPlayerCode] = useState('');
  const [existingSecretKey, setExistingSecretKey] = useState('');
  const [showExistingSecret, setShowExistingSecret] = useState(false);
  const [loadingExistingProfile, setLoadingExistingProfile] = useState(false);
  const [existingProfileLoaded, setExistingProfileLoaded] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [associationWeightRows, setAssociationWeightRows] = useState<WeightCategoryRow[]>([]);

  // Server-driven registration config (window, offered events, fees) + live quote
  const [registrationConfig, setRegistrationConfig] = useState<RegistrationConfig | null>(null);
  const [quote, setQuote] = useState<RegistrationQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  // serverNow = Date.now() + serverTimeOffset — countdown labels never trust the device clock
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const previewBlobRef = useRef<string | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);
  const isMobile = useIsMobile();

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

  // Offered events come from the server config — never hardcoded
  const eventOptions = useMemo<EventOption[]>(() =>
    (registrationConfig?.events ?? []).map((e) => ({
      value: e.eventType,
      label: e.name,
      isGroupEvent: e.isGroupEvent,
      fee: e.fee,
    })), [registrationConfig]);
  const offeredEventTypes = useMemo(() => new Set(eventOptions.map((o) => o.value)), [eventOptions]);
  const groupEventTypes = useMemo(
    () => eventOptions.filter((o) => o.isGroupEvent).map((o) => o.value),
    [eventOptions]
  );

  const registration = registrationConfig?.registration ?? null;
  const registrationClosed = !!registration && !registration.isOpen;
  const requireEmailVerification = !!registration?.requireEmailVerification;
  const serverNowMs = nowMs + serverTimeOffset;

  function applyRegistrationConfig(config: RegistrationConfig) {
    setRegistrationConfig(config);
    const serverNow = new Date(config.registration.serverTime).getTime();
    setServerTimeOffset(Number.isFinite(serverNow) ? serverNow - Date.now() : 0);
  }

  useEffect(() => {
    if (!routeTournamentCode) return;
    void handleTournamentLookup(routeTournamentCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTournamentCode]);

  // Keep countdown labels fresh
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleTournamentLookup(rawCode?: string) {
    const code = (rawCode ?? tournamentCodeInput).trim().toUpperCase();
    if (!code) {
      const msg = 'Please enter the tournament code provided by your organizer.';
      setTournamentError(msg);
      setModalError(msg);
      return;
    }

    setLoadingTournament(true);
    setTournamentError('');
    try {
      const [tournament, config] = await Promise.all([
        tournamentService.getByCode(code),
        tournamentService.getRegistrationConfig(code),
      ]);
      setResolvedTournament(tournament);
      applyRegistrationConfig(config);
      setTournamentCodeInput(code);
      setRegistrationReady(false);
      // When registration is closed, skip the gateway so the blocking card is visible.
      setGatewayOpen(config.registration.isOpen);
      setRegistrationMode('new');
      setUpdateReason('');
      setExistingProfileLoaded(false);
      setExistingPlayerCode('');
      setExistingSecretKey('');
      setRegistrationSecret('');
    } catch (error: any) {
      setResolvedTournament(null);
      setRegistrationConfig(null);
      setQuote(null);
      setRegistrationReady(false);
      setGatewayOpen(true);
      const rawMsg = String(error?.message || '');
      const msg = rawMsg.toLowerCase().includes('tournament not found')
        ? 'Invalid tournament code. Please check and try again.'
        : (rawMsg || 'Invalid tournament code. Please check and try again.');
      setTournamentError(msg);
      setModalError(msg);
    } finally {
      setLoadingTournament(false);
    }
  }

  /** Re-check the window server-side (used after a 409 on submit) */
  async function refreshRegistrationConfig() {
    const code = (resolvedTournament?.tournament_code ?? tournamentCodeInput).trim().toUpperCase();
    if (!code) return;
    try {
      const config = await tournamentService.getRegistrationConfig(code);
      applyRegistrationConfig(config);
      if (!config.registration.isOpen) setGatewayOpen(false);
    } catch {
      // keep the existing config on transient failures
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
  const [educationType, setEducationType] = useState<'school' | 'college' | 'occupation'>('school');
  const [educationClass, setEducationClass] = useState('');
  // TKD
  const [beltColor, setBeltColor] = useState('');
  const [danId, setDanId] = useState('');
  const [weight, setWeight] = useState<number>(0);
  const [club, setClub] = useState('');
  const [coach, setCoach] = useState('');
  const [experience, setExperience] = useState('');
  // Verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  // Existing profile has an encrypted aadhaar server-side that could not be decrypted for display —
  // show a masked read-only chip and OMIT aadhaarNumber from the payload unless the user re-enters it.
  const [aadhaarOnFile, setAadhaarOnFile] = useState(false);
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarVerifying, setAadhaarVerifying] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registrationSecret, setRegistrationSecret] = useState('');

  const ageCategory = dateOfBirth ? getAgeCategoryForAssociation(dateOfBirth, resolvedTournament?.association_type) : '';
  const weightCategory = weight > 0 && ageCategory && ageCategory !== 'Unknown'
    ? (resolveWeightCategoryLabelFromRows(weight, associationWeightRows) || '')
    : '';
  const needsGuardian = dateOfBirth ? isMinor(dateOfBirth) : false;
  const age = dateOfBirth ? calculateAge(dateOfBirth) : null;
  const phoneLooksValid = /^(\+)?[0-9\s\-().]{8,25}$/.test(phone.trim());
  const canProceedStep0 =
    fullName.trim()
    && dateOfBirth
    && phone.trim()
    && phoneLooksValid
    && email.trim()
    && (!needsGuardian || guardianName.trim())
    && (registrationMode === 'new' || existingProfileLoaded);
  const groupEventValidationPassed = selectedEvents
    .filter(eventType => groupEventTypes.includes(eventType))
    .every(eventType => (teamEntries[eventType]?.members ?? []).filter(name => name.trim()).length > 0);
  const canProceedStep1 = !!resolvedTournament && beltColor && weight > 0 && selectedEvents.length > 0 && groupEventValidationPassed;
  const canProceedStep2 = !!registrationSecret.trim()
    && (registrationMode === 'new' || !!updateReason.trim())
    && (!requireEmailVerification || emailVerified);
  const canContinueGateway = !!resolvedTournament && !registrationClosed && (registrationMode === 'new' || existingProfileLoaded);

  
   useEffect(() => {
    let cancelled = false;

    async function loadAssociationWeightRows() {
      if (!resolvedTournament || !ageCategory || ageCategory === 'Unknown') {
        setAssociationWeightRows([]);
        return;
      }

      try {
        const association = normalizeWeightAssociationType(resolvedTournament.association_type);
        const rows = await weightCategoryService.getAll({
          association,
          age_category: ageCategory,
          gender,
        });
        if (!cancelled) {
          setAssociationWeightRows(rows);
        }
      } catch {
        if (!cancelled) {
          setAssociationWeightRows([]);
        }
      }
    }

    void loadAssociationWeightRows();

    return () => {
      cancelled = true;
    };
  }, [resolvedTournament, ageCategory, gender]);
  
  // Keep the event selection within what this tournament actually offers
  useEffect(() => {
    if (!registrationConfig) return;
    setSelectedEvents(prev => {
      const pruned = prev.filter(e => offeredEventTypes.has(e));
      if (pruned.length > 0) return pruned.length === prev.length ? prev : pruned;
      return offeredEventTypes.has('kyorugi') ? ['kyorugi'] : [];
    });
  }, [registrationConfig, offeredEventTypes]);

  // Server-authoritative fee quote, refreshed (debounced) whenever the event selection changes
  useEffect(() => {
    if (!resolvedTournament || !registrationConfig) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    const code = resolvedTournament.tournament_code;
    const events = selectedEvents.filter(e => offeredEventTypes.has(e));
    if (events.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const nextQuote = await tournamentService.getQuote(code, events);
        if (!cancelled) setQuote(nextQuote);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [resolvedTournament, registrationConfig, selectedEvents, offeredEventTypes]);

  // OTP resend cooldown ticker
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = window.setTimeout(() => setOtpResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpResendCooldown]);



  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!pdfPreviewOpen || pdfDownloaded) return;
      event.preventDefault();
      event.returnValue = 'Download the registration PDF before leaving this page.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pdfPreviewOpen, pdfDownloaded]);

  useEffect(() => {
    return () => {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
      }
    };
  }, []);

  // ⚠️ MOCK — aadhaar verification is intentionally still a client-side mock
  // (no real UIDAI integration yet; must be replaced before production).
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

  /** Real email OTP — the code arrives by email, never in the response */
  const handleSendEmailOtp = async () => {
    if (!email.trim()) return;
    setEmailVerifying(true);
    try {
      const result = await verificationService.sendEmailOtp(email.trim(), {
        tournamentCode: resolvedTournament?.tournament_code ?? (tournamentCodeInput.trim().toUpperCase() || undefined),
        purpose: 'player_registration',
      });
      setEmailOtpSent(true);
      setEmailOtp('');
      setOtpResendCooldown(Math.max(0, Math.ceil(Number(result.resendAfterSeconds) || 60)));
      toast({
        title: 'OTP Sent',
        description: `A 6-digit verification code was emailed to ${email.trim()}. It expires at ${fmtDateTime(result.expiresAt)}.`,
      });
    } catch (error: any) {
      if (error?.status === 429) {
        const retryAfter = Number((error?.details as { retryAfter?: number } | undefined)?.retryAfter);
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
          setOtpResendCooldown(Math.ceil(retryAfter));
        }
        toast({
          title: 'Please wait',
          description: `${String(error?.message || 'Too many requests.')}${Number.isFinite(retryAfter) && retryAfter > 0 ? ` Try again in ${Math.ceil(retryAfter)}s.` : ''}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Could not send OTP',
          description: String(error?.message || 'Sending the verification email failed. Please try again.'),
          variant: 'destructive',
        });
      }
    } finally {
      setEmailVerifying(false);
    }
  };

  const OTP_FAILURE_MESSAGES: Record<string, string> = {
    mismatch: 'Incorrect code. Check the email and try again.',
    expired: 'This code has expired. Request a new one.',
    locked: 'Too many wrong attempts. Request a new code.',
    no_active_code: 'No active code for this email. Request a new one.',
  };

  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Enter a 6-digit code', variant: 'destructive' });
      return;
    }
    setEmailVerifying(true);
    try {
      const result = await verificationService.verifyEmailOtp(email.trim(), emailOtp, 'player_registration');
      if (result.verified === true) {
        setEmailVerified(true);
        toast({ title: 'Email Verified', description: 'Your email address has been verified.' });
      } else {
        const reason = result.reason ?? 'mismatch';
        toast({
          title: 'Verification failed',
          description: OTP_FAILURE_MESSAGES[reason] ?? 'Verification failed. Please try again.',
          variant: 'destructive',
        });
        if (reason === 'expired' || reason === 'locked' || reason === 'no_active_code') {
          setEmailOtp('');
        }
      }
    } catch (error: any) {
      if (error?.status === 429) {
        const retryAfter = Number((error?.details as { retryAfter?: number } | undefined)?.retryAfter);
        toast({
          title: 'Please wait',
          description: `${String(error?.message || 'Too many attempts.')}${Number.isFinite(retryAfter) && retryAfter > 0 ? ` Try again in ${Math.ceil(retryAfter)}s.` : ''}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Verification failed',
          description: String(error?.message || 'Could not verify the code. Please try again.'),
          variant: 'destructive',
        });
      }
    } finally {
      setEmailVerifying(false);
    }
  };

  function parseRegistrationError(error: any): string {
    const details = error?.details as { errors?: Array<{ field?: string; message?: string }>; message?: string } | undefined;
    const firstValidation = details?.errors?.[0];
    if (firstValidation?.field?.includes('/phone')) {
      return 'Phone number is invalid. Use a valid number with country code (for example: +1..., +44..., +91...).';
    }
    if (firstValidation?.message) {
      return firstValidation.message;
    }
    return String(error?.message || 'Registration failed. Please verify all details and try again.');
  }

  async function handleLoadExistingProfile() {
    if (!resolvedTournament) {
      setModalError('Please verify tournament code first.');
      return;
    }
    if (!existingPlayerCode.trim() || !existingSecretKey.trim()) {
      setModalError('Enter player code and secret key to load existing profile.');
      return;
    }

    setLoadingExistingProfile(true);
    try {
      const profile = await playerService.lookupExistingProfile(existingPlayerCode.trim(), existingSecretKey.trim());
      setFullName(profile.fullName || '');
      // Normalize DOB from ISO timestamp to YYYY-MM-DD for date input
      const rawDob = profile.dateOfBirth || '';
      setDateOfBirth(rawDob.includes('T') ? rawDob.split('T')[0] : rawDob);
      setGender(profile.gender || 'male');
      setGuardianName(profile.guardianName || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setAddress(profile.address || '');
      setState(profile.state || '');
      setDistrict(profile.district || '');
      setPincode(profile.pincode || '');
      setOccupation(profile.occupation || '');
      setEducationType(profile.educationType || 'school');
      setEducationClass(profile.educationClass || '');
      setBeltColor(profile.beltColor || '');
      setDanId(profile.danId || '');
      setWeight(Number(profile.weight || 0));
      setClub(profile.club || '');
      setCoach(profile.coach || '');
      setExperience(profile.experience || '');
      setAadhaarVerified(Boolean(profile.aadhaarVerified));
      if (profile.aadhaarNumber) {
        setAadhaarNumber(profile.aadhaarNumber);
        setAadhaarOnFile(false);
        setAadhaarLast4('');
        setAadhaarVerified(true);
      } else if (profile.aadhaarLast4) {
        // Aadhaar exists server-side but the full number was not returned.
        // Never stuff a masked value into the editable field (it would fail
        // the backend pattern on resubmit) — show a read-only chip instead
        // and omit aadhaarNumber from the payload unless the user re-enters it.
        setAadhaarNumber('');
        setAadhaarOnFile(true);
        setAadhaarLast4(String(profile.aadhaarLast4));
        setAadhaarVerified(true);
      } else {
        setAadhaarNumber('');
        setAadhaarOnFile(false);
        setAadhaarLast4('');
      }
      setEmailVerified(Boolean(profile.emailVerified));
      const profileEvents = profile.events?.length ? profile.events : ['kyorugi'];
      const prunedEvents = registrationConfig
        ? profileEvents.filter((e) => offeredEventTypes.has(e))
        : profileEvents;
      setSelectedEvents(
        prunedEvents.length > 0
          ? prunedEvents
          : (offeredEventTypes.has('kyorugi') ? ['kyorugi'] : [])
      );
      setRegistrationSecret(existingSecretKey.trim());
      setUpdateReason('');
      setExistingProfileLoaded(true);
      setStep(0);
      toast({ title: 'Profile loaded', description: 'You can now update details and register for this tournament.' });
    } catch (error: any) {
      const msg = parseRegistrationError(error);
      setExistingProfileLoaded(false);
      setModalError(msg);
      toast({ title: 'Could not load profile', description: msg, variant: 'destructive' });
    } finally {
      setLoadingExistingProfile(false);
    }
  }

  function handleGatewayContinue() {
    if (!resolvedTournament) {
      setModalError('Please verify tournament code first.');
      return;
    }
    if (registrationClosed) {
      setModalError('Registration for this tournament is currently closed.');
      return;
    }
    if (registrationMode === 'existing' && !existingProfileLoaded) {
      setModalError('Load your existing profile before continuing.');
      return;
    }
    setRegistrationReady(true);
    setGatewayOpen(false);
    setStep(0);
  }

  async function preparePdfPreview(player: RegisteredPlayer, qrUrl: string | null) {
    try {
      const blob = await generateRegistrationPDFBlob(player, qrUrl, {
        tournamentName: resolvedTournament?.name,
      });
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
      }
      const url = URL.createObjectURL(blob);
      previewBlobRef.current = url;
      pdfBlobRef.current = blob;
      setPdfPreviewUrl(url);
      setPdfDownloaded(false);
      setPdfPreviewOpen(true);
    } catch {
      setPdfPreviewOpen(false);
      setPdfPreviewUrl(null);
      pdfBlobRef.current = null;
    }
  }

  async function triggerPdfDownload() {
    if (!pdfPreviewUrl || !registeredPlayer) return;
    const anchor = document.createElement('a');
    anchor.href = pdfPreviewUrl;
    anchor.download = `${registeredPlayer.playerCode}-registration-card.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setPdfDownloaded(true);
  }

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

  async function handleSharePdf() {
    const blob = pdfBlobRef.current;
    if (!blob || !registeredPlayer) return;
    const file = new File([blob], `${registeredPlayer.playerCode}-registration-card.pdf`, { type: 'application/pdf' });
    try {
      await (navigator as Navigator & { share: (data: { files: File[]; title?: string }) => Promise<void> })
        .share({ files: [file], title: 'Registration PDF' });
    } catch {
      // user cancelled or the share sheet failed — nothing to do
    }
  }

  function handlePdfDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && !pdfDownloaded) {
      const shouldDownload = window.confirm('Download registration PDF before closing?');
      if (shouldDownload) {
        void triggerPdfDownload();
      }
    }
    setPdfPreviewOpen(nextOpen);
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const playerData = {
        tournamentCode: resolvedTournament?.tournament_code ?? tournamentCodeInput,
        registrationMode,
        updateReason: registrationMode === 'existing' ? updateReason.trim() : undefined,
        fullName, dateOfBirth, gender,
        guardianName: needsGuardian ? guardianName : undefined,
        phone, email,
        address: address || undefined,
        state: state || undefined,
        district: district || undefined,
        pincode: pincode || undefined,
        occupation: occupation || undefined,
        educationType,
        educationClass: educationClass || undefined,
        registrationSecret: registrationSecret || undefined,
        beltColor,
        danId: danId || undefined,
        weight,
        club: club || undefined,
        coach: coach || undefined,
        experience: experience || undefined,
        // Omit aadhaar when it is unchanged/on-file — the profile keeps the stored value
        aadhaarNumber: aadhaarOnFile ? undefined : (aadhaarNumber || undefined),
        aadhaarVerified, emailVerified,
        dobVerified: aadhaarVerified,
        events: selectedEvents,
        teamEntries: selectedEvents
          .filter(eventType => groupEventTypes.includes(eventType))
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
      const player = await playerService.create(playerData);

      let generatedQr: string | null = null;
      try {
        const QRCode = await import('qrcode');
        const qrText = `${player.playerCode}|${resolvedTournament?.tournament_code ?? tournamentCodeInput}|${fullName}`;
        generatedQr = await QRCode.toDataURL(qrText, { width: 200, margin: 1 });
      } catch {
        generatedQr = null;
      }

      setRegisteredPlayer(player);
      setQrDataUrl(generatedQr);
      await preparePdfPreview(player, generatedQr);
      toast({ title: 'Registration Complete', description: `Player code: ${player.playerCode}` });
    } catch (error: any) {
      const details = error?.details as {
        code?: string;
        data?: { opensAt?: string | null; closesAt?: string | null };
      } | undefined;
      // Tournament requires a server-side verified email — send the user back to the verification step
      if (error?.status === 403 && details?.code === 'EMAIL_NOT_VERIFIED') {
        setEmailVerified(false);
        setStep(2);
        toast({
          title: 'Email verification required',
          description: 'Verify your email address with the OTP sent to your inbox, then submit again.',
          variant: 'destructive',
        });
        return;
      }
      // Registration window closed between page load and submit
      if (error?.status === 409 && details?.data && (details.data.opensAt || details.data.closesAt)) {
        const windowMsg = `${String(error?.message || 'Registration is closed.')} Window: ${fmtDateTime(details.data.opensAt)} – ${fmtDateTime(details.data.closesAt)}.`;
        setModalError(windowMsg);
        toast({ title: 'Registration closed', description: windowMsg, variant: 'destructive' });
        void refreshRegistrationConfig();
        return;
      }
      const message = parseRegistrationError(error);
      setModalError(message);
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
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
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    pdfBlobRef.current = null;
    setRegisteredPlayer(null); setQrDataUrl(null); setStep(0);
    setPdfPreviewOpen(false); setPdfPreviewUrl(null); setPdfDownloaded(false);
    setFullName(''); setDateOfBirth(''); setPhone(''); setEmail('');
    setGuardianName(''); setBeltColor(''); setDanId(''); setWeight(0);
    setClub(''); setCoach(''); setExperience(''); setAadhaarNumber('');
    setAadhaarOnFile(false); setAadhaarLast4('');
    setAadhaarVerified(false); setEmailVerified(false); setEmailOtpSent(false);
    setEmailOtp(''); setOtpResendCooldown(0); setTermsAccepted(false);
    setAddress(''); setState(''); setDistrict(''); setPincode('');
    setOccupation(''); setEducationType('school'); setEducationClass(''); setRegistrationSecret('');
    setUpdateReason('');
    setSelectedEvents(offeredEventTypes.has('kyorugi') ? ['kyorugi'] : []);
    setTeamEntries({});
    setRegistrationMode('new');
    setExistingPlayerCode('');
    setExistingSecretKey('');
    setExistingProfileLoaded(false);
  };

  if (registeredPlayer) {
    // Server-authoritative pricing (lines/subtotal/lateFee ride along at runtime)
    const serverPricing: ServerPricing | undefined = registeredPlayer.pricing;
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
                {serverPricing && <p><span className="font-medium">Registration Fee:</span> Rs. {serverPricing.totalFee}</p>}
                {registeredPlayer.club && <p><span className="font-medium">Club:</span> {registeredPlayer.club}</p>}
                {registeredPlayer.state && <p><span className="font-medium">Location:</span> {registeredPlayer.district ? `${registeredPlayer.district}, ` : ''}{registeredPlayer.state}</p>}
              </div>
              {serverPricing?.lines && serverPricing.lines.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 text-left text-sm space-y-1">
                  <p className="font-medium text-slate-700 mb-1">Fee Breakdown</p>
                  {serverPricing.lines.map((line) => (
                    <div key={line.eventType} className="flex justify-between gap-3 text-slate-600">
                      <span>{line.label}</span>
                      <span>₹{line.amount}</span>
                    </div>
                  ))}
                  {serverPricing.subtotal != null && (
                    <div className="flex justify-between gap-3 border-t pt-1 text-slate-700">
                      <span>Subtotal</span>
                      <span>₹{serverPricing.subtotal}</span>
                    </div>
                  )}
                  {serverPricing.lateFee?.applied && (
                    <div className="flex justify-between gap-3 text-amber-700">
                      <span>Late registration fee</span>
                      <span>+₹{serverPricing.lateFee.amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t pt-1 font-semibold text-slate-900">
                    <span>Total</span>
                    <span>₹{serverPricing.totalFee}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPdfPreviewOpen(true)}
                  disabled={!pdfPreviewUrl}
                >
                  Preview Registration PDF
                </Button>
                <Button onClick={() => void triggerPdfDownload()} disabled={!pdfPreviewUrl}>
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
              </div>
              {canSharePdf && (
                <Button variant="outline" className="w-full" onClick={() => void handleSharePdf()} disabled={!pdfPreviewUrl}>
                  <Share2 className="h-4 w-4 mr-2" /> Share PDF
                </Button>
              )}
              {!pdfDownloaded && pdfPreviewUrl && (
                <p className="text-xs text-amber-700 font-medium">
                  Not downloaded yet — download your registration PDF before leaving this page.
                </p>
              )}
              {pdfDownloaded && (
                <p className="text-xs text-green-700">PDF downloaded successfully.</p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetForm}>Register Another</Button>
                <Button className="flex-1" onClick={() => navigate('/')}>Go to Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Dialog open={pdfPreviewOpen} onOpenChange={handlePdfDialogOpenChange}>
          <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-4">
            <DialogHeader>
              <DialogTitle>Registration PDF Preview</DialogTitle>
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
                  <iframe title="Registration PDF preview" src={`${pdfPreviewUrl}#view=FitH`} className="w-full h-full">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <RegistrationTopBar
        isInternal={isInternalUser}
        tournament={resolvedTournament}
        onBack={() => isInternalUser ? navigate('/') : navigate('/login')}
      />
      <div className="max-w-7xl mx-auto px-4 py-4 h-[calc(100vh-3.5rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-full">
        {/* Left aside (30%) — required docs / info */}
        <aside className="lg:col-span-3 space-y-4 h-full overflow-y-auto pr-1">
          <RegistrationInfoPanel
            tournament={resolvedTournament}
            config={registrationConfig}
            registrationMode={registrationMode}
            existingProfileLoaded={existingProfileLoaded}
            registrationReady={registrationReady}
            onOpenSetup={() => setGatewayOpen(true)}
            onChangeTournament={() => {
              setResolvedTournament(null);
              setRegistrationConfig(null);
              setQuote(null);
              setTournamentError('');
              setRegistrationReady(false);
              setGatewayOpen(true);
              setRegistrationMode('new');
              setUpdateReason('');
              setExistingProfileLoaded(false);
              setExistingPlayerCode('');
              setExistingSecretKey('');
              setShowExistingSecret(false);
              setRegistrationSecret('');
            }}
          />
        </aside>

        {/* Right (70%) — actual stepped form */}
        <div className="lg:col-span-7 h-full overflow-y-auto pr-1">

        {registrationClosed ? (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-lg text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Registration Closed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-slate-700">
                {registration?.reason || 'Registration for this tournament is not currently open.'}
              </p>
              <div className="rounded-lg border bg-slate-50 p-3 space-y-1 text-slate-600">
                <div className="flex justify-between gap-3">
                  <span>Opens</span>
                  <span className="font-medium">{fmtDateTime(registration?.opensAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Closes</span>
                  <span className="font-medium">{fmtDateTime(registration?.closesAt)}</span>
                </div>
                {registration?.lateClosesAt && (
                  <div className="flex justify-between gap-3">
                    <span>Late window closes</span>
                    <span className="font-medium">{fmtDateTime(registration.lateClosesAt)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">Contact the organizer if you believe this is an error.</p>
            </CardContent>
          </Card>
        ) : (
        <>

        {registration?.isOpen && (registration.isLateWindow ? registration.lateClosesAt : registration.closesAt) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-800 flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>
              {registration.isLateWindow
                ? `Late registration closes ${fmtDateTime(registration.lateClosesAt)}`
                : `Registration closes ${fmtDateTime(registration.closesAt)}`}
              {(() => {
                const remaining = formatRemaining(
                  registration.isLateWindow ? registration.lateClosesAt : registration.closesAt,
                  serverNowMs
                );
                return remaining ? ` (${remaining})` : '';
              })()}
            </span>
          </div>
        )}
        {registration?.isOpen && registration.isLateWindow && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3 text-sm text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              Late registration — ₹{registrationConfig?.fees.lateFeeAmount ?? 0} late fee applies
              {registrationConfig?.fees.lateFeeMode === 'per_event' ? ' per event' : ''}.
            </span>
          </div>
        )}

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
          <CardContent className={`space-y-4 ${(!resolvedTournament || !registrationReady) ? 'opacity-60 pointer-events-none' : ''}`}>
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
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="With country code (e.g., +1..., +44..., +91...)" className={`mt-1 ${showErrors && (!phone.trim() || !phoneLooksValid) ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {showErrors && !phone.trim() && <p className="text-xs text-red-500 mt-1">Phone number is required</p>}
                    {showErrors && phone.trim() && !phoneLooksValid && <p className="text-xs text-red-500 mt-1">Enter a valid number with country code.</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // A different address must be verified again
                        setEmailVerified(false);
                        setEmailOtpSent(false);
                        setEmailOtp('');
                      }}
                      placeholder="your@email.com"
                      className={`mt-1 ${showErrors && !email.trim() ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    />
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
                  <Label className="text-sm font-medium">Current Status</Label>
                  <Select value={educationType} onValueChange={(value) => setEducationType(value as 'school' | 'college' | 'occupation')}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">School Student</SelectItem>
                      <SelectItem value="college">College Student</SelectItem>
                      <SelectItem value="occupation">Working / Occupation</SelectItem>
                    </SelectContent>
                  </Select>

                  {(educationType === 'school' || educationType === 'college') && (
                    <div className="mt-3">
                      <Label htmlFor="educationClass">Class / Year</Label>
                      <Input
                        id="educationClass"
                        value={educationClass}
                        onChange={(e) => setEducationClass(e.target.value)}
                        placeholder={educationType === 'school' ? 'e.g., Class 10' : 'e.g., 2nd Year'}
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div className="mt-3">
                    <Label htmlFor="occupation" className="text-sm font-medium">
                      {educationType === 'occupation' ? 'Occupation' : (educationType === 'school' ? 'School Name' : 'College Name')}
                    </Label>
                    <Input
                      id="occupation"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder={educationType === 'occupation' ? 'e.g., Software Engineer' : 'Enter institute name'}
                      className="mt-1"
                    />
                  </div>
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
                    {eventOptions.map(opt => (
                      <label key={opt.value} className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                        selectedEvents.includes(opt.value) ? 'bg-blue-50 border-blue-300' : 'hover:bg-slate-50'
                      }`}>
                        <Checkbox
                          checked={selectedEvents.includes(opt.value)}
                          onCheckedChange={() => toggleEvent(opt.value)}
                        />
                        <span className="text-sm flex-1">{opt.label}</span>
                        <span className="text-xs text-slate-500">₹{opt.fee}</span>
                      </label>
                    ))}
                  </div>
                  {eventOptions.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">No events are configured for this tournament yet. Contact the organizer.</p>
                  )}
                  {showErrors && selectedEvents.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Please select at least one event</p>
                  )}
                </div>
                {selectedEvents.filter(eventType => groupEventTypes.includes(eventType)).map(eventType => {
                  const teamEntry = teamEntries[eventType] ?? { teamName: '', members: [''] };
                  const label = eventOptions.find(option => option.value === eventType)?.label || eventType;
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
                              placeholder={eventType === 'poomsae_pair' ? 'Partner player code or name' : `Member ${memberIndex + 1} player code or name`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 text-xs"
                              onClick={async () => {
                                if (!member.trim()) return;
                                try {
                                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/players/${encodeURIComponent(member.trim())}`);
                                  if (res.ok) {
                                    const data = await res.json();
                                    const name = data?.data?.full_name || data?.data?.player?.full_name || member;
                                    toast({ title: 'Player Found', description: name });
                                    upsertTeamEntry(eventType, prev => ({
                                      ...prev,
                                      members: prev.members.map((entry, index) => index === memberIndex ? `${member.trim()} (${name})` : entry),
                                    }));
                                  } else {
                                    toast({ title: 'Not Found', description: 'Player code not found. They can still be added by name.', variant: 'destructive' });
                                  }
                                } catch {
                                  toast({ title: 'Lookup failed', variant: 'destructive' });
                                }
                              }}
                            >
                              Verify
                            </Button>
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
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-slate-700">Pricing Preview</p>
                      {quoteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                    </div>
                    {quote ? (
                      <div className="space-y-1 text-slate-600">
                        {quote.lines.map((line) => (
                          <div key={line.eventType} className="flex justify-between gap-3">
                            <span>{line.label}</span>
                            <span>₹{line.amount}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-3 border-t pt-2 text-slate-700">
                          <span>Subtotal</span>
                          <span>₹{quote.subtotal}</span>
                        </div>
                        {quote.lateFee.applied && (
                          <div className="flex justify-between gap-3 text-amber-700">
                            <span>Late registration fee</span>
                            <span>+₹{quote.lateFee.amount}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-3 border-t pt-2 font-semibold text-slate-900">
                          <span>Total</span>
                          <span>₹{quote.total}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {selectedEvents.length === 0
                          ? 'Select at least one event to see pricing.'
                          : 'Fetching fees from the server…'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {registrationMode === 'new' ? (
                  <div>
                    <Label htmlFor="registrationSecret">Secret Key *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="registrationSecret"
                        type={showSecret ? 'text' : 'password'}
                        value={registrationSecret}
                        onChange={(e) => setRegistrationSecret(e.target.value)}
                        placeholder="Set a secret key for future updates"
                        className={`pr-10 ${showErrors && !registrationSecret.trim() ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 px-2"
                        onClick={() => setShowSecret((v) => !v)}
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showErrors && !registrationSecret.trim() && (
                      <p className="text-xs text-red-500 mt-1">Secret key is required.</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">You will need this key with your player code to reuse/update profile for future tournaments.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm font-medium text-green-800">Existing profile verified with your secret key.</p>
                    <p className="text-xs text-green-700 mt-1">Keep your player code and secret safe for future tournaments.</p>
                  </div>
                )}

                {registrationMode === 'existing' && (
                  <div>
                    <Label htmlFor="updateReason">Reason For Update *</Label>
                    <Textarea
                      id="updateReason"
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                      placeholder="Explain why profile details are being updated for this registration."
                      rows={3}
                      className={`mt-1 ${showErrors && !updateReason.trim() ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    />
                    {showErrors && !updateReason.trim() && (
                      <p className="text-xs text-red-500 mt-1">Update reason is required for registered profiles.</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="aadhaar">Aadhaar Number</Label>
                  {aadhaarOnFile ? (
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-700">
                        Aadhaar on file: <span className="font-mono">••••-••••-{aadhaarLast4}</span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAadhaarOnFile(false);
                          setAadhaarLast4('');
                          setAadhaarNumber('');
                          setAadhaarVerified(false);
                        }}
                      >
                        Enter a different number
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-1">
                      <Input id="aadhaar" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12-digit Aadhaar" disabled={aadhaarVerified} className="flex-1" />
                      <Button onClick={handleMockAadhaarVerify} disabled={aadhaarVerified || aadhaarVerifying || aadhaarNumber.length !== 12} size="sm">
                        {aadhaarVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : aadhaarVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : 'Verify'}
                      </Button>
                    </div>
                  )}
                  {aadhaarVerified && <p className="text-xs text-green-600 mt-1">Aadhaar verified successfully</p>}
                </div>
                <div>
                  <Label>Email Verification {requireEmailVerification && <span className="text-red-500">*</span>}</Label>
                  {emailVerified ? (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Email verified</p>
                  ) : !emailOtpSent ? (
                    <Button onClick={handleSendEmailOtp} disabled={emailVerifying || !email.trim() || otpResendCooldown > 0} variant="outline" size="sm" className="mt-1 w-full">
                      {emailVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {otpResendCooldown > 0 ? `Resend available in ${otpResendCooldown}s` : `Send OTP to ${email || '...'}`}
                    </Button>
                  ) : (
                    <div className="space-y-2 mt-1">
                      <div className="flex gap-2">
                        <Input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code from your email" className="flex-1" />
                        <Button onClick={handleVerifyEmailOtp} disabled={emailVerifying || emailOtp.length !== 6} size="sm">
                          {emailVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500">Code sent to {email}. Check your inbox (and spam folder).</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs shrink-0"
                          onClick={handleSendEmailOtp}
                          disabled={emailVerifying || otpResendCooldown > 0}
                        >
                          {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend code'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {showErrors && requireEmailVerification && !emailVerified && (
                    <p className="text-xs text-red-500 mt-1">Email verification is required for this tournament.</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-4">
                  {requireEmailVerification
                    ? 'This tournament requires email verification before you can submit.'
                    : 'Verification is optional but recommended.'}
                </p>
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
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Registration Type</span><span className="font-medium capitalize sm:ml-2">{registrationMode}</span></div>
                    {registrationMode === 'existing' && (
                      <div className="flex justify-between sm:block"><span className="text-slate-500">Update Reason</span><span className="font-medium sm:ml-2">{updateReason || '-'}</span></div>
                    )}
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Name</span><span className="font-medium sm:ml-2">{fullName}</span></div>
                    <div className="flex justify-between sm:block"><span className="text-slate-500">DOB</span><span className="font-medium sm:ml-2">{dateOfBirth ? new Date(dateOfBirth + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} (Age: {age})</span></div>
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Gender</span><span className="font-medium capitalize sm:ml-2">{gender}</span></div>
                    {needsGuardian && <div className="flex justify-between sm:block"><span className="text-slate-500">Guardian</span><span className="font-medium sm:ml-2">{guardianName}</span></div>}
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Phone</span><span className="font-medium sm:ml-2">{phone}</span></div>
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Email</span><span className="font-medium sm:ml-2">{email}</span></div>
                    <div className="flex justify-between sm:block"><span className="text-slate-500">Status</span><span className="font-medium capitalize sm:ml-2">{educationType}</span></div>
                    {educationClass && <div className="flex justify-between sm:block"><span className="text-slate-500">Class/Year</span><span className="font-medium sm:ml-2">{educationClass}</span></div>}
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
                      <div className="flex justify-between sm:block"><span className="text-slate-500">Category</span><span className="font-medium sm:ml-2">{ageCategory} - {weightCategory}</span></div>
                      <div className="flex justify-between sm:block"><span className="text-slate-500">Weight</span><span className="font-medium sm:ml-2">{weight} kg</span></div>
                      {club && <div className="flex justify-between sm:block"><span className="text-slate-500">Club</span><span className="font-medium sm:ml-2">{club}</span></div>}
                      {coach && <div className="flex justify-between sm:block"><span className="text-slate-500">Coach</span><span className="font-medium sm:ml-2">{coach}</span></div>}
                      {experience && <div className="flex justify-between sm:block"><span className="text-slate-500">Experience</span><span className="font-medium sm:ml-2">{experience}</span></div>}
                      {resolvedTournament && <div className="flex justify-between sm:block"><span className="text-slate-500">Tournament</span><span className="font-medium sm:ml-2">{resolvedTournament.name}</span></div>}
                      {resolvedTournament && <div className="flex justify-between sm:block"><span className="text-slate-500">Registration Fee</span><span className="font-medium sm:ml-2">{quote ? `Rs. ${quote.total}` : '—'}</span></div>}
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <p className="text-slate-500 text-xs font-medium mb-1">Verification Status</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={aadhaarVerified} readOnly className="rounded" />
                      <span className={aadhaarVerified ? 'text-green-700' : 'text-slate-500'}>Aadhaar {aadhaarVerified ? 'Verified' : 'Not Verified'}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={emailVerified} readOnly className="rounded" />
                      <span className={emailVerified ? 'text-green-700' : 'text-slate-500'}>Email {emailVerified ? 'Verified' : 'Not Verified'}</span>
                    </label>
                  </div>
                  <div className="border-t pt-3 mt-2">
                    <p className="text-slate-500 text-xs font-medium mb-2">Selected Events</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEvents.length > 0
                        ? selectedEvents.map(e => (
                            <Badge key={e} variant="secondary" className="capitalize">
                              {eventOptions.find(o => o.value === e)?.label || e}
                            </Badge>
                          ))
                        : <span className="text-xs text-red-500">No events selected</span>
                      }
                    </div>
                  </div>
                  {quote && (
                    <div className="border-t pt-3 mt-2">
                      <p className="text-slate-500 text-xs font-medium mb-2">Fee Breakdown (server-calculated)</p>
                      <div className="space-y-1">
                        {quote.lines.map((line) => (
                          <div key={line.eventType} className="flex justify-between gap-3 text-slate-600">
                            <span>{line.label}</span>
                            <span>₹{line.amount}</span>
                          </div>
                        ))}
                        <div className="flex justify-between gap-3 border-t pt-1 text-slate-700">
                          <span>Subtotal</span>
                          <span>₹{quote.subtotal}</span>
                        </div>
                        {quote.lateFee.applied && (
                          <div className="flex justify-between gap-3 text-amber-700">
                            <span>Late registration fee</span>
                            <span>+₹{quote.lateFee.amount}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-3 border-t pt-1 font-semibold text-slate-900">
                          <span>Total</span>
                          <span>₹{quote.total}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedEvents.filter(eventType => groupEventTypes.includes(eventType)).length > 0 && (
                    <div className="border-t pt-3 mt-2 space-y-2">
                      <p className="text-slate-500 text-xs font-medium">Group Event Members</p>
                      {selectedEvents.filter(eventType => groupEventTypes.includes(eventType)).map(eventType => (
                        <div key={eventType} className="text-xs text-slate-700">
                          <span className="font-medium">{eventOptions.find(option => option.value === eventType)?.label || eventType}:</span>
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
                  const canProceed = (step === 0 && canProceedStep0)
                    || (step === 1 && canProceedStep1)
                    || (step === 2 && canProceedStep2);
                  if (!canProceed) {
                    setShowErrors(true);
                    return;
                  }
                  setShowErrors(false);
                  setStep(step + 1);
                }} disabled={!resolvedTournament || !registrationReady}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!resolvedTournament || !registrationReady || !termsAccepted || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Submit Registration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        </>
        )}
        </div>
      </div>
      </div>

      <RegistrationGatewayDialog
        open={gatewayOpen}
        tournament={resolvedTournament}
        tournamentCodeInput={tournamentCodeInput}
        loadingTournament={loadingTournament}
        tournamentError={tournamentError}
        registrationMode={registrationMode}
        existingPlayerCode={existingPlayerCode}
        existingSecretKey={existingSecretKey}
        showExistingSecret={showExistingSecret}
        loadingExistingProfile={loadingExistingProfile}
        existingProfileLoaded={existingProfileLoaded}
        canContinue={canContinueGateway}
        registrationClosed={registrationClosed}
        onOpenChange={(next) => {
          if (next) {
            setGatewayOpen(true);
            return;
          }
          setGatewayOpen(false);
        }}
        onTournamentCodeInputChange={setTournamentCodeInput}
        onRegistrationModeChange={(mode) => {
          setRegistrationMode(mode);
          setUpdateReason('');
          if (mode === 'new') {
            setExistingProfileLoaded(false);
            setExistingPlayerCode('');
            setExistingSecretKey('');
            setRegistrationSecret('');
          }
        }}
        onExistingPlayerCodeChange={(value) => {
          setExistingPlayerCode(value);
          setExistingProfileLoaded(false);
        }}
        onExistingSecretKeyChange={(value) => {
          setExistingSecretKey(value);
          setExistingProfileLoaded(false);
        }}
        onToggleShowExistingSecret={() => setShowExistingSecret((prev) => !prev)}
        onLoadExistingProfile={() => void handleLoadExistingProfile()}
        onVerifyTournament={() => void handleTournamentLookup()}
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
};

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
const RegistrationGatewayDialog: React.FC<{
  open: boolean;
  tournament: Tournament | null;
  tournamentCodeInput: string;
  loadingTournament: boolean;
  tournamentError: string;
  registrationMode: 'new' | 'existing';
  existingPlayerCode: string;
  existingSecretKey: string;
  showExistingSecret: boolean;
  loadingExistingProfile: boolean;
  existingProfileLoaded: boolean;
  canContinue: boolean;
  registrationClosed: boolean;
  onOpenChange: (open: boolean) => void;
  onTournamentCodeInputChange: (value: string) => void;
  onRegistrationModeChange: (value: 'new' | 'existing') => void;
  onExistingPlayerCodeChange: (value: string) => void;
  onExistingSecretKeyChange: (value: string) => void;
  onToggleShowExistingSecret: () => void;
  onLoadExistingProfile: () => void;
  onVerifyTournament: () => void;
  onContinue: () => void;
}> = ({
  open,
  tournament,
  tournamentCodeInput,
  loadingTournament,
  tournamentError,
  registrationMode,
  existingPlayerCode,
  existingSecretKey,
  showExistingSecret,
  loadingExistingProfile,
  existingProfileLoaded,
  canContinue,
  registrationClosed,
  onOpenChange,
  onTournamentCodeInputChange,
  onRegistrationModeChange,
  onExistingPlayerCodeChange,
  onExistingSecretKeyChange,
  onToggleShowExistingSecret,
  onLoadExistingProfile,
  onVerifyTournament,
  onContinue,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="max-w-lg"
    >
      <DialogHeader>
        <DialogTitle>Start Player Registration</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Tournament Code *</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={tournamentCodeInput}
              onChange={(e) => onTournamentCodeInputChange(e.target.value.toUpperCase())}
              placeholder="e.g. TKD-2026-ABCD"
              className="font-mono uppercase"
              onKeyDown={(e) => e.key === 'Enter' && onVerifyTournament()}
            />
            <Button onClick={onVerifyTournament} disabled={!tournamentCodeInput.trim() || loadingTournament}>
              {loadingTournament ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
          </div>
          {tournamentError && <p className="text-xs text-red-600 mt-1">{tournamentError}</p>}
        </div>

        {tournament && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm space-y-2">
            <p className="font-semibold text-slate-800">{tournament.name}</p>
            <p className="text-slate-600">Code: <span className="font-mono">{tournament.tournament_code}</span></p>
            <p className="text-slate-600">{tournament.start_date} to {tournament.end_date}</p>
            {registrationClosed && (
              <p className="text-xs text-red-600 font-medium">
                Registration is currently closed for this tournament.
              </p>
            )}

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
                  <p className="text-xs text-slate-600">Enter player code and secret key to reuse profile.</p>
                  <Input
                    value={existingPlayerCode}
                    onChange={(e) => onExistingPlayerCodeChange(e.target.value.toUpperCase())}
                    placeholder="Player code"
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

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onContinue} disabled={!canContinue}>
            Continue To Form
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const RegistrationInfoPanel: React.FC<{
  tournament: Tournament | null;
  config: RegistrationConfig | null;
  registrationMode: 'new' | 'existing';
  existingProfileLoaded: boolean;
  registrationReady: boolean;
  onOpenSetup: () => void;
  onChangeTournament: () => void;
}> = ({
  tournament,
  config,
  registrationMode,
  existingProfileLoaded,
  registrationReady,
  onOpenSetup,
  onChangeTournament,
}) => {

  return (
    <>
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold text-slate-800">Registration Setup</h3>
          <p className="text-xs text-slate-600">
            Verify tournament code and choose new or registered mode in the setup popup before filling the form.
          </p>

          {!registrationReady && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Setup pending: complete popup to continue.
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
            <Button type="button" variant="outline" onClick={onOpenSetup}>Open Setup</Button>
            {tournament && <Button type="button" variant="outline" onClick={onChangeTournament}>Change Tournament</Button>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100">
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" /> Participant Acknowledgment
          </h3>
          <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
            <li>I confirm that the participant is physically fit and medically cleared for martial arts competition.</li>
            <li>I understand that Taekwondo is a contact sport and involves risk of injury.</li>
            <li>I agree to abide by the tournament rules, referee decisions, and code of conduct.</li>
            <li>I consent to the participant being photographed/videographed during the event.</li>
            {/* Guardian consent implied for minors */}
            <li>Guardian consent is required for participants below 18 years of age.</li>
          </ul>
          <p className="text-xs text-slate-500">
            Original ID proof must be presented at the venue during check-in.
          </p>
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
            {tournament.registration_instructions && (
              <div className="border-t pt-2 mt-2">
                <p className="text-slate-400">Instructions:</p>
                <p className="text-slate-700 whitespace-pre-line">{tournament.registration_instructions}</p>
              </div>
            )}
            <div className="border-t pt-2 mt-2 text-slate-700 space-y-1">
              <p className="text-slate-400">Event fees:</p>
              {config?.events?.length ? (
                config.events.map((event) => (
                  <div key={event.eventType} className="flex justify-between">
                    <span>{event.name}</span>
                    <span>₹ {event.fee}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Fee details unavailable.</p>
              )}
              {config && config.fees.lateFeeAmount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Late fee{config.fees.lateFeeMode === 'per_event' ? ' (per event)' : ''}</span>
                  <span>₹ {config.fees.lateFeeAmount}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PlayerRegistrationPage;
