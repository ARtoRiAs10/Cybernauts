import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, Sparkles, Users, Hash } from 'lucide-react';
import { api } from '../../lib/api';
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
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getRecommendations(id);
      setRecs(data);
    } catch (err) {

      console.error('Failed to load AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, 600);


  useEffect(() => {
    load(userId);
  }, [userId]);

  const feedback = async (
    targetId: string,
    type: 'friend' | 'hobby',
    value: 'accepted' | 'rejected'
  ) => {
    try {
      // 1. Persist the selection feedback record to backend database
      await api.postFeedback(userId, { targetId, type, feedback: value });
      
      // 2. Process side-effect if the recommendation was accepted
      if (value === 'accepted') {
        if (type === 'friend') {
          await linkUsers(userId, targetId);
          toast.success('Friendship created!');
        }
        
        if (type === 'hobby') {
          // Dynamic fresh state lookup to ensure synchronization accuracy
          const currentUser = users.find((u) => u.id === userId);
          const legacyHobbies = currentUser?.hobbies ?? [];
          
          if (currentUser && !legacyHobbies.includes(targetId)) {
            await updateUser(userId, { hobbies: [...legacyHobbies, targetId] });
            toast.success(`Added "${targetId}"!`);
          }
        }
      } else {
        toast('Suggestion dismissed');
      }

      // 3. Hot reload remaining items lists to clean out old selections
      load(userId);
    } catch (e: any) {
      toast.error(e?.message || 'Action failed to resolve. Please retry.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Sparkles size={13} className="text-amber-400" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">AI Recommendations</h3>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-600 text-xs py-2">
          <div className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading recommendations…</span>
        </div>
      )}

      {!loading && recs && (
        <div className="space-y-4">
          {/* Friend suggestions segment */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={11} className="text-emerald-500" />
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">People</p>
            </div>
            <div className="space-y-2">
              {recs.friends && recs.friends.length > 0 ? (
                recs.friends.slice(0, 3).map((f: FriendRecommendation) => (
                  <RecCard
                    key={f.id}
                    label={f.username || 'Unknown User'}
                    reason={f.reason || 'Shared interests detected'}
                    score={f.score ?? 0}
                    onAccept={() => feedback(f.id, 'friend', 'accepted')}
                    onReject={() => feedback(f.id, 'friend', 'rejected')}
                  />
                ))
              ) : (
                <p className="text-xs text-zinc-600 italic pl-1">No human suggestions match currently.</p>
              )}
            </div>
          </section>

          {/* Hobby suggestions segment */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Hash size={11} className="text-blue-500" />
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Hobbies</p>
            </div>
            <div className="space-y-2">
              {recs.hobbies && recs.hobbies.length > 0 ? (
                recs.hobbies.slice(0, 3).map((h: HobbyRecommendation) => (
                  <RecCard
                    key={h.hobby}
                    label={h.hobby}
                    reason={h.reason || 'Matches matching profiles'}
                    score={h.score ?? 0}
                    onAccept={() => feedback(h.hobby, 'hobby', 'accepted')}
                    onReject={() => feedback(h.hobby, 'hobby', 'rejected')}
                  />
                ))
              ) : (
                <p className="text-xs text-zinc-600 italic pl-1">No additional match recommendations found.</p>
              )}
            </div>
          </section>
        </div>
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
    <div className="bg-[#1a2236] border border-zinc-800/80 rounded-xl p-3 group hover:border-zinc-700/60 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">{label}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug line-clamp-2" title={reason}>{reason}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0 pt-0.5">
          <button
            onClick={onAccept}
            className="p-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 transition-colors border border-emerald-800/20"
            title="Accept recommendation"
          >
            <ThumbsUp size={11} />
          </button>
          <button
            onClick={onReject}
            className="p-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-colors border border-red-800/20"
            title="Dismiss suggestion"
          >
            <ThumbsDown size={11} />
          </button>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, Math.min(100, (score ?? 0) * 10))}%` }}
          />
        </div>
        <span className="text-[9px] text-zinc-500 font-mono font-medium min-w-[16px] text-right">
          {(score ?? 0).toFixed(1)}
        </span>
      </div>
    </div>
  );
}