import { PlayerRegistration } from '@/store/usePlayerStore';
import { apiRequest, isApiConfigured } from './api';

export interface TeamEntryPayload {
  eventType: string;
  teamName?: string;
  members: Array<{
    memberName: string;
    memberPlayerId?: string;
    role?: 'leader' | 'member' | 'reserve';
  }>;
}

export interface PlayerRegistrationPayload {
  tournamentCode: string;
  registrationMode?: 'new' | 'existing';
  updateReason?: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  guardianName?: string;
  phone: string;
  email: string;
  address?: string;
  state?: string;
  district?: string;
  pincode?: string;
  occupation?: string;
  educationType?: 'school' | 'college' | 'occupation';
  educationClass?: string;
  registrationSecret?: string;
  beltColor: string;
  danId?: string;
  weight: number;
  club?: string;
  coach?: string;
  experience?: string;
  aadhaarNumber?: string;
  aadhaarVerified: boolean;
  emailVerified: boolean;
  dobVerified: boolean;
  events: string[];
  teamEntries?: TeamEntryPayload[];
}

export interface RegisteredPlayer extends PlayerRegistration {
  pricing?: {
    totalFee: number;
    firstEventFee: number;
    additionalEventFee: number;
    eventFees: number[];
  };
  events?: Array<{
    id: string;
    eventType: string;
    entryFeePaid: number;
    teamName?: string | null;
    teamMemberCount?: number;
  }>;
}

export interface ExistingPlayerProfile {
  playerCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  guardianName?: string;
  phone: string;
  email: string;
  address?: string;
  state?: string;
  district?: string;
  pincode?: string;
  occupation?: string;
  educationType?: 'school' | 'college' | 'occupation';
  educationClass?: string;
  beltColor: string;
  danId?: string;
  weight: number;
  club?: string;
  coach?: string;
  experience?: string;
  registrationSecretConfigured?: boolean;
  aadhaarVerified: boolean;
  emailVerified: boolean;
  dobVerified: boolean;
  events: string[];
}

const STORAGE_KEY = 'tkd-players';

