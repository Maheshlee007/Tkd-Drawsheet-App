import { apiRequest } from './api';

export interface CheckinPlayer {
  player: {
    id: string;
    player_code: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    email?: string;
    belt_color?: string;
    weight_kg?: number;
    age_category?: string;
    weight_category?: string;
    club_name?: string;
    coach_name?: string;
    state?: string;
    city?: string;
    school_college?: string;
    registration_status?: string;
    payment_status?: string;
    tournament_id: string;
  };
  events: Array<{
    id: string;
    event_type: string;
    entry_fee_paid?: number;
    category_name?: string;
    age_category?: string;
    weight_category?: string;
    gender?: string;
    status?: string;
  }>;
  checkin?: {
    id: string;
    status: string;
    weight_recorded_kg: number;
    weigh_in_passed: boolean;
    total_fee: number;
    amount_paid: number;
    balance: number;
    payment_method: string;
    checked_in_at: string;
  } | null;
}

export interface CheckinData {
  playerId: string;
  tournamentId: string;
  weightRecordedKg?: number;
  weighInPassed?: boolean;
  eventsConfirmed?: string[];
  totalFee?: number;
  amountPaid?: number;
  paymentMethod?: 'cash' | 'gpay' | 'upi' | 'card' | 'online' | 'waived';
  paymentReference?: string;
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

  async updatePayment(checkinId: string, data: {
    amountPaid: number;
    paymentMethod?: string;
    paymentReference?: string;
    reasonCode: string;
    reasonNotes?: string;
  }): Promise<any> {
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
