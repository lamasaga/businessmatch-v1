import api from '../lib/api';
import type { KnowledgeCard, KnowledgeGraphData, DisciplineMap, ApiResponse } from '../types';

interface WikiFilters {
  discipline?: string;
  category?: string;
  search?: string;
}

export const wikiService = {
  async getArticles(filters?: WikiFilters): Promise<KnowledgeCard[]> {
    const params = new URLSearchParams();
    if (filters?.discipline) params.append('discipline', filters.discipline);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    const response = await api.get<ApiResponse<KnowledgeCard[]>>(
      `/api/v1/wiki/articles?${params.toString()}`
    );
    return response.data.data ?? [];
  },

  async getArticle(id: string): Promise<KnowledgeCard> {
    const response = await api.get<ApiResponse<KnowledgeCard>>(`/api/v1/wiki/articles/${id}`);
    return response.data.data!;
  },

  async getGraph(): Promise<KnowledgeGraphData> {
    const response = await api.get<ApiResponse<KnowledgeGraphData>>('/api/v1/wiki/graph');
    return response.data.data!;
  },

  async getDisciplines(): Promise<DisciplineMap> {
    const response = await api.get<ApiResponse<DisciplineMap>>('/api/v1/wiki/disciplines');
    return response.data.data ?? {};
  },
};
