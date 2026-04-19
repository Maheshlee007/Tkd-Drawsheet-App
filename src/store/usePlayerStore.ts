import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generatePlayerCode, getAgeCategory, getWeightCategory } from '@/utils/categoryUtils';

export interface PlayerRegistration {
  id: string;
  playerCode: string;
  tournamentCode: string;
  // Basic info
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  guardianName?: string;
  phone: string;
  email: string;
  address?: string;
  state?: string;
  district?: string;
  pincode?: string;
  occupation?: string;
  educationType?: 'school' | 'college' | 'occupation';
  educationClass?: string;
  registrationSecret?: string;
  // TKD details
  beltColor: string;
  danId?: string;
  weight: number;
  weightCategory: string;
  ageCategory: string;
  club?: string;
  coach?: string;
  experience?: string;
  // Verification
  aadhaarNumber?: string;
  aadhaarVerified: boolean;
  emailVerified: boolean;
  dobVerified: boolean;
  // Meta
  registeredAt: string;
  status: 'pending' | 'verified' | 'approved';
}

interface PlayerState {
  players: PlayerRegistration[];

  addPlayer: (playerData: Omit<PlayerRegistration, 'id' | 'playerCode' | 'weightCategory' | 'ageCategory' | 'registeredAt' | 'status'>) => PlayerRegistration;
  updatePlayer: (playerCode: string, updates: Partial<PlayerRegistration>) => boolean;
  removePlayer: (playerCode: string) => boolean;
  getPlayerByCode: (playerCode: string) => PlayerRegistration | undefined;
  getPlayersByTournament: (tournamentCode: string) => PlayerRegistration[];
  getPlayersByCategory: (tournamentCode: string, weightCategory: string, ageCategory: string) => PlayerRegistration[];
  getAllPlayers: () => PlayerRegistration[];
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      players: [],

      addPlayer: (playerData) => {
        const ageCategory = getAgeCategory(playerData.dateOfBirth);
        const weightCategory = getWeightCategory(
          playerData.weight,
          ageCategory,
          playerData.gender
        );

        const newPlayer: PlayerRegistration = {
          ...playerData,
          id: crypto.randomUUID(),
          playerCode: generatePlayerCode(),
          ageCategory,
          weightCategory,
          registeredAt: new Date().toISOString(),
          status: 'pending',
        };

        set(state => ({
          players: [...state.players, newPlayer]
        }));

        return newPlayer;
      },

      updatePlayer: (playerCode, updates) => {
        const { players } = get();
        const index = players.findIndex(p => p.playerCode === playerCode);
        if (index === -1) return false;

        const updated = [...players];
        updated[index] = { ...updated[index], ...updates };
        set({ players: updated });
        return true;
      },

      removePlayer: (playerCode) => {
        const { players } = get();
        const filtered = players.filter(p => p.playerCode !== playerCode);
        if (filtered.length === players.length) return false;
        set({ players: filtered });
        return true;
      },

      getPlayerByCode: (playerCode) => {
        return get().players.find(p => p.playerCode === playerCode);
      },

      getPlayersByTournament: (tournamentCode) => {
        return get().players.filter(p => p.tournamentCode === tournamentCode);
      },

      getPlayersByCategory: (tournamentCode, weightCategory, ageCategory) => {
        return get().players.filter(
          p => p.tournamentCode === tournamentCode &&
               p.weightCategory === weightCategory &&
               p.ageCategory === ageCategory
        );
      },

      getAllPlayers: () => {
        return get().players;
      },
    }),
    {
      name: 'tkd-players',
      version: 1,
    }
  )
);
