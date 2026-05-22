import { useState, useEffect, useRef } from 'react';
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


  const lastUserIdRef = useRef<string | undefined>(user?.id);

  useEffect(() => {
    if (user?.id !== lastUserIdRef.current) {
      setUsername(user?.username ?? '');
      setAge(user?.age?.toString() ?? '');
      setHobbies(user?.hobbies ?? []);
      setErrors({});
      lastUserIdRef.current = user?.id;
    }
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    const cleanUsername = username.trim();
    
    if (!cleanUsername) {
      e.username = 'Username is required';
    } else if (cleanUsername.length < 2) {
      e.username = 'Must be at least 2 characters';
    }

    const ageNum = Number(age);
    if (!age.trim()) {
      e.age = 'Age is required';
    } else if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      e.age = 'Must be a valid age between 0–120';
    }
    
    return e;
  };

  const addHobby = () => {
    const h = hobbyInput.trim();
    if (h) {

      const isDuplicate = hobbies.some((existing) => existing.toLowerCase() === h.toLowerCase());
      if (!isDuplicate) {
        setHobbies((prev) => [...prev, h]);
      }
    }
    setHobbyInput('');
  };

  const removeHobby = (h: string) => {
    if (saving) return;
    setHobbies((prev) => prev.filter((x) => x !== h));
  };

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); 
    if (saving) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        username: username.trim(),
        age: Math.floor(Number(age)), 
        hobbies
      });
      onClose();
    } catch (err) {
      
      console.error('Form saving exception captured:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => !saving && onClose()} 
    >
      <form 
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()} 
        className="bg-[#131720] border border-zinc-700/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200">
            {user ? 'Edit User Configuration' : 'Create New User Profile'}
          </h3>
          <button 
            type="button"
            disabled={saving}
            onClick={onClose} 
            className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              disabled={saving}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setErrors((x) => ({ ...x, username: '' })); }}
              placeholder="e.g. nova_user"
              className={`w-full bg-[#1a2236] border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors disabled:opacity-50 ${errors.username ? 'border-red-600 focus:border-red-600' : 'border-zinc-700 focus:border-blue-600'}`}
            />
            {errors.username && <p className="mt-1 text-[11px] text-red-400 font-medium">{errors.username}</p>}
          </div>

          {/* Age Input */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Age
            </label>
            <input
              type="number"
              disabled={saving}
              value={age}
              onChange={(e) => { setAge(e.target.value); setErrors((x) => ({ ...x, age: '' })); }}
              min={0}
              max={120}
              placeholder="25"
              className={`w-full bg-[#1a2236] border rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors disabled:opacity-50 ${errors.age ? 'border-red-600 focus:border-red-600' : 'border-zinc-700 focus:border-blue-600'}`}
            />
            {errors.age && <p className="mt-1 text-[11px] text-red-400 font-medium">{errors.age}</p>}
          </div>

          {/* Hobbies Input Wrapper */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Hobbies
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={saving}
                value={hobbyInput}
                onChange={(e) => setHobbyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // Lock form bubble triggers
                    addHobby();
                  }
                }}
                placeholder="Add hobby..."
                className="flex-1 bg-[#1a2236] border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-600 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                disabled={saving || !hobbyInput.trim()}
                onClick={addHobby}
                className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-700/50 text-blue-400 rounded-lg transition-colors disabled:opacity-30"
              >
                <Plus size={14} />
              </button>
            </div>

            {hobbies.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {hobbies.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 transition-all"
                  >
                    <span className="truncate max-w-[120px]">{h}</span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => removeHobby(h)}
                      className="text-zinc-500 hover:text-red-400 transition-colors disabled:pointer-events-none"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-zinc-800 bg-[#10141c]">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex-1 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : user ? (
              'Update Profile'
            ) : (
              'Create Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}