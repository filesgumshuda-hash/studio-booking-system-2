import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit, Key, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../common/Toast';
import { supabase } from '../../lib/supabase';
import { Staff, StaffAssignment } from '../../context/AppContext';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'staff' | null;
  staff_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface ConsolidatedStaffMember extends Staff {
  user?: User;
  hasLogin: boolean;
  systemRole: 'admin' | 'manager' | 'staff' | null;
  assignmentCount: number;
}

interface ConsolidatedStaffTableProps {
  staff: Staff[];
  staffAssignments: StaffAssignment[];
  onEdit: (staff: Staff) => void;
}

export function ConsolidatedStaffTable({
  staff,
  staffAssignments,
  onEdit
}: ConsolidatedStaffTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const consolidatedData = useMemo<ConsolidatedStaffMember[]>(() => {
    return staff.map(staffMember => {
      const user = users.find(u => u.staff_id === staffMember.id);
      const assignments = staffAssignments.filter(sa => sa.staff_id === staffMember.id);

      return {
        ...staffMember,
        user,
        hasLogin: !!user,
        systemRole: user?.role || null,
        assignmentCount: assignments.length
      };
    });
  }, [staff, users, staffAssignments]);

  const filteredData = useMemo(() => {
    let result = consolidatedData;

    if (roleFilter !== 'all') {
      if (roleFilter === 'no-access') {
        result = result.filter(s => !s.hasLogin);
      } else {
        result = result.filter(s => s.systemRole === roleFilter);
      }
    }

    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.role.toLowerCase().includes(query) ||
        s.contact_number.includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.user?.email?.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [consolidatedData, searchQuery, roleFilter, statusFilter]);

  const toggleRow = (staffId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  const togglePasswordVisibility = (staffId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  const handleRoleChange = async (staffMember: ConsolidatedStaffMember, newRole: 'admin' | 'manager' | 'staff' | null) => {
    if (!staffMember.user) {
      showToast('This staff member has no user account', 'error');
      return;
    }

    const currentRole = staffMember.systemRole;

    if (currentRole === newRole) {
      return;
    }

    const roleLabels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      staff: 'Staff',
      'null': 'No Access'
    };

    const permissions: Record<string, string> = {
      admin: 'Full system access including user management',
      manager: 'Can manage bookings and view own payments',
      staff: 'View only assigned events and own payments',
      'null': 'No login access (account will be disabled)'
    };

    const currentRoleKey = currentRole || 'null';
    const newRoleKey = newRole || 'null';

    const confirmMessage = `Change System Role?\n\nCurrent Role: ${roleLabels[currentRoleKey]}\nNew Role: ${roleLabels[newRoleKey]}\n\nThis will change ${staffMember.name}'s access level to ${roleLabels[newRoleKey]}.\n\n${permissions[newRoleKey]}\n\nEffective immediately upon confirmation.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    if (newRole === null) {
      const removeAccessWarning = `⚠️ Remove Login Access?\n\nThis will remove ${staffMember.name}'s ability to login to the system.\nThey will remain in the staff database but cannot access the app.`;

      if (!window.confirm(removeAccessWarning)) {
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: newRole,
          is_active: newRole !== null
        })
        .eq('id', staffMember.user.id);

      if (error) throw error;

      await fetchUsers();
      showToast(`Role changed to ${roleLabels[newRoleKey]} successfully`, 'success');
    } catch (error: any) {
      showToast(`Failed to change role: ${error.message}`, 'error');
    }
  };

  const handleResetPassword = async (staffMember: ConsolidatedStaffMember) => {
    if (!staffMember.user) return;

    const newPassword = window.prompt(`Reset password for ${staffMember.name}:\n\nEnter new password:`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', staffMember.user.id);

      if (error) throw error;

      await fetchUsers();
      showToast('Password reset successfully', 'success');
    } catch (error: any) {
      showToast(`Failed to reset password: ${error.message}`, 'error');
    }
  };

  const getRoleBadge = (role: 'admin' | 'manager' | 'staff' | null) => {
    if (!role) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No Access</span>;
    }

    const styles = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      staff: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const isActive = status === 'active';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Staff Management</h2>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by name, role, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="no-access">No Access</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '40px' }}></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Login</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  {searchQuery ? 'No staff found matching your search' : 'No staff members found'}
                </td>
              </tr>
            ) : (
              filteredData.map(staffMember => (
                <React.Fragment key={staffMember.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRow(staffMember.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {expandedRows.has(staffMember.id) ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{staffMember.name}</td>
                    <td className="px-4 py-3 text-sm">{getRoleBadge(staffMember.systemRole)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {staffMember.contact_number || staffMember.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(staffMember.status)}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {staffMember.hasLogin ? (
                        <span className="text-green-600 font-medium">✓</span>
                      ) : (
                        <span className="text-gray-400">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(staffMember)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {staffMember.hasLogin && (
                          <button
                            onClick={() => handleResetPassword(staffMember)}
                            className="text-amber-600 hover:text-amber-800 transition-colors"
                            title="Reset Password"
                          >
                            <Key size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedRows.has(staffMember.id) && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-6">
                        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <span className="text-lg">📧</span> Contact Information
                            </h3>
                            <div className="space-y-2 text-sm text-gray-700">
                              <div><span className="font-medium">Email:</span> {staffMember.email || 'Not provided'}</div>
                              <div><span className="font-medium">Phone:</span> {staffMember.contact_number}</div>
                            </div>
                          </div>

                          {staffMember.hasLogin && staffMember.user && (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="text-lg">🔐</span> Login Details
                              </h3>
                              <div className="space-y-2 text-sm text-gray-700">
                                <div><span className="font-medium">User ID:</span> <code className="bg-gray-100 px-2 py-0.5 rounded">{staffMember.user.id.substring(0, 8)}</code></div>
                                <div><span className="font-medium">Login Email:</span> {staffMember.user.email}</div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Password:</span>
                                  <input
                                    type={showPassword[staffMember.id] ? 'text' : 'password'}
                                    value={staffMember.user.password || '••••••••'}
                                    readOnly
                                    className="bg-gray-100 px-2 py-0.5 rounded border border-gray-300 font-mono text-xs"
                                    style={{ width: '120px' }}
                                  />
                                  <button
                                    onClick={() => togglePasswordVisibility(staffMember.id)}
                                    className="text-gray-600 hover:text-gray-800"
                                    title={showPassword[staffMember.id] ? 'Hide' : 'Show'}
                                  >
                                    {showPassword[staffMember.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                  <button
                                    onClick={() => handleResetPassword(staffMember)}
                                    className="text-amber-600 hover:text-amber-800"
                                    title="Reset Password"
                                  >
                                    <Key size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <span className="text-lg">👤</span> Staff Details
                            </h3>
                            <div className="space-y-2 text-sm text-gray-700">
                              <div><span className="font-medium">Job Role:</span> {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1).replace('_', ' ')}</div>
                              <div><span className="font-medium">Joined:</span> {formatDate(staffMember.join_date)}</div>
                              <div><span className="font-medium">Status:</span> {staffMember.status}</div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <span className="text-lg">📅</span> Assignments
                            </h3>
                            <div className="text-sm text-gray-700">
                              <p className="mb-2">Assigned to <span className="font-semibold">{staffMember.assignmentCount}</span> event{staffMember.assignmentCount !== 1 ? 's' : ''}</p>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <span className="text-lg">🎭</span> System Access Role
                            </h3>
                            <div className="space-y-3">
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Current Role:</span> {getRoleBadge(staffMember.systemRole)}
                              </div>
                              <div className="flex items-center gap-3">
                                <select
                                  value={staffMember.systemRole || ''}
                                  onChange={(e) => handleRoleChange(staffMember, e.target.value as any || null)}
                                  disabled={!staffMember.hasLogin}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  <option value="">No Access</option>
                                  <option value="staff">Staff</option>
                                  <option value="manager">Manager</option>
                                  <option value="admin">Admin</option>
                                </select>
                                {!staffMember.hasLogin && (
                                  <span className="text-sm text-gray-500">Create user account to enable login</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {ToastComponent}
    </div>
  );
}
