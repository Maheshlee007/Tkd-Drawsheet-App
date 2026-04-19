/**
 * Taekwondo age and weight category utilities
 * Based on standard WT (World Taekwondo) competition categories
 */

export interface AgeCategory {
  name: string;
  minAge: number;
  maxAge: number;
}

export interface WeightCategory {
  name: string;
  minWeight: number;
  maxWeight: number;
  gender: 'male' | 'female';
  ageCategory: string;
}

// Standard age categories
export const AGE_CATEGORIES: AgeCategory[] = [
  { name: 'Cadet', minAge: 12, maxAge: 14 },
  { name: 'Junior', minAge: 15, maxAge: 17 },
  { name: 'Senior', minAge: 18, maxAge: 40 },
  { name: 'Sub-Junior', minAge: 8, maxAge: 11 },
  { name: 'Veteran', minAge: 41, maxAge: 65 },
];

// Standard weight categories per age group and gender
export const WEIGHT_CATEGORIES: WeightCategory[] = [
  // Sub-Junior Male
  { name: 'Fin', minWeight: 0, maxWeight: 18, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Super Fin', minWeight: 18, maxWeight: 21, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Fly', minWeight: 21, maxWeight: 23, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Super Fly', minWeight: 23, maxWeight: 25, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Bantam', minWeight: 25, maxWeight: 27, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Feather', minWeight: 27, maxWeight: 29, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Light', minWeight: 29, maxWeight: 32, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Welter', minWeight: 32, maxWeight: 35, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Light Middle', minWeight: 35, maxWeight: 38, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Middle', minWeight: 38, maxWeight: 41, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Light Heavy', minWeight: 41, maxWeight: 44, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Heavy', minWeight: 44, maxWeight: 50, gender: 'male', ageCategory: 'Sub-Junior' },
  { name: 'Super Heavy', minWeight: 50, maxWeight: 999, gender: 'male', ageCategory: 'Sub-Junior' },

  // Sub-Junior Female
  { name: 'Fin', minWeight: 0, maxWeight: 16, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Super Fin', minWeight: 16, maxWeight: 18, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Fly', minWeight: 18, maxWeight: 20, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Super Fly', minWeight: 20, maxWeight: 22, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Bantam', minWeight: 22, maxWeight: 24, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Feather', minWeight: 24, maxWeight: 26, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Light', minWeight: 26, maxWeight: 29, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Welter', minWeight: 29, maxWeight: 32, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Light Middle', minWeight: 32, maxWeight: 35, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Middle', minWeight: 35, maxWeight: 38, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Light Heavy', minWeight: 38, maxWeight: 41, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Heavy', minWeight: 41, maxWeight: 47, gender: 'female', ageCategory: 'Sub-Junior' },
  { name: 'Super Heavy', minWeight: 47, maxWeight: 999, gender: 'female', ageCategory: 'Sub-Junior' },

  // Senior Male
  { name: 'Fin', minWeight: 0, maxWeight: 54, gender: 'male', ageCategory: 'Senior' },
  { name: 'Fly', minWeight: 54, maxWeight: 58, gender: 'male', ageCategory: 'Senior' },
  { name: 'Bantam', minWeight: 58, maxWeight: 63, gender: 'male', ageCategory: 'Senior' },
  { name: 'Feather', minWeight: 63, maxWeight: 68, gender: 'male', ageCategory: 'Senior' },
  { name: 'Light', minWeight: 68, maxWeight: 74, gender: 'male', ageCategory: 'Senior' },
  { name: 'Welter', minWeight: 74, maxWeight: 80, gender: 'male', ageCategory: 'Senior' },
  { name: 'Middle', minWeight: 80, maxWeight: 87, gender: 'male', ageCategory: 'Senior' },
  { name: 'Heavy', minWeight: 87, maxWeight: 999, gender: 'male', ageCategory: 'Senior' },

  // Senior Female
  { name: 'Fin', minWeight: 0, maxWeight: 46, gender: 'female', ageCategory: 'Senior' },
  { name: 'Fly', minWeight: 46, maxWeight: 49, gender: 'female', ageCategory: 'Senior' },
  { name: 'Bantam', minWeight: 49, maxWeight: 53, gender: 'female', ageCategory: 'Senior' },
  { name: 'Feather', minWeight: 53, maxWeight: 57, gender: 'female', ageCategory: 'Senior' },
  { name: 'Light', minWeight: 57, maxWeight: 62, gender: 'female', ageCategory: 'Senior' },
  { name: 'Welter', minWeight: 62, maxWeight: 67, gender: 'female', ageCategory: 'Senior' },
  { name: 'Middle', minWeight: 67, maxWeight: 73, gender: 'female', ageCategory: 'Senior' },
  { name: 'Heavy', minWeight: 73, maxWeight: 999, gender: 'female', ageCategory: 'Senior' },

  // Junior Male
  { name: 'Fin', minWeight: 0, maxWeight: 45, gender: 'male', ageCategory: 'Junior' },
  { name: 'Fly', minWeight: 45, maxWeight: 48, gender: 'male', ageCategory: 'Junior' },
  { name: 'Bantam', minWeight: 48, maxWeight: 51, gender: 'male', ageCategory: 'Junior' },
  { name: 'Feather', minWeight: 51, maxWeight: 55, gender: 'male', ageCategory: 'Junior' },
  { name: 'Light', minWeight: 55, maxWeight: 59, gender: 'male', ageCategory: 'Junior' },
  { name: 'Welter', minWeight: 59, maxWeight: 63, gender: 'male', ageCategory: 'Junior' },
  { name: 'Light Middle', minWeight: 63, maxWeight: 68, gender: 'male', ageCategory: 'Junior' },
  { name: 'Middle', minWeight: 68, maxWeight: 73, gender: 'male', ageCategory: 'Junior' },
  { name: 'Light Heavy', minWeight: 73, maxWeight: 78, gender: 'male', ageCategory: 'Junior' },
  { name: 'Heavy', minWeight: 78, maxWeight: 999, gender: 'male', ageCategory: 'Junior' },

  // Junior Female
  { name: 'Fin', minWeight: 0, maxWeight: 42, gender: 'female', ageCategory: 'Junior' },
  { name: 'Fly', minWeight: 42, maxWeight: 44, gender: 'female', ageCategory: 'Junior' },
  { name: 'Bantam', minWeight: 44, maxWeight: 46, gender: 'female', ageCategory: 'Junior' },
  { name: 'Feather', minWeight: 46, maxWeight: 49, gender: 'female', ageCategory: 'Junior' },
  { name: 'Light', minWeight: 49, maxWeight: 52, gender: 'female', ageCategory: 'Junior' },
  { name: 'Welter', minWeight: 52, maxWeight: 55, gender: 'female', ageCategory: 'Junior' },
  { name: 'Light Middle', minWeight: 55, maxWeight: 59, gender: 'female', ageCategory: 'Junior' },
  { name: 'Middle', minWeight: 59, maxWeight: 63, gender: 'female', ageCategory: 'Junior' },
  { name: 'Light Heavy', minWeight: 63, maxWeight: 68, gender: 'female', ageCategory: 'Junior' },
  { name: 'Heavy', minWeight: 68, maxWeight: 999, gender: 'female', ageCategory: 'Junior' },

  // Cadet Male
  { name: 'Fin', minWeight: 0, maxWeight: 33, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Fly', minWeight: 33, maxWeight: 37, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Bantam', minWeight: 37, maxWeight: 41, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Feather', minWeight: 41, maxWeight: 45, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Light', minWeight: 45, maxWeight: 49, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Welter', minWeight: 49, maxWeight: 53, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Light Middle', minWeight: 53, maxWeight: 57, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Middle', minWeight: 57, maxWeight: 61, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Light Heavy', minWeight: 61, maxWeight: 65, gender: 'male', ageCategory: 'Cadet' },
  { name: 'Heavy', minWeight: 65, maxWeight: 999, gender: 'male', ageCategory: 'Cadet' },

  // Cadet Female
  { name: 'Fin', minWeight: 0, maxWeight: 29, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Fly', minWeight: 29, maxWeight: 33, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Bantam', minWeight: 33, maxWeight: 37, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Feather', minWeight: 37, maxWeight: 41, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Light', minWeight: 41, maxWeight: 44, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Welter', minWeight: 44, maxWeight: 47, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Light Middle', minWeight: 47, maxWeight: 51, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Middle', minWeight: 51, maxWeight: 55, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Light Heavy', minWeight: 55, maxWeight: 59, gender: 'female', ageCategory: 'Cadet' },
  { name: 'Heavy', minWeight: 59, maxWeight: 999, gender: 'female', ageCategory: 'Cadet' },
];

// Belt levels
export const BELT_LEVELS = [
  'White Belt',
  'Yellow Belt',
  'Yellow Belt (Stripe)',
  'Green Belt',
  'Green Belt (Stripe)',
  'Blue Belt',
  'Blue Belt (Stripe)',
  'Red Belt',
  'Red Belt (Stripe)',
  'Black Belt 1st Dan',
  'Black Belt 2nd Dan',
  'Black Belt 3rd Dan',
  'Black Belt 4th Dan',
  'Black Belt 5th Dan',
  'Black Belt 6th Dan and above',
];

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get age category from date of birth
 */
export function getAgeCategory(dob: string): string {
  const age = calculateAge(dob);
  const category = AGE_CATEGORIES.find(c => age >= c.minAge && age <= c.maxAge);
  return category?.name || 'Unknown';
}

function normalizeAssociationType(value?: string | null): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'association') return 'Association';
  if (raw === 'sgfi') return 'SGFI';
  if (raw === 'university') return 'University';
  // WT, national, club, other, empty — all default to WT
  return 'WT';
}

