import { apiRequest } from './api';

export interface WeightCategory {
  id: number;
  association: string;
  age_category: string;
  gender: string;
  weight_class: string;
  min_weight_kg: number;
  max_weight_kg: number;
  sort_order: number;
}

export const weightCategoryService = {
  async getAll(filters?: { association?: string; age_category?: string; gender?: string }): Promise<WeightCategory[]> {
    const params = new URLSearchParams();
    if (filters?.association) params.set('association', filters.association);
    if (filters?.age_category) params.set('age_category', filters.age_category);
    if (filters?.gender) params.set('gender', filters.gender);
    const qs = params.toString();
    const res = await apiRequest<{ data: WeightCategory[] }>(`/api/weight-categories${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  async getAssociations(): Promise<string[]> {
    const res = await apiRequest<{ data: string[] }>('/api/weight-categories/associations');
    return res.data;
  },

  async create(category: Omit<WeightCategory, 'id'>): Promise<WeightCategory> {
    const res = await apiRequest<{ data: WeightCategory }>('/api/weight-categories', {
      method: 'POST', body: category,
    });
    return res.data;
  },

  async update(id: number, patch: Partial<WeightCategory>): Promise<WeightCategory> {
    const res = await apiRequest<{ data: WeightCategory }>(`/api/weight-categories/${id}`, {
      method: 'PATCH', body: patch,
    });
    return res.data;
  },

  async remove(id: number): Promise<void> {
    await apiRequest(`/api/weight-categories/${id}`, { method: 'DELETE' });
  },

  async bulkCreate(categories: Omit<WeightCategory, 'id'>[]): Promise<{ inserted: number; total: number }> {
    const res = await apiRequest<{ data: { inserted: number; total: number } }>('/api/weight-categories/bulk', {
      method: 'POST', body: { categories },
    });
    return res.data;
  },
};
