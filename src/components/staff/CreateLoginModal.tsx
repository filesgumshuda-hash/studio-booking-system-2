import { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';
import { validateEmail } from '../../utils/validation';
import { Staff } from '../../context/AppContext';

interface CreateLoginModalProps {
  staff: Staff;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateLoginModal({ staff, isOpen, onClose, onSuccess }: CreateLoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState(staff.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [systemRole, setSystemRole] = useState<'admin' | 'manager' | 'staff'>('staff');

  const validatePasswordStrength = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 6) errors.push('Must be at least 6 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('Must contain uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Must contain lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('Must contain number');
    return errors;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!loginEmail.trim()) {
      newErrors.loginEmail = 'Email is required for login';
    } else if (!validateEmail(loginEmail)) {
      newErrors.loginEmail = 'Invalid email format';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else {
      const strengthErrors = validatePasswordStrength(password);
      if (strengthErrors.length > 0) {
        newErrors.password = strengthErrors.join(', ');
      }
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!systemRole) {
      newErrors.systemRole = 'Please select a system role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${loginEmail},phone.eq.${staff.contact_number}`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        setErrors({ submit: 'A user account with this email or phone already exists' });
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('users').insert({
        name: staff.name,
        phone: staff.contact_number,
        email: loginEmail,
        password: password,
        role: systemRole,
        staff_id: staff.id,
        is_active: true
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions = {
    admin: 'Full system access including user management',
    manager: 'Can manage bookings and view own payments',
    staff: 'View only assigned events and own payments'
  };

  const passwordStrengthErrors = password ? validatePasswordStrength(password) : [];
  const passwordStrength = password.length >= 6 && passwordStrengthErrors.length === 0
    ? 'Strong'
    : password.length >= 6 && passwordStrengthErrors.length <= 2
    ? 'Fair'
    : 'Weak';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create Login for ${staff.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Staff Member:</strong> {staff.name}
            <br />
            <strong>Job Role:</strong> {staff.role.charAt(0).toUpperCase() + staff.role.slice(1).replace('_', ' ')}
            <br />
            <strong>Phone:</strong> {staff.contact_number}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Login Credentials</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="email@example.com"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                errors.loginEmail ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.loginEmail && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.loginEmail}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength === 'Strong'
                          ? 'w-full bg-green-500'
                          : passwordStrength === 'Fair'
                          ? 'w-2/3 bg-yellow-500'
                          : 'w-1/3 bg-red-500'
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength === 'Strong'
                      ? 'text-green-600'
                      : passwordStrength === 'Fair'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {passwordStrength}
                  </span>
                </div>
              </div>
            )}
            {errors.password && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.password}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">System Access Role</h3>

          <div className="space-y-2">
            {(['admin', 'manager', 'staff'] as const).map((role) => (
              <label
                key={role}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  systemRole === role
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="systemRole"
                  value={role}
                  checked={systemRole === role}
                  onChange={(e) => setSystemRole(e.target.value as any)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 capitalize">{role}</div>
                  <div className="text-sm text-gray-600">{roleDescriptions[role]}</div>
                </div>
              </label>
            ))}
          </div>
          {errors.systemRole && (
            <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.systemRole}
            </p>
          )}
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Login Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
