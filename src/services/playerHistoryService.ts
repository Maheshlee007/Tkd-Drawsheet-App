import { apiRequest } from './api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse<T = any> = { success: boolean; data: T; message?: string };

export const passwordService = {
  resetPassword: (data: { userId: string; newPassword: string; mustChangeOnLogin?: boolean }) =>
    apiRequest<ApiResponse>('/api/password/reset', { method: 'PATCH', body: data }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiRequest<ApiResponse>('/api/password/change', { method: 'PATCH', body: data }),
};

export const playerHistoryService = {
  lookup: (phone: string) =>
    apiRequest<ApiResponse>(`/api/player-history/lookup?phone=${encodeURIComponent(phone)}`),

  getHistory: (identityId: string) =>
    apiRequest<ApiResponse>(`/api/player-history/${identityId}`),

  getPlayerDetail: (playerId: string) =>
    apiRequest<ApiResponse>(`/api/player-detail/${playerId}`),

  linkPlayer: (data: {
    playerId: string; phone: string; dateOfBirth: string;
    fullName: string; gender: string; state?: string; city?: string; schoolCollege?: string;
  }) => apiRequest<ApiResponse>('/api/player-history/link', { method: 'POST', body: data }),
};
