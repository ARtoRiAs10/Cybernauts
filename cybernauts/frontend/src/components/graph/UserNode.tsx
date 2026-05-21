import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

export interface UserNodeData {
  username: string;
  age: number;
  popularityScore: number;
  selected?: boolean;
  isConnecting?: boolean;
}

// Score → visual mapping
function scoreToStyle(score: number): {
  ring: string;
  glow: string;
  badge: string;
  size: number;
} {
  if (score > 10) return { ring: 'ring-amber-400', glow: 'shadow-amber-500/40', badge: 'bg-amber-500/20 text-amber-300', size: 68 };
  if (score > 5)  return { ring: 'ring-emerald-500', glow: 'shadow-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300', size: 60 };
  return { ring: 'ring-zinc-600', glow: 'shadow-zinc-700/20', badge: 'bg-zinc-700/40 text-zinc-400', size: 52 };
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export const UserNode = memo(({ data, selected }: NodeProps<UserNodeData>) => {
  const { ring, glow, badge, size } = scoreToStyle(data.popularityScore);

  return (
    <div
      className="group relative flex flex-col items-center cursor-pointer"
      style={{ userSelect: 'none' }}
    >
      {/* Drag-target ring when connecting */}
      {data.isConnecting && (
        <div className="absolute inset-0 rounded-full ring-2 ring-blue-400 animate-ping opacity-60" />
      )}

      {/* Avatar circle */}
      <div
        className={`
          flex items-center justify-center rounded-full
          ring-2 ${ring}
          shadow-lg ${glow}
          transition-all duration-300
          ${selected ? 'scale-110 ring-offset-2 ring-offset-[#0b0e14]' : 'hover:scale-105'}
          bg-[#1a2236]
        `}
        style={{ width: size, height: size }}
      >
        <span
          className="font-bold tracking-tight text-zinc-100 select-none"
          style={{ fontSize: size * 0.28 }}
        >
          {initials(data.username)}
        </span>
      </div>

      {/* Label below */}
      <div className="mt-1.5 text-center">
        <p className="text-zinc-200 text-xs font-semibold leading-none tracking-wide">
          {data.username}
        </p>
        <p className="text-zinc-500 text-[10px] mt-0.5">age {data.age}</p>
      </div>

      {/* Score badge */}
      <div className={`absolute -top-2 -right-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${badge} border border-white/5`}>
        {data.popularityScore.toFixed(1)}
      </div>

      {/* Handles — invisible but functional */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 12, height: 12 }} />
    </div>
  );
});

UserNode.displayName = 'UserNode';

// High/Low score wrappers (bonus requirement)
export const HighScoreNode = memo((props: NodeProps<UserNodeData>) => <UserNode {...props} />);
HighScoreNode.displayName = 'HighScoreNode';

export const LowScoreNode = memo((props: NodeProps<UserNodeData>) => <UserNode {...props} />);
LowScoreNode.displayName = 'LowScoreNode';
