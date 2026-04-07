import { apiRequest } from './api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse<T = any> = { success: boolean; data: T; message?: string };

export const dashboardService = {
  getMatchProgress: (tournamentId: string, filters?: { ageCategory?: string; gender?: string; eventType?: string }) => {
    const params = new URLSearchParams();
    if (filters?.ageCategory) params.set('ageCategory', filters.ageCategory);
    if (filters?.gender) params.set('gender', filters.gender);
    if (filters?.eventType) params.set('eventType', filters.eventType);
    const qs = params.toString();
    return apiRequest<ApiResponse>(`/api/dashboard/matches/${tournamentId}${qs ? `?${qs}` : ''}`);
  },

  getOverview: (tournamentId: string) =>
    apiRequest<ApiResponse>(`/api/dashboard/overview/${tournamentId}`),

  getJudgeAssignments: (tournamentId: string) =>
    apiRequest<ApiResponse>(`/api/dashboard/judge-assignments/${tournamentId}`),
};
