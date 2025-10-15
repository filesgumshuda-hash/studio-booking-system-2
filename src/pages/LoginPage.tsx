import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Camera, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    phoneOrEmail: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.phoneOrEmail) {
      newErrors.phoneOrEmail = 'Phone number or email is required';
    } else {
      const isPhone = /^[0-9]{10}$/.test(formData.phoneOrEmail);
      const isEmail = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.phoneOrEmail);

      if (!isPhone && !isEmail) {
        newErrors.phoneOrEmail = 'Enter a valid 10-digit phone number or email address';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await login(
        formData.phoneOrEmail,
        formData.password,
        formData.rememberMe
      );

      if (result.success && result.redirectPath) {
        navigate(result.redirectPath);
      } else {
        setErrors({ general: result.error || 'Login failed' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'An error occurred during login' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-gray-900" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">WedRing Studios</h1>
            <p className="text-gray-600">Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Login to Your Account</h2>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="phoneOrEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number or Email <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="phoneOrEmail"
                value={formData.phoneOrEmail}
                onChange={(e) => {
                  setFormData({ ...formData, phoneOrEmail: e.target.value });
                  setErrors({ ...errors, phoneOrEmail: '', general: '' });
                }}
                placeholder="Enter phone or email"
                className={`w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.phoneOrEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.phoneOrEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneOrEmail}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrors({ ...errors, password: '', general: '' });
                  }}
                  placeholder="Enter password"
                  className={`w-full h-12 px-4 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
                Remember me for 30 days
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Test Accounts: admin@wedring.com / admin123, gurdit@wedring.com / gurdit123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
