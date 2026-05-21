import { useEffect, useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Plus, Undo2, Redo2, RefreshCw, Network } from 'lucide-react';

import { useStore } from '../store/useStore';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { HobbySidebar } from '../components/sidebar/HobbySidebar';
import { UserPanel } from '../components/panels/UserPanel';
import { UserForm } from '../components/panels/UserForm';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

export function App() {
  const {
    users, graph, loading,
    fetchUsers, fetchGraph,
    selectedUserId, setSelectedUser,
    createUser, undo, redo,
    history,
  } = useStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingHobbyDrop, setPendingHobbyDrop] = useState<{ nodeId: string; hobby: string } | null>(null);

  // Initial load
  useEffect(() => {
    Promise.all([fetchUsers(), fetchGraph()]).catch(() =>
      toast.error('Could not reach backend. Is it running on :3000?')
    );
  }, []);

  const handleCreate = async (data: { username: string; age: number; hobbies: string[] }) => {
    await createUser(data);
    toast.success(`Created ${data.username}!`);
  };

  const refresh = async () => {
    await Promise.all([fetchUsers(), fetchGraph()]);
    toast.success('Refreshed', { duration: 1200 });
  };

  const handleNodeClick = useCallback((id: string) => {
    setSelectedUser(id);
  }, [setSelectedUser]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="h-screen flex flex-col bg-[#0b0e14] text-zinc-200 font-sans overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center gap-4 px-5 h-12 border-b border-zinc-800 flex-shrink-0 bg-[#0b0e14]/95 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2">
          <Network size={16} className="text-blue-500" />
          <span className="font-semibold text-sm tracking-tight text-zinc-100">Cybernauts</span>
          <span className="text-zinc-700 text-xs font-mono ml-1">/ network</span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 mr-3 text-xs text-zinc-600 font-mono">
            <span>{users.length} users</span>
            <span>·</span>
            <span>{graph?.edges.length ?? 0} connections</span>
          </div>

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!history.past.length}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-all"
            title="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!history.future.length}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-all"
            title="Redo"
          >
            <Redo2 size={14} />
          </button>

          <button
            onClick={refresh}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all ml-1"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowCreateForm(true)}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={13} />
            New User
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Hobby Sidebar */}
        <HobbySidebar onHobbyDragStart={() => {}} />

        {/* Center: Graph */}
        <main className="flex-1 relative min-w-0">
          {loading && !graph && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0b0e14]/80">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 font-mono">Loading graph…</p>
              </div>
            </div>
          )}

          {graph && (
            <ErrorBoundary>
              <GraphCanvas
                onNodeClick={handleNodeClick}
                pendingHobbyDrop={pendingHobbyDrop}
                onHobbyDropHandled={() => setPendingHobbyDrop(null)}
              />
            </ErrorBoundary>
          )}

          {!loading && !graph && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
              <Network size={40} className="text-zinc-800" />
              <p className="text-zinc-600 text-sm">No graph data. Create some users to get started.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600/20 border border-blue-700/50 text-blue-400 text-sm rounded-lg hover:bg-blue-600/30 transition-colors"
              >
                + New User
              </button>
            </div>
          )}
        </main>

        {/* Right: User Detail Panel */}
        {selectedUserId && selectedUser && (
          <UserPanel
            userId={selectedUserId}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <UserForm
          onSave={handleCreate}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a2236',
            color: '#e2e8f0',
            border: '1px solid #2d3748',
            fontSize: '13px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0b0e14' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0b0e14' } },
        }}
      />
    </div>
  );
}
