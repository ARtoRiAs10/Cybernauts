import { useState } from 'react';
import {
  Pencil, Trash2, Unlink,
  Hash, Users, Star
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UserForm } from './UserForm';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RecommendationsPanel } from './RecommendationsPanel';
import toast from 'react-hot-toast';

interface Props {
  userId: string;
  onClose: () => void;
}

export function UserPanel({ userId, onClose }: Props) {
  const { users, updateUser, deleteUser, unlinkUsers } = useStore();
  const user = users.find((u) => u.id === userId);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<string | null>(null);

  if (!user) return null;

  const friends = users.filter((u) => user.friends.includes(u.id));

  const handleDelete = async () => {
    try {
      await deleteUser(userId);
      toast.success(`${user.username} deleted`);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
    setConfirmDelete(false);
  };

  const handleUnlink = async (targetId: string) => {
    const target = users.find((u) => u.id === targetId);
    try {
      await unlinkUsers(userId, targetId);
      toast.success(`Unfriended ${target?.username}`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setUnlinkTarget(null);
  };

  const handleUpdate = async (data: { username: string; age: number; hobbies: string[] }) => {
    await updateUser(userId, data);
    toast.success('User updated');
  };

  const scoreColor =
    user.popularityScore > 10 ? 'text-amber-400' :
    user.popularityScore > 5  ? 'text-emerald-400' :
    'text-zinc-500';

  return (
    <>
      <aside className="w-72 flex-shrink-0 flex flex-col bg-[#0f1520] border-l border-zinc-800 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a2236] border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-200 flex-shrink-0">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 leading-none">{user.username}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Age {user.age}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none mt-1">
              ×
            </button>
          </div>

          {/* Score */}
          <div className="mt-3 flex items-center gap-2 bg-[#1a2236] rounded-lg px-3 py-2 border border-zinc-800">
            <Star size={12} className={scoreColor} />
            <span className="text-xs text-zinc-400">Popularity</span>
            <span className={`ml-auto font-mono text-sm font-bold ${scoreColor}`}>
              {user.popularityScore.toFixed(1)}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 rounded-lg transition-colors"
            >
              <Pencil size={11} /> Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        </div>

        {/* Hobbies */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Hash size={11} className="text-zinc-500" />
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Hobbies</h3>
          </div>
          {user.hobbies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {user.hobbies.map((h) => (
                <span
                  key={h}
                  className="px-2 py-0.5 bg-blue-900/20 border border-blue-800/40 rounded-full text-[10px] text-blue-300"
                >
                  {h}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No hobbies yet. Drag one from the sidebar.</p>
          )}
        </div>

        {/* Friends */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={11} className="text-zinc-500" />
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              Friends ({friends.length})
            </h3>
          </div>
          {friends.length > 0 ? (
            <div className="space-y-1.5">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1a2236] rounded-lg border border-zinc-800 group"
                >
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 flex-shrink-0">
                    {f.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-zinc-300 flex-1 truncate">{f.username}</span>
                  <button
                    onClick={() => setUnlinkTarget(f.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-400 transition-all"
                    title="Unlink"
                  >
                    <Unlink size={11} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No friends yet. Drag one node onto another to connect.</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="p-4">
          <RecommendationsPanel userId={userId} />
        </div>
      </aside>

      {editing && (
        <UserForm user={user} onSave={handleUpdate} onClose={() => setEditing(false)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={
            user.friends.length > 0
              ? `${user.username} still has ${user.friends.length} friend(s). Unlink them first before deleting.`
              : `Delete ${user.username}? This cannot be undone.`
          }
          onConfirm={user.friends.length > 0 ? () => setConfirmDelete(false) : handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {unlinkTarget && (
        <ConfirmDialog
          message={`Remove friendship with ${users.find((u) => u.id === unlinkTarget)?.username}?`}
          onConfirm={() => handleUnlink(unlinkTarget)}
          onCancel={() => setUnlinkTarget(null)}
        />
      )}
    </>
  );
}
