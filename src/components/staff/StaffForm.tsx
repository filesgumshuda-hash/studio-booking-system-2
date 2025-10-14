import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Staff } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { validatePhoneNumber, validateEmail } from '../../utils/validation';

interface StaffFormProps {
  staff?: Staff;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StaffForm({ staff, onSuccess, onCancel }: StaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('photographer');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (staff) {
      setName(staff.name);
      setRole(staff.role);
      setContactNumber(staff.contact_number);
      setEmail(staff.email || '');
      setJoinDate(staff.join_date);
      setStatus(staff.status);
    } else {
      setJoinDate(new Date().toISOString().split('T')[0]);
    }
  }, [staff]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!role) newErrors.role = 'Role is required';
    if (!contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
    else if (!validatePhoneNumber(contactNumber)) newErrors.contactNumber = 'Invalid phone number (must be 10 digits)';
    if (email && !validateEmail(email)) newErrors.email = 'Invalid email format';
    if (!joinDate) newErrors.joinDate = 'Join date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const staffData = {
        name,
        role,
        contact_number: contactNumber,
        email: email || null,
        join_date: joinDate,
        status,
      };

      if (staff) {
        const { error } = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', staff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff').insert(staffData);
        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-600">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.role ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="photographer">Photographer</option>
            <option value="videographer">Videographer</option>
            <option value="drone_operator">Drone Operator</option>
            <option value="editor">Editor</option>
            <option value="manager">Manager</option>
            <option value="coordinator">Coordinator</option>
          </select>
          {errors.role && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.role}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Number <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="10-digit number"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.contactNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.contactNumber && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.contactNumber}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Join Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={joinDate}
            onChange={(e) => setJoinDate(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.joinDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.joinDate && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.joinDate}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status <span className="text-red-600">*</span>
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle size={18} />
            {errors.submit}
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : staff ? 'Update Staff' : 'Add Staff'}
        </Button>
      </div>
    </form>
  );
}
