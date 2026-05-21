import { create } from 'zustand';
import { api } from '../lib/api';
import type { User, GraphData } from '../types';

interface History {
  past: User[][];
  future: User[][];
}

interface AppState {
  users: User[];
  graph: GraphData | null;
  selectedUserId: string | null;
  loading: boolean;
  history: History;

  // Actions
  fetchUsers: () => Promise<void>;
  fetchGraph: () => Promise<void>;
  setSelectedUser: (id: string | null) => void;
  createUser: (data: { username: string; age: number; hobbies: string[] }) => Promise<void>;
  updateUser: (id: string, data: Partial<{ username: string; age: number; hobbies: string[] }>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  linkUsers: (id: string, targetId: string) => Promise<void>;
  unlinkUsers: (id: string, targetId: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
}

const pushHistory = (past: User[][], current: User[]): User[][] =>
  [...past.slice(-19), current];

export const useStore = create<AppState>((set, get) => ({
  users: [],
  graph: null,
  selectedUserId: null,
  loading: false,
  history: { past: [], future: [] },

  fetchUsers: async () => {
    set({ loading: true });
    const users = await api.getUsers();
    set({ users, loading: false });
  },

  fetchGraph: async () => {
    const graph = await api.getGraph();
    set({ graph });
  },

  setSelectedUser: (id) => set({ selectedUserId: id }),

  createUser: async (data) => {
    const { users, history } = get();
    await api.createUser(data);
    const next = await api.getUsers();
    const graph = await api.getGraph();
    set({
      users: next,
      graph,
      history: { past: pushHistory(history.past, users), future: [] },
    });
  },

  updateUser: async (id, data) => {
    const { users, history } = get();
    await api.updateUser(id, data);
    const next = await api.getUsers();
    const graph = await api.getGraph();
    set({
      users: next,
      graph,
      history: { past: pushHistory(history.past, users), future: [] },
    });
  },

  deleteUser: async (id) => {
    const { users, history } = get();
    await api.deleteUser(id);
    const next = await api.getUsers();
    const graph = await api.getGraph();
    set({
      users: next,
      graph,
      selectedUserId: get().selectedUserId === id ? null : get().selectedUserId,
      history: { past: pushHistory(history.past, users), future: [] },
    });
  },

  linkUsers: async (id, targetId) => {
    const { users, history } = get();
    await api.linkUsers(id, targetId);
    const next = await api.getUsers();
    const graph = await api.getGraph();
    set({
      users: next,
      graph,
      history: { past: pushHistory(history.past, users), future: [] },
    });
  },

  unlinkUsers: async (id, targetId) => {
    const { users, history } = get();
    await api.unlinkUsers(id, targetId);
    const next = await api.getUsers();
    const graph = await api.getGraph();
    set({
      users: next,
      graph,
      history: { past: pushHistory(history.past, users), future: [] },
    });
  },

  undo: () => {
    const { history, users } = get();
    if (!history.past.length) return;
    const prev = history.past[history.past.length - 1];
    set({
      users: prev,
      history: {
        past: history.past.slice(0, -1),
        future: [users, ...history.future],
      },
    });
  },

  redo: () => {
    const { history, users } = get();
    if (!history.future.length) return;
    const next = history.future[0];
    set({
      users: next,
      history: {
        past: [...history.past, users],
        future: history.future.slice(1),
      },
    });
  },
}));
