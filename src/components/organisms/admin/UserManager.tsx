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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-900/30 border border-gray-800 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white text-lg">User Registry</h3>
            <p className="text-xs text-gray-500">Manage user authorization and roles.</p>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="grow md:w-64 bg-gray-950 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-hidden transition-all duration-300"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg shadow-blue-500/15 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* User Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-500">Loading user registry...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="border border-gray-800 rounded-3xl p-12 text-center text-gray-500 italic">
          No users found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-gray-800 bg-gray-900/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/20 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40 text-sm">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-900/30 transition-colors duration-200"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-white">{user.name}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      user.role === 'admin'
                        ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                        : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
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
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700/80 text-gray-300 transition-colors cursor-pointer"
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
