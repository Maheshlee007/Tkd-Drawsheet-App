import { PlayerRegistration } from '@/store/usePlayerStore';

const STORAGE_KEY = 'tkd-players';

function getStoredPlayers(): PlayerRegistration[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setStoredPlayers(players: PlayerRegistration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export const playerService = {
  async getAll(): Promise<PlayerRegistration[]> {
    return getStoredPlayers();
  },

  async getByCode(playerCode: string): Promise<PlayerRegistration | null> {
    const players = getStoredPlayers();
    return players.find(p => p.playerCode === playerCode) || null;
  },

  async getByTournament(tournamentCode: string): Promise<PlayerRegistration[]> {
    const players = getStoredPlayers();
    return players.filter(p => p.tournamentCode === tournamentCode);
  },

  async getByCategory(tournamentCode: string, weightCategory: string, ageCategory: string): Promise<PlayerRegistration[]> {
    const players = getStoredPlayers();
    return players.filter(
      p => p.tournamentCode === tournamentCode &&
           p.weightCategory === weightCategory &&
           p.ageCategory === ageCategory
    );
  },

  async create(player: PlayerRegistration): Promise<PlayerRegistration> {
    const players = getStoredPlayers();
    players.push(player);
    setStoredPlayers(players);
    return player;
  },

  async update(playerCode: string, updates: Partial<PlayerRegistration>): Promise<PlayerRegistration | null> {
    const players = getStoredPlayers();
    const index = players.findIndex(p => p.playerCode === playerCode);
    if (index === -1) return null;
    players[index] = { ...players[index], ...updates };
    setStoredPlayers(players);
    return players[index];
  },

  async remove(playerCode: string): Promise<boolean> {
    const players = getStoredPlayers();
    const filtered = players.filter(p => p.playerCode !== playerCode);
    if (filtered.length === players.length) return false;
    setStoredPlayers(filtered);
    return true;
  },

  // Mock verification services
  async verifyAadhaar(_aadhaarNumber: string): Promise<{ verified: boolean; name?: string; dob?: string }> {
    // Mock: simulate 2s API call, always returns success
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { verified: true };
  },

  async sendEmailOtp(_email: string): Promise<{ sent: boolean }> {
    // Mock: simulate 1.5s API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { sent: true };
  },

  async verifyEmailOtp(_email: string, _otp: string): Promise<{ verified: boolean }> {
    // Mock: accept any 6-digit OTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { verified: true };
  },
};
