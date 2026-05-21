import type {
  User,
  GraphData,
  RecommendationsResponse,
} from '../types';

const BASE = '/api';

async function req<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json.data ?? json;
}

export const api = {
  // Users
  getUsers: () => req<User[]>('/users'),
  getUser: (id: string) => req<User>(`/users/${id}`),
  createUser: (body: { username: string; age: number; hobbies: string[] }) =>
    req<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: Partial<{ username: string; age: number; hobbies: string[] }>) =>
    req<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id: string) =>
    req<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),

  // Relationships
  linkUsers: (id: string, targetUserId: string) =>
    req<{ message: string }>(`/users/${id}/link`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),
  unlinkUsers: (id: string, targetUserId: string) =>
    req<{ message: string }>(`/users/${id}/unlink`, {
      method: 'DELETE',
      body: JSON.stringify({ targetUserId }),
    }),

  // Graph
  getGraph: () => req<GraphData>('/graph'),

  // Recommendations
  getRecommendations: (id: string) =>
    req<RecommendationsResponse>(`/users/${id}/recommendations`),
  postFeedback: (
    id: string,
    body: { targetId: string; type: 'friend' | 'hobby'; feedback: 'accepted' | 'rejected' }
  ) =>
    req<{ message: string }>(`/users/${id}/recommendations/feedback`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
