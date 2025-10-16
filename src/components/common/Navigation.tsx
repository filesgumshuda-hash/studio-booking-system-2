import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Clipboard, DollarSign, Briefcase, UserCircle, LogOut, Camera, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  const getNavItems = () => {
    switch (user.role) {
      case 'admin':
        return [
          { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/bookings', label: 'Bookings', icon: Briefcase },
          { path: '/tracking', label: 'Event Tracking', icon: Clipboard },
          { path: '/staff', label: 'Staff', icon: Users },
          { path: '/calendar', label: 'Calendar', icon: Calendar },
        ];
      case 'manager':
        return [
          { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/bookings', label: 'Bookings', icon: Briefcase },
          { path: '/tracking', label: 'Event Tracking', icon: Clipboard },
          { path: '/staff', label: 'Staff', icon: Users },
          { path: '/calendar', label: 'Calendar', icon: Calendar },
        ];
      case 'staff':
        return [
          { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { path: '/my-bookings', label: 'My Bookings', icon: Briefcase },
          { path: '/my-events', label: 'My Events', icon: Clipboard },
          { path: '/calendar', label: 'Calendar', icon: Calendar },
          { path: '/my-payments', label: 'My Payments', icon: DollarSign },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Camera className="w-6 h-6 text-gray-900" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">WedRing Studios</h1>
                <p className="text-xs text-gray-500">{user.name} ({user.role})</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ml-2"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showLogoutConfirm && (
        <ConfirmDialog
          isOpen={showLogoutConfirm}
          title="Confirm Logout"
          message="Are you sure you want to logout?"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
          confirmText="Yes, Logout"
          cancelText="Cancel"
        />
      )}
    </>
  );
}
