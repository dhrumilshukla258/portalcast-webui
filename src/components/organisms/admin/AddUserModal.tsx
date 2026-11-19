import React from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

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
    <Dialog open onClose={onCancel} labelledBy="add-user-title" className="max-w-md space-y-6" dismissOnBackdrop={false}>
      <h4 id="add-user-title" className="text-lg font-bold text-fg text-left">Add Authorized User</h4>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1 text-left">
          <label className="text-xs text-fg-subtle font-bold uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full bg-page border border-line hover:border-line-strong focus:border-focus rounded-xl px-4 py-3 text-sm text-fg focus:outline-hidden focus:ring-1 focus:ring-focus"
            required
          />
        </div>

        <div className="space-y-1 text-left">
          <label className="text-xs text-fg-subtle font-bold uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full bg-page border border-line hover:border-line-strong focus:border-focus rounded-xl px-4 py-3 text-sm text-fg focus:outline-hidden focus:ring-1 focus:ring-focus"
            required
          />
        </div>

        <div className="space-y-1 text-left">
          <label className="text-xs text-fg-subtle font-bold uppercase tracking-wider">Password (Optional)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full bg-page border border-line hover:border-line-strong focus:border-focus rounded-xl px-4 py-3 text-sm text-fg focus:outline-hidden focus:ring-1 focus:ring-focus"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 text-left">
            <label className="text-xs text-fg-subtle font-bold uppercase tracking-wider">Access Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
              className="w-full bg-page border border-line rounded-xl px-3 py-3 text-sm text-fg focus:outline-hidden focus:border-focus"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs text-fg-subtle font-bold uppercase tracking-wider">Account State</label>
            <select
              value={isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === 'true')}
              className="w-full bg-page border border-line rounded-xl px-3 py-3 text-sm text-fg focus:outline-hidden focus:border-focus"
            >
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="accent" className="flex-1">
            Add User
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default AddUserModal;
