import { apiRequest } from './api';

const ADMIN_PREFIX = '/x7q2p9m';

export interface StaffUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: string;
  login_count: number;
  created_at: string;
  roles: string[] | null;
}

export interface RolePermission {
  name: string;
  description: string;
}

export interface RoleInfo {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
  permissions: RolePermission[] | null;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  user_email?: string;
}

export interface MedalWinner {
  player_name: string;
  player_code: string;
  club_name?: string;
  category_name: string;
  medal: 'gold' | 'silver' | 'bronze';
}

export const adminService = {
  async getUsers(): Promise<StaffUser[]> {
    const res = await apiRequest<{ data: StaffUser[] }>(`${ADMIN_PREFIX}/users`);
    return res.data;
  },

  async createUser(data: { email: string; password: string; firstName: string; lastName: string; phone?: string }): Promise<StaffUser> {
    const res = await apiRequest<{ data: StaffUser }>(`${ADMIN_PREFIX}/users`, {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  async assignRole(userId: string, role: string): Promise<void> {
    await apiRequest(`${ADMIN_PREFIX}/users/${userId}/role`, {
      method: 'PATCH',
      body: { role },
    });
  },

  async removeRole(userId: string, role: string): Promise<void> {
    await apiRequest(`${ADMIN_PREFIX}/users/${userId}/role`, {
      method: 'DELETE',
      body: { role },
    });
  },

  async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
    await apiRequest(`${ADMIN_PREFIX}/users/${userId}/status`, {
      method: 'PATCH',
      body: { isActive },
    });
  },

  async getRoles(): Promise<RoleInfo[]> {
    const res = await apiRequest<{ data: RoleInfo[] }>(`${ADMIN_PREFIX}/roles`);
    return res.data;
  },

  async getPlayers(filters?: Record<string, string>): Promise<any[]> {
    const params = new URLSearchParams(filters || {}).toString();
    const url = `${ADMIN_PREFIX}/players${params ? '?' + params : ''}`;
    const res = await apiRequest<{ data: any[] }>(url);
    return res.data;
  },

  async getMultiEventPlayers(): Promise<any[]> {
    const res = await apiRequest<{ data: any[] }>(`${ADMIN_PREFIX}/players/multi-event`);
    return res.data;
  },

  async getMedalWinners(): Promise<MedalWinner[]> {
    const res = await apiRequest<{ data: MedalWinner[] }>(`${ADMIN_PREFIX}/medals/winners`);
    return res.data;
  },

  async getExportData(): Promise<any[]> {
    const res = await apiRequest<{ data: any[] }>(`${ADMIN_PREFIX}/reports/excel`);
    return res.data;
  },

  async getAuditLogs(filters?: { limit?: number; offset?: number }): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const url = `${ADMIN_PREFIX}/audit-logs${params.toString() ? '?' + params.toString() : ''}`;
    const res = await apiRequest<{ data: AuditLog[] }>(url);
    return res.data;
  },
};
