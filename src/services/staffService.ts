import { apiRequest } from './api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse<T = any> = { success: boolean; data: T; count?: number; message?: string };

export interface StaffMember {
  id: string;
  tournament_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  assigned_by: string;
  notes: string | null;
  email: string;
  first_name: string;
  last_name: string;
  user_phone: string | null;
  user_active: boolean;
}

export interface StaffUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
}

export interface StaffTournamentScope {
  id: string;
  tournament_code: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  assigned_role?: string;
}

export const staffService = {
  listByTournament: (tournamentId: string) =>
    apiRequest<ApiResponse<StaffMember[]>>(`/api/staff/${tournamentId}`),

  getStaffSummary: (tournamentId: string) =>
    apiRequest<ApiResponse<{ role: string; count: number }[]>>(`/api/staff/${tournamentId}/summary`),

  listUsersByRole: (roleName: string) =>
    apiRequest<ApiResponse<StaffUser[]>>(`/api/staff/users-by-role/${roleName}`),

  myTournaments: () =>
    apiRequest<ApiResponse<StaffTournamentScope[]>>('/api/staff/my-tournaments'),

  assignStaff: (data: { tournamentId: string; userId: string; roles: string[]; notes?: string }) =>
    apiRequest<ApiResponse>('/api/staff/assign', { method: 'POST', body: data }),

  removeStaff: (data: { tournamentId: string; userId: string; role: string }) =>
    apiRequest<ApiResponse>('/api/staff/remove', { method: 'DELETE', body: data }),
};