export function getAgeCategoryForAssociation(dob: string, associationType?: string | null): string {
  const normalized = normalizeAssociationType(associationType);
  if (normalized === 'SGFI') {
    const age = calculateAge(dob);
    if (age <= 14) return 'U-14';
    if (age <= 17) return 'U-17';
    return 'U-19';
  }
  return getAgeCategory(dob);
}

/**
 * Get weight category based on weight, age category, and gender
 */
export function getWeightCategory(
  weight: number,
  ageCategory: string,
  gender: 'male' | 'female'
): string {
  const matching = WEIGHT_CATEGORIES.filter(
    c => c.ageCategory === ageCategory && c.gender === gender
  );

  const category = matching.find(c => weight > c.minWeight && weight <= c.maxWeight);
  if (!category) {
    // Find the highest weight class as fallback
    const highest = matching[matching.length - 1];
    if (highest && weight > highest.minWeight) return highest.name;
    return 'Unknown';
  }
  return `${category.name} (${category.minWeight > 0 ? category.minWeight + '-' : 'Under '}${category.maxWeight < 999 ? category.maxWeight + 'kg' : category.minWeight + 'kg+'})`;
}

/**
 * Check if a player is under 18 (requires guardian info)
 */
export function isMinor(dob: string): boolean {
  return calculateAge(dob) < 18;
}

/**
 * Validate Aadhaar number format (12 digits, basic Verhoeff check)
 */
export function isValidAadhaarFormat(aadhaar: string): boolean {
  // Must be exactly 12 digits
  if (!/^\d{12}$/.test(aadhaar)) return false;
  // First digit cannot be 0 or 1
  if (aadhaar[0] === '0' || aadhaar[0] === '1') return false;
  return true;
}

/**
 * Generate a unique player code
 */
export function generatePlayerCode(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKD-${mm}${dd}-${code}`;
}

/**
 * Generate a unique tournament code
 */
export function generateTournamentCode(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EVT-${year}-${code}`;
}
