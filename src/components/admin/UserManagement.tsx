import { useState, useMemo } from 'react';
import { Edit, Key, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  staff_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface UserManagementProps {
  staff: Staff[];
}

export function UserManagement({ staff }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const { showToast, ToastComponent } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showToast(error.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useMemo(() => {
    fetchUsers();
  }, []);

  const getStaffName = (staffId: string | null): string => {
    if (!staffId) return '-';
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? staffMember.name : 'Unknown';
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setShowResetPasswordModal(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">User Accounts</h2>
        <Button onClick={handleAddUser} className="bg-gray-900 hover:bg-gray-800">
          <Plus size={18} className="mr-2" />
          Add User
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email/Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Linked Staff</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{user.email}</div>
                    <div className="text-xs text-gray-500">{user.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getStaffName(user.staff_id)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit user"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-amber-600 hover:text-amber-800"
                        title="Reset password"
                      >
                        <Key size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ToastComponent}
    </div>
  );
}
