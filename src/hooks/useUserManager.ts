import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getUsers, createUser, updateUser, deleteUser } from '@/api/endpoints/admin';

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

// Owns the user registry list plus the add/edit/delete form state and
// handlers. The add and edit forms share the same name/role/isActive/
// password fields (edit just omits email), so they share one set of form
// state rather than each modal owning a duplicate copy.
export function useUserManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    userId: number | null;
    email: string;
  }>({
    isOpen: false,
    userId: null,
    email: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      if (data) {
        setUsers(data);
      }
    } catch {
      toast.error('Failed to load user list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error('Email and Name are required');
      return;
    }

    try {
      const response = await createUser({
        email: email.trim(),
        name: name.trim(),
        role,
        isActive,
        password: password.trim() || undefined,
      });

      if (response) {
        toast.success(`User ${name} added successfully`);
        setShowAddModal(false);
        setEmail('');
        setName('');
        setRole('user');
        setIsActive(true);
        setPassword('');
        fetchUsers();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to add user');
    }
  };

  const handleEditClick = (user: UserRecord) => {
    setCurrentUser(user);
    setName(user.name);
    setRole(user.role);
    setIsActive(user.isActive);
    setPassword('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const response = await updateUser(currentUser.id, {
        name: name.trim(),
        role,
        isActive,
        password: password.trim() || undefined,
      });

      if (response) {
        toast.success('User updated successfully');
        setShowEditModal(false);
        setCurrentUser(null);
        setPassword('');
        fetchUsers();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to update user');
    }
  };

  const handleDeleteClick = (user: UserRecord) => {
    setConfirmDelete({
      isOpen: true,
      userId: user.id,
      email: user.email,
    });
  };

  const handleConfirmDelete = async () => {
    const { userId } = confirmDelete;
    if (!userId) return;

    try {
      await deleteUser(userId);
      toast.success('User deleted successfully');
      setConfirmDelete({ isOpen: false, userId: null, email: '' });
      fetchUsers();
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  return {
    users,
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
  };
}
