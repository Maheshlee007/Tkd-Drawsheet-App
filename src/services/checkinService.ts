import { apiRequest } from './api';

export interface CheckinPlayer {
  player: {
    id: string;
    player_code: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    email: string;
    club_name?: string;
    coach_name?: string;
  };
  events: Array<{
    id: string;
    event_type: string;
    category_name: string;
  }>;
  checkin?: {
    id: string;
    actual_weight_kg: number;
    weight_status: string;
    payment_amount: number;
    payment_method: string;
    payment_status: string;
    checked_in_at: string;
  };
}

export interface CheckinData {
  player_id: string;
  tournament_id: string;
  actual_weight_kg: number;
  weight_status: 'pass' | 'fail' | 'overweight' | 'underweight';
  payment_amount: number;
  payment_method: 'cash' | 'gpay' | 'bank_transfer' | 'other';
  payment_status: 'paid' | 'partial' | 'unpaid';
  notes?: string;
}

export const checkinService = {
  async lookupPlayer(playerCode: string): Promise<CheckinPlayer> {
    const res = await apiRequest<{ data: CheckinPlayer }>(`/api/checkin/player/${playerCode}`);
    return res.data;
  },

  async createCheckin(data: CheckinData): Promise<any> {
    const res = await apiRequest<{ data: any }>('/api/checkin', {
      method: 'POST',
      body: data,
    });
    return res.data;
  },

  async updatePayment(checkinId: string, data: { amount: number; method: string; status: string }): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/checkin/${checkinId}/payment`, {
      method: 'PATCH',
      body: data,
    });
    return res.data;
  },

  async getPaymentReport(tournamentId: string): Promise<any> {
    const res = await apiRequest<{ data: any }>(`/api/checkin/tournament/${tournamentId}/report`);
    return res.data;
  },
};
