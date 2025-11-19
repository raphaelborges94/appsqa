import { base44 } from './base44Client';
import { apiClient } from './client';

// Query builder compatível
export const Query = {
  // Métodos básicos de query
  where: (field, operator, value) => ({ field, operator, value }),
  orderBy: (field, direction = 'asc') => ({ orderBy: field, direction }),
  limit: (count) => ({ limit: count }),
  offset: (count) => ({ offset: count }),
};

// Auth SDK
export const User = base44.auth;