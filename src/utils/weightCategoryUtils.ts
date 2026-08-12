import type { WeightCategory } from '@/services/weightCategoryService';

/** Map a tournament's association_type onto the association key used by the weight-category reference data. */
export function normalizeWeightAssociationType(value?: string | null): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'association') return 'Association';
  if (raw === 'sgfi') return 'SGFI';
  if (raw === 'university') return 'University';
  // WT, national, club, other, empty — all default to WT
  return 'WT';
}

/** Find the weight-category row a given weight falls into (min < weight <= max; max >= 999 means open-ended). */
export function resolveWeightCategoryFromRows(weightKg: number, rows: WeightCategory[]): WeightCategory | null {
  const sorted = [...rows].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const category = sorted.find((row) => {
    const min = Number(row.min_weight_kg);
    const max = Number(row.max_weight_kg);
    if (max >= 999) return weightKg > min;
    return weightKg > min && weightKg <= max;
  });
  return category ?? null;
}

/** Human-readable label for a weight-category row, e.g. "Fly (52-54kg)", "Fin (Under 54kg)", "Heavy (Over 87kg)". */
export function formatWeightCategoryLabel(category: WeightCategory): string {
  const min = Number(category.min_weight_kg);
  const max = Number(category.max_weight_kg);
  if (max >= 999) return `${category.weight_class} (Over ${min}kg)`;
  if (min <= 0) return `${category.weight_class} (Under ${max}kg)`;
  return `${category.weight_class} (${min}-${max}kg)`;
}

/** Resolve a weight to its category label, or '' if no row matches. */
export function resolveWeightCategoryLabelFromRows(weightKg: number, rows: WeightCategory[]): string {
  const category = resolveWeightCategoryFromRows(weightKg, rows);
  return category ? formatWeightCategoryLabel(category) : '';
}
