import { Plus, Trash2, Edit2, Users, Check, X, Shield, Loader2 } from 'lucide-react';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import ActiveSessionsPanel from '@/components/organisms/admin/ActiveSessionsPanel';
import AddUserModal from '@/components/organisms/admin/AddUserModal';
import EditUserModal from '@/components/organisms/admin/EditUserModal';
import { useSocket } from '@/context/useSocket';
import { useUserManager } from '@/hooks/useUserManager';

export default function UserManager() {
  const { activeDevices } = useSocket();
  const {
    filteredUsers,
    loading,
    search,
    setSearch,
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    currentUser,
    setCurrentUser,
    email,
    setEmail,
    name,
    setName,
    role,
    setRole,
    isActive,
    setIsActive,
    password,
    setPassword,
    confirmDelete,
    setConfirmDelete,
    handleAddUser,
    handleEditClick,
    handleUpdateUser,
    handleDeleteClick,
    handleConfirmDelete,
  } = useUserManager();

  return (
    <div className="space-y-6">
      <ActiveSessionsPanel activeDevices={activeDevices} />

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-panel/30 border border-line rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-fg text-lg">User Registry</h3>
            <p className="text-xs text-fg-subtle">Manage user authorization and roles.</p>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="grow md:w-64 bg-page border border-line hover:border-line-strong focus:border-focus rounded-xl px-4 py-2.5 text-sm text-fg-soft placeholder-fg-subtle focus:outline-hidden transition-all duration-300"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-action hover:bg-action-hover text-on-action rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg shadow-accent/15 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <span className="text-sm text-fg-subtle">Loading user registry...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="border border-line rounded-3xl p-12 text-center text-fg-subtle italic">
          No users found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-panel/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-panel/20 text-fg-muted text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/40 text-sm">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-panel-hover/30 transition-colors duration-200"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-fg">{user.name}</span>
                      <span className="text-xs text-fg-muted mt-0.5">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      user.role === 'admin'
                        ? 'bg-accent/10 border border-accent/20 text-accent'
                        : 'bg-divider/10 border border-divider/20 text-fg-muted'
                    }`}>
                      {user.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : null}
                      <span>{user.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      user.isActive
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {user.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{user.isActive ? 'Active' : 'Disabled'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-fg-subtle">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-2 rounded-lg bg-panel-raised hover:bg-panel-hover/80 text-fg-soft transition-colors cursor-pointer"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="p-2 rounded-lg bg-red-950/20 border border-red-900/20 text-red-500 hover:bg-red-900/20 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddUserModal
          email={email}
          setEmail={setEmail}
          name={name}
          setName={setName}
          password={password}
          setPassword={setPassword}
          role={role}
          setRole={setRole}
          isActive={isActive}
          setIsActive={setIsActive}
          onCancel={() => {
            setShowAddModal(false);
            setPassword('');
          }}
          onSubmit={handleAddUser}
        />
      )}

      {showEditModal && currentUser && (
        <EditUserModal
          currentUser={currentUser}
          name={name}
          setName={setName}
          password={password}
          setPassword={setPassword}
          role={role}
          setRole={setRole}
          isActive={isActive}
          setIsActive={setIsActive}
          onCancel={() => {
            setShowEditModal(false);
            setCurrentUser(null);
            setPassword('');
          }}
          onSubmit={handleUpdateUser}
        />
      )}

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        title="Remove Authorized User"
        message={`Are you sure you want to delete user ${confirmDelete.email}? This will revoke their access immediately.`}
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, userId: null, email: '' })}
      />
    </div>
  );
}
