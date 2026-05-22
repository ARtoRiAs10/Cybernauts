import type {
  User,
  GraphData,
  RecommendationsResponse,
} from '../types';

// Hardcoded — no env var that can be set wrong on Vercel
const BASE = 'https://cybernauts-qu78.vercel.app/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(json.error ?? `Server error returned with status: ${res.status}`);
  }

  return json.data ?? json;
}

export const api = {
  // Users
  getUsers: () => req<User[]>('/users'),
  getUser: (id: string) => req<User>(`/users/${id}`),
  createUser: (body: { username: string; age: number; hobbies: string[] }) =>
    req<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (
    id: string,
    body: Partial<{ username: string; age: number; hobbies: string[] }>
  ) => req<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id: string) =>
    req<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),

  // Relationships
  linkUsers: (id: string, targetUserId: string) =>
    req<{ message: string }>(`/users/${id}/link`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),
  unlinkUsers: (id: string, targetUserId: string) =>
    // FIX: was /unlink/${targetUserId} — backend expects body, not URL param
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