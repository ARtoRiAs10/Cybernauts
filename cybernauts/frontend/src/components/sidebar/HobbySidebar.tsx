import { useState, useMemo } from 'react';
import { Search, GripVertical, Tag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useDebounce } from '../../hooks/useDebounce';

// Flat list of all known hobbies (union of all users' hobbies + defaults)
const DEFAULT_HOBBIES = [
  'Gaming', 'Reading', 'Cooking', 'Hiking', 'Photography',
  'Cycling', 'Painting', 'Music', 'Yoga', 'Swimming',
  'Dancing', 'Writing', 'Gardening', 'Chess', 'Fishing',
  'Climbing', 'Baking', 'Pottery', 'Drawing', 'Surfing',
  'Running', 'Meditation', 'Knitting', 'Coding', 'Traveling',
];

interface Props {
  onHobbyDragStart: (hobby: string) => void;
}

export function HobbySidebar({ onHobbyDragStart }: Props) {
  const { users } = useStore();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);

  const allHobbies = useMemo(() => {
    const fromUsers = users.flatMap((u) => u.hobbies);
    return Array.from(new Set([...DEFAULT_HOBBIES, ...fromUsers])).sort();
  }, [users]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    return q ? allHobbies.filter((h) => h.toLowerCase().includes(q)) : allHobbies;
  }, [allHobbies, debouncedQuery]);

  const handleDragStart = (e: React.DragEvent, hobby: string) => {
    e.dataTransfer.setData('hobby', hobby);
    e.dataTransfer.effectAllowed = 'copy';
    onHobbyDragStart(hobby);
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0f1520] border-r border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={14} className="text-zinc-500" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Hobbies</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#1a2236] border border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>
      </div>

      <p className="px-4 pt-3 pb-1 text-[10px] text-zinc-600">
        Drag onto a node to add
      </p>

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 scrollbar-thin">
        {filtered.map((hobby) => (
          <div
            key={hobby}
            draggable
            onDragStart={(e) => handleDragStart(e, hobby)}
            className="
              flex items-center gap-2 px-2.5 py-2 rounded-lg
              cursor-grab active:cursor-grabbing
              border border-transparent
              hover:bg-blue-900/20 hover:border-blue-800/50
              group transition-all duration-150
              select-none
            "
          >
            <GripVertical
              size={12}
              className="text-zinc-700 group-hover:text-zinc-500 flex-shrink-0 transition-colors"
            />
            <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors truncate">
              {hobby}
            </span>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-zinc-600">No matches</p>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-700 text-center">
          {allHobbies.length} hobbies total
        </p>
      </div>
    </aside>
  );
}
