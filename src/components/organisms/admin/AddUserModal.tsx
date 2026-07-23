import React from 'react';

interface AddUserModalProps {
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  role: 'admin' | 'user';
  setRole: (v: 'admin' | 'user') => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({
  email,
  setEmail,
  name,
  setName,
  password,
  setPassword,
  role,
  setRole,
  isActive,
  setIsActive,
  onCancel,
  onSubmit,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-gray-900 border border-gray-850 rounded-3xl p-6 shadow-2xl space-y-6">
        <h4 className="text-lg font-bold text-white text-left">Add Authorized User</h4>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 text-left">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Access Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Account State</label>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors font-bold text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/10 transition-colors cursor-pointer"
            >
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
