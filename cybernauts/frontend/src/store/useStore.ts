import { create } from 'zustand';
import { api } from '../lib/api';
import type { User, GraphData } from '../types';

interface HistorySnapshot {
  users: User[];
  graph: GraphData;
}

interface History {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
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


const pushHistory = (past: HistorySnapshot[], currentUsers: User[], currentGraph: GraphData | null): HistorySnapshot[] => {
  if (!currentGraph) return past;
  const snapshot: HistorySnapshot = {
    users: JSON.parse(JSON.stringify(currentUsers)), 
    graph: JSON.parse(JSON.stringify(currentGraph)),
  };
  return [...past.slice(-19), snapshot]; 
};

export const useStore = create<AppState>((set, get) => ({
  users: [],
  graph: null,
  selectedUserId: null,
  loading: false,
  history: { past: [], future: [] },

  fetchUsers: async () => {
    set({ loading: true });
    try {
      const users = await api.getUsers();
      set({ users });
    } catch (err) {
      console.error('Zustand store exception fetching users:', err);
    } finally {
      set({ loading: false });
    }
  },

  fetchGraph: async () => {
    try {
      const graph = await api.getGraph();
      set({ graph });
    } catch (err) {
      console.error('Zustand store exception fetching graph:', err);
    }
  },

  setSelectedUser: (id) => set({ selectedUserId: id }),

  createUser: async (data) => {
    set({ loading: true });
    const { users, graph, history } = get();
    try {
      await api.createUser(data);
      const nextUsers = await api.getUsers();
      const nextGraph = await api.getGraph();
      
      set({
        users: nextUsers,
        graph: nextGraph,
        history: { past: pushHistory(history.past, users, graph), future: [] },
      });
    } finally {
      set({ loading: false });
    }
  },

  updateUser: async (id, data) => {
    const { users, graph, history } = get();
    try {
      await api.updateUser(id, data);
      const nextUsers = await api.getUsers();
      const nextGraph = await api.getGraph();
      
      set({
        users: nextUsers,
        graph: nextGraph,
        history: { past: pushHistory(history.past, users, graph), future: [] },
      });
    } catch (err) {
      console.error('Failed state mutation inside store handler:', err);
      throw err; 
    }
  },

  deleteUser: async (id) => {
    const { users, graph, history } = get();
    try {
      await api.deleteUser(id);
      const nextUsers = await api.getUsers();
      const nextGraph = await api.getGraph();
      
      set({
        users: nextUsers,
        graph: nextGraph,
        selectedUserId: get().selectedUserId === id ? null : get().selectedUserId,
        history: { past: pushHistory(history.past, users, graph), future: [] },
      });
    } catch (err) {
      console.error('Failed state deletion trace:', err);
      throw err;
    }
  },

  linkUsers: async (id, targetId) => {
    const { users, graph, history } = get();
    try {
      await api.linkUsers(id, targetId);
      const nextUsers = await api.getUsers();
      const nextGraph = await api.getGraph();
      
      set({
        users: nextUsers,
        graph: nextGraph,
        history: { past: pushHistory(history.past, users, graph), future: [] },
      });
    } catch (err) {
      console.error('Link execution mapping failure captured:', err);
      throw err;
    }
  },

  unlinkUsers: async (id, targetId) => {
    const { users, graph, history } = get();
    try {
      await api.unlinkUsers(id, targetId);
      const nextUsers = await api.getUsers();
      const nextGraph = await api.getGraph();
      
      set({
        users: nextUsers,
        graph: nextGraph,
        history: { past: pushHistory(history.past, users, graph), future: [] },
      });
    } catch (err) {
      console.error('Unlink tracking exception:', err);
      throw err;
    }
  },

  undo: () => {
    const { history, users, graph } = get();
    if (!history.past.length || !graph) return;

    const previousSnapshot = history.past[history.past.length - 1];
    const currentSnapshot: HistorySnapshot = { users, graph };

    set({
      users: previousSnapshot.users,
      graph: previousSnapshot.graph,
      history: {
        past: history.past.slice(0, -1),
        future: [currentSnapshot, ...history.future],
      },
    });
  },

  redo: () => {
    const { history, users, graph } = get();
    if (!history.future.length || !graph) return;

    const nextSnapshot = history.future[0];
    const currentSnapshot: HistorySnapshot = { users, graph };

    set({
      users: nextSnapshot.users,
      graph: nextSnapshot.graph,
      history: {
        past: [...history.past, currentSnapshot],
        future: history.future.slice(1),
      },
    });
  },
}));