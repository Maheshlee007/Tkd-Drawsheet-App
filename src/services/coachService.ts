import { apiRequest } from './api';

export interface Coach {
  id: string;
  user_id: string;
  coach_code: string;
  club_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  belt_rank?: string;
  experience_years?: number;
  is_active: boolean;
  created_at: string;
}

export const coachService = {
  async register(data: {
    tournamentCode: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    clubName?: string;
    beltRank?: string;
    experienceYears?: number;
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
};
