import { apiRequest } from './api';

/**
 * Real email OTP verification (backend routes/verification.ts).
 * Public endpoints — always skipAuth so a stale token can't 401 anonymous visitors.
 * The OTP code itself never appears in any response: the user reads it from
 * their inbox (or the backend log / tkd_notifications in dev).
 */
export const verificationService = {
  async sendEmailOtp(
    email: string,
    opts?: { tournamentCode?: string; purpose?: 'player_registration' | 'coach_registration' }
  ): Promise<{ sent: boolean; expiresAt: string; resendAfterSeconds: number }> {
    const res = await apiRequest<{ data: { sent: boolean; expiresAt: string; resendAfterSeconds: number } }>(
      '/api/verification/email/send',
      {
        method: 'POST',
        body: { email, tournamentCode: opts?.tournamentCode, purpose: opts?.purpose },
        skipAuth: true,
      }
    );
    return res.data;
  },

  async verifyEmailOtp(
    email: string,
    otp: string,
    purpose?: 'player_registration' | 'coach_registration'
  ): Promise<{ verified: boolean; reason?: 'no_active_code' | 'expired' | 'locked' | 'mismatch' }> {
    const res = await apiRequest<{ data: { verified: boolean; reason?: any } }>(
      '/api/verification/email/verify',
      { method: 'POST', body: { email, otp, purpose }, skipAuth: true }
    );
    return res.data;
  },
};
