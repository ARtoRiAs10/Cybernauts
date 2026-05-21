import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, Sparkles, Users, Hash } from 'lucide-react';import { api } from '../../lib/api';
import type { RecommendationsResponse, FriendRecommendation, HobbyRecommendation } from '../../types';
import { useStore } from '../../store/useStore';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

interface Props {
  userId: string;
}

export function RecommendationsPanel({ userId }: Props) {
  const [recs, setRecs] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { linkUsers, updateUser, users } = useStore();

  const load = useDebouncedCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getRecommendations(id);
      setRecs(data);
    } catch {
      // silent fail – recommendations are non-critical
    } finally {
      setLoading(false);
    }
  }, 600);

  useEffect(() => { load(userId); }, [userId]);

  const feedback = async (
    targetId: string,
    type: 'friend' | 'hobby',
    value: 'accepted' | 'rejected'
  ) => {
    await api.postFeedback(userId, { targetId, type, feedback: value });
    if (type === 'friend' && value === 'accepted') {
      try {
        await linkUsers(userId, targetId);
        toast.success('Friendship created!');
      } catch (e: any) {
        toast.error(e.message);
      }
    }
    if (type === 'hobby' && value === 'accepted') {
      const user = users.find((u) => u.id === userId);
      const target = targetId; // hobby string
      if (user && !user.hobbies.includes(target)) {
        await updateUser(userId, { hobbies: [...user.hobbies, target] });
        toast.success(`Added "${target}"!`);
      }
    }
    load(userId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Sparkles size={13} />
        <h3 className="text-xs font-semibold uppercase tracking-widest">AI Recommendations</h3>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-600 text-xs">
          <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      )}

      {recs && !loading && (
        <>
          {/* Friend recs */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={11} className="text-emerald-500" />
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">People</p>
            </div>
            <div className="space-y-2">
              {recs.friends.slice(0, 3).map((f: FriendRecommendation) => (
                <RecCard
                  key={f.id}
                  label={f.username}
                  reason={f.reason}
                  score={f.score}
                  onAccept={() => feedback(f.id, 'friend', 'accepted')}
                  onReject={() => feedback(f.id, 'friend', 'rejected')}
                />
              ))}
              {recs.friends.length === 0 && (
                <p className="text-xs text-zinc-600">No suggestions yet.</p>
              )}
            </div>
          </section>

          {/* Hobby recs */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Hash size={11} className="text-blue-500" />
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Hobbies</p>
            </div>
            <div className="space-y-2">
              {recs.hobbies.slice(0, 3).map((h: HobbyRecommendation) => (
                <RecCard
                  key={h.hobby}
                  label={h.hobby}
                  reason={h.reason}
                  score={h.score}
                  onAccept={() => feedback(h.hobby, 'hobby', 'accepted')}
                  onReject={() => feedback(h.hobby, 'hobby', 'rejected')}
                />
              ))}
              {recs.hobbies.length === 0 && (
                <p className="text-xs text-zinc-600">No suggestions yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function RecCard({
  label, reason, score, onAccept, onReject,
}: {
  label: string; reason: string; score: number;
  onAccept: () => void; onReject: () => void;
}) {
  return (
    <div className="bg-[#1a2236] border border-zinc-700/50 rounded-xl p-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">{label}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug line-clamp-2">{reason}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onAccept}
            className="p-1 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-500 transition-colors"
            title="Accept"
          >
            <ThumbsUp size={11} />
          </button>
          <button
            onClick={onReject}
            className="p-1 rounded-lg bg-red-900/30 hover:bg-red-800/40 text-red-500 transition-colors"
            title="Reject"
          >
            <ThumbsDown size={11} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${Math.min(100, score * 10)}%` }}
          />
        </div>
        <span className="text-[9px] text-zinc-600 font-mono">{score.toFixed(1)}</span>
      </div>
    </div>
  );
}
