import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { StaffForm } from '../components/staff/StaffForm';
import { ConsolidatedStaffTable } from '../components/staff/ConsolidatedStaffTable';
import { useAppData, Staff } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export function StaffPage() {
  const { user } = useAuth();
  const { staff, staffAssignments, refreshData } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | undefined>();
  const { showToast, ToastComponent } = useToast();


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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          {user?.role === 'admin' && (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={20} className="mr-2" />
              Add Staff/User
            </Button>
          )}
        </div>

        <ConsolidatedStaffTable
          staff={staff}
          staffAssignments={staffAssignments}
          onEdit={handleEdit}
        />
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
