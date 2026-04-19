import { apiRequest } from './api';

export interface Coach {
  id: string;
  user_id: string | null;
  coach_code: string;
  club_name?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  belt_rank?: string;
  experience_years?: number;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface ExistingCoachProfile {
  coachCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  clubName?: string;
  beltRank?: string;
  poomDanNumber?: string;
  experienceYears?: number;
  photoUrl?: string;
}

export const coachService = {
  async register(data: {
    tournamentCode: string;
    registrationMode?: 'new' | 'existing';
    coachCode?: string;
    registrationSecret?: string;
    updateReason?: string;
    email?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    clubName?: string;
    beltRank?: string;
    poomDanNumber?: string;
    aadhaarNumber?: string;
    experienceYears?: number;
    photo_url?: string;
  }): Promise<Coach> {
    const res = await apiRequest<{ data: Coach }>('/api/coaches/register', {
      method: 'POST',
      body: data,
      skipAuth: true,
    });
    return res.data;
  },

  async getMyProfile(): Promise<Coach> {
    const res = await apiRequest<{ data: Coach }>('/api/coaches/me');
    return res.data;
  },

  async getAll(): Promise<Coach[]> {
    const res = await apiRequest<{ data: Coach[] }>('/api/coaches');
    return res.data;
  },

  async getById(id: string): Promise<Coach> {
    const res = await apiRequest<{ data: Coach }>(`/api/coaches/${id}`);
    return res.data;
  },

  async update(id: string, data: Partial<Coach>): Promise<Coach> {
    const res = await apiRequest<{ data: Coach }>(`/api/coaches/${id}`, {
      method: 'PATCH',
      body: data,
    });
    return res.data;
  },

  async lookupProfile(coachCode: string, secretKey: string): Promise<ExistingCoachProfile> {
    const res = await apiRequest<{ data: { coach: ExistingCoachProfile } }>(
      `/api/coaches/profile/${encodeURIComponent(coachCode.trim())}?secretKey=${encodeURIComponent(secretKey.trim())}`,
      { method: 'GET', skipAuth: true }
    );
    return res.data.coach;
  },
};