function getStoredPlayers(): PlayerRegistration[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setStoredPlayers(players: PlayerRegistration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function normalizeApiPlayer(data: any, tournamentCode?: string): RegisteredPlayer {
  return {
    id: data.id,
    playerCode: data.player_code,
    tournamentCode: tournamentCode ?? data.tournament_code ?? '',
    fullName: data.full_name,
    dateOfBirth: data.date_of_birth,
    gender: data.gender,
    guardianName: data.guardian_name ?? undefined,
    phone: data.phone,
    email: data.email ?? '',
    address: data.address ?? undefined,
    state: data.state ?? undefined,
    district: data.district ?? undefined,
    pincode: data.pincode ?? undefined,
    occupation: data.occupation ?? undefined,
    educationType: data.education_type ?? undefined,
    educationClass: data.education_class ?? undefined,
    beltColor: data.belt_color,
    danId: data.dan_id ?? undefined,
    weight: Number(data.weight_kg ?? 0),
    weightCategory: data.weight_category,
    ageCategory: data.age_category,
    club: data.club_name ?? undefined,
    coach: data.coach_name ?? undefined,
    experience: data.experience_years != null ? String(data.experience_years) : undefined,
    aadhaarVerified: Boolean(data.aadhaar_verified),
    emailVerified: Boolean(data.email_verified),
    dobVerified: Boolean(data.dob_verified),
    registeredAt: data.registered_at ?? new Date().toISOString(),
    status: data.registration_status === 'approved' ? 'approved' : data.registration_status === 'verified' ? 'verified' : 'pending',
    pricing: data.pricing,
    events: data.events,
  };
}

export const playerService = {
  async getAll(): Promise<PlayerRegistration[]> {
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: PlayerRegistration[] }>('/api/players');
        return res.data;
      } catch { /* fallback to localStorage */ }
    }
    return getStoredPlayers();
  },

  async getByCode(playerCode: string): Promise<PlayerRegistration | null> {
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: any }>(`/api/players/${playerCode}`);
        return normalizeApiPlayer(res.data);
      } catch { /* fallback */ }
    }
    const players = getStoredPlayers();
    return players.find(p => p.playerCode === playerCode) || null;
  },

  async getByTournament(tournamentCode: string): Promise<PlayerRegistration[]> {
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: PlayerRegistration[] }>(`/api/players?tournamentId=${tournamentCode}`);
        return res.data;
      } catch { /* fallback */ }
    }
    const players = getStoredPlayers();
    return players.filter(p => p.tournamentCode === tournamentCode);
  },

  async getByCategory(tournamentCode: string, weightCategory: string, ageCategory: string): Promise<PlayerRegistration[]> {
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: PlayerRegistration[] }>(
          `/api/players?tournamentId=${tournamentCode}&weightCategory=${encodeURIComponent(weightCategory)}&ageCategory=${encodeURIComponent(ageCategory)}`
        );
        return res.data;
      } catch { /* fallback */ }
    }
    const players = getStoredPlayers();
    return players.filter(
      p => p.tournamentCode === tournamentCode &&
           p.weightCategory === weightCategory &&
           p.ageCategory === ageCategory
    );
  },

  async create(player: PlayerRegistrationPayload): Promise<RegisteredPlayer> {
    if (isApiConfigured()) {
      const res = await apiRequest<{ data: any }>('/api/players/register', {
        method: 'POST',
        body: {
          ...player,
          weightKg: player.weight,
          coachName: player.coach,
          experienceYears: player.experience ? Number.parseInt(player.experience, 10) || undefined : undefined,
        },
      });
      return normalizeApiPlayer(res.data, player.tournamentCode);
    }

    const localPlayer: RegisteredPlayer = {
      id: crypto.randomUUID(),
      playerCode: `LOCAL-${Date.now()}`,
      tournamentCode: player.tournamentCode,
      fullName: player.fullName,
      dateOfBirth: player.dateOfBirth,
      gender: player.gender,
      guardianName: player.guardianName,
      phone: player.phone,
      email: player.email,
      address: player.address,
      state: player.state,
      district: player.district,
      pincode: player.pincode,
      occupation: player.occupation,
      educationType: player.educationType,
      educationClass: player.educationClass,
      registrationSecret: player.registrationSecret,
      beltColor: player.beltColor,
      danId: player.danId,
      weight: player.weight,
      weightCategory: '',
      ageCategory: '',
      club: player.club,
      coach: player.coach,
      experience: player.experience,
      aadhaarVerified: player.aadhaarVerified,
      emailVerified: player.emailVerified,
      dobVerified: player.dobVerified,
      registeredAt: new Date().toISOString(),
      status: 'pending',
      events: player.events.map((eventType, index) => ({
        id: `LOCAL-EVENT-${index + 1}`,
        eventType,
        entryFeePaid: 0,
      })),
    };
    const players = getStoredPlayers();
    players.push(localPlayer);
    setStoredPlayers(players);
    return localPlayer;
  },

  async lookupExistingProfile(playerCode: string, secretKey: string): Promise<ExistingPlayerProfile> {
    if (!isApiConfigured()) {
      const local = getStoredPlayers().find(
        (p) => p.playerCode.toUpperCase() === playerCode.trim().toUpperCase()
      );
      if (!local) {
        throw new Error('Player profile not found.');
      }
      return {
        playerCode: local.playerCode,
        fullName: local.fullName,
        dateOfBirth: local.dateOfBirth,
        gender: local.gender,
        guardianName: local.guardianName,
        phone: local.phone,
        email: local.email,
        address: local.address,
        state: local.state,
        district: local.district,
        pincode: local.pincode,
        occupation: local.occupation,
        beltColor: local.beltColor,
        danId: local.danId,
        weight: local.weight,
        club: local.club,
        coach: local.coach,
        experience: local.experience,
        aadhaarVerified: local.aadhaarVerified,
        emailVerified: local.emailVerified,
        dobVerified: local.dobVerified,
        events: ['kyorugi'],
      };
    }

    const res = await apiRequest<{ data: { player: ExistingPlayerProfile } }>(
      `/api/players/profile/${encodeURIComponent(playerCode.trim())}?secretKey=${encodeURIComponent(secretKey.trim())}`,
      { method: 'GET', skipAuth: true }
    );
    return res.data.player;
  },

  async update(playerCode: string, updates: Partial<PlayerRegistration>): Promise<PlayerRegistration | null> {
    if (isApiConfigured()) {
      try {
        const res = await apiRequest<{ data: PlayerRegistration }>(`/api/players/${playerCode}`, {
          method: 'PATCH', body: updates,
        });
        return res.data;
      } catch { /* fallback */ }
    }
    const players = getStoredPlayers();
    const index = players.findIndex(p => p.playerCode === playerCode);
    if (index === -1) return null;
    players[index] = { ...players[index], ...updates };
    setStoredPlayers(players);
    return players[index];
  },

  async remove(playerCode: string): Promise<boolean> {
    if (isApiConfigured()) {
      try {
        await apiRequest(`/api/players/${playerCode}`, { method: 'DELETE' });
        return true;
      } catch { /* fallback */ }
    }
    const players = getStoredPlayers();
    const filtered = players.filter(p => p.playerCode !== playerCode);
    if (filtered.length === players.length) return false;
    setStoredPlayers(filtered);
    return true;
  },

  // Mock verification services
  async verifyAadhaar(_aadhaarNumber: string): Promise<{ verified: boolean; name?: string; dob?: string }> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { verified: true };
  },

  async sendEmailOtp(_email: string): Promise<{ sent: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { sent: true };
  },

  async verifyEmailOtp(_email: string, _otp: string): Promise<{ verified: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { verified: true };
  },
};
