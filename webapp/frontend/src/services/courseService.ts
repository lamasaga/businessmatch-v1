import api from '../lib/api';
import type { Course, ApiResponse } from '../types';

interface CourseFilters {
  category?: string;
  level?: string;
  search?: string;
}

export const courseService = {
  async getCourses(filters?: CourseFilters): Promise<Course[]> {
    const params = new URLSearchParams();
    if (filters?.category && filters.category !== '全部') {
      params.append('category', filters.category);
    }
    if (filters?.level && filters.level !== '全部') {
      params.append('level', filters.level);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    const response = await api.get<ApiResponse<Course[]>>(`/api/v1/courses?${params.toString()}`);
    return response.data.data ?? [];
  },

  async getCourse(id: string): Promise<Course> {
    const response = await api.get<ApiResponse<Course>>(`/api/v1/courses/${id}`);
    return response.data.data!;
  },
};
