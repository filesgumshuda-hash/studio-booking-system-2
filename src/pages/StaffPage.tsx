import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { StaffCard } from '../components/staff/StaffCard';
import { StaffForm } from '../components/staff/StaffForm';
import { UserManagement } from '../components/admin/UserManagement';
import { useAppData, Staff } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export function StaffPage() {
  const { user } = useAuth();
  const { staff, refreshData } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | undefined>();
  const { showToast, ToastComponent } = useToast();

  const filteredStaff = useMemo(() => {
    let result = staff;

    if (filterRole !== 'all') {
      result = result.filter((s) => s.role === filterRole);
    }

    if (filterStatus !== 'all') {
      result = result.filter((s) => s.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.role.toLowerCase().includes(query) ||
          s.contact_number.includes(query)
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, searchQuery, filterRole, filterStatus]);

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setShowForm(true);
  };

  const handleFormSuccess = async () => {
    await refreshData();
    setShowForm(false);
    setEditingStaff(undefined);
    showToast(
      editingStaff ? 'Staff updated successfully' : 'Staff added successfully',
      'success'
    );
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingStaff(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Staff Management</h1>

        {user?.role === 'admin' && (
          <UserManagement staff={staff} />
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Staff List</h2>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={20} className="mr-2" />
              Add Staff
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search by name, role, or phone..."
              onSearch={setSearchQuery}
              className="flex-1"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Roles</option>
              <option value="photographer">Photographer</option>
              <option value="videographer">Videographer</option>
              <option value="drone_operator">Drone Operator</option>
              <option value="editor">Editor</option>
              <option value="manager">Manager</option>
              <option value="coordinator">Coordinator</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredStaff.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'No staff found matching your search' : 'No staff members added yet'}
              </p>
            </div>
          ) : (
            filteredStaff.map((staffMember) => (
              <StaffCard key={staffMember.id} staff={staffMember} onEdit={handleEdit} />
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={handleFormCancel}
        title={editingStaff ? 'Edit Staff' : 'Add Staff'}
        size="md"
      >
        <StaffForm
          staff={editingStaff}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {ToastComponent}
    </div>
  );
}
