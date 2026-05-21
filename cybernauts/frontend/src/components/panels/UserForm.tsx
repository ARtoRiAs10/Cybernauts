import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { User } from '../../types';

interface Props {
  user?: User | null;
  onSave: (data: { username: string; age: number; hobbies: string[] }) => Promise<void>;
  onClose: () => void;
}

export function UserForm({ user, onSave, onClose }: Props) {
  const [username, setUsername] = useState(user?.username ?? '');
  const [age, setAge] = useState(user?.age?.toString() ?? '');
  const [hobbies, setHobbies] = useState<string[]>(user?.hobbies ?? []);
  const [hobbyInput, setHobbyInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(user?.username ?? '');
    setAge(user?.age?.toString() ?? '');
    setHobbies(user?.hobbies ?? []);
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Username is required';
    else if (username.trim().length < 2) e.username = 'Must be at least 2 characters';
    const ageNum = Number(age);
    if (!age) e.age = 'Age is required';
    else if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) e.age = 'Must be 0–120';
    return e;
  };

  const addHobby = () => {
    const h = hobbyInput.trim();
    if (h && !hobbies.includes(h)) {
      setHobbies((prev) => [...prev, h]);
    }
    setHobbyInput('');
  };

  const removeHobby = (h: string) => setHobbies((prev) => prev.filter((x) => x !== h));

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({ username: username.trim(), age: Number(age), hobbies });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#131720] border border-zinc-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200">
            {user ? 'Edit User' : 'New User'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setErrors((x) => ({ ...x, username: '' })); }}
              placeholder="e.g. nova_user"
              className={`w-full bg-[#1a2236] border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors ${errors.username ? 'border-red-600' : 'border-zinc-700 focus:border-blue-600'}`}
            />
            {errors.username && <p className="mt-1 text-[11px] text-red-400">{errors.username}</p>}
          </div>

          {/* Age */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Age
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => { setAge(e.target.value); setErrors((x) => ({ ...x, age: '' })); }}
              min={0}
              max={120}
              placeholder="25"
              className={`w-full bg-[#1a2236] border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors ${errors.age ? 'border-red-600' : 'border-zinc-700 focus:border-blue-600'}`}
            />
            {errors.age && <p className="mt-1 text-[11px] text-red-400">{errors.age}</p>}
          </div>

          {/* Hobbies */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Hobbies
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hobbyInput}
                onChange={(e) => setHobbyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHobby())}
                placeholder="Add hobby..."
                className="flex-1 bg-[#1a2236] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
              />
              <button
                type="button"
                onClick={addHobby}
                className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-700/50 text-blue-400 rounded-lg transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            {hobbies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hobbies.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300"
                  >
                    {h}
                    <button
                      type="button"
                      onClick={() => removeHobby(h)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : user ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
