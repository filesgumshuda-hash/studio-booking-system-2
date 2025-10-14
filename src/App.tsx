import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Clipboard, DollarSign, Briefcase, LayoutDashboard, UserCircle } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { DashboardPage } from './pages/DashboardPage';
import { BookingsPage } from './pages/BookingsPage';
import { EventTrackingPage } from './pages/EventTrackingPage';
import { StaffPage } from './pages/StaffPage';
import { CalendarPage } from './pages/CalendarPage';
import { NewPaymentsPage } from './pages/NewPaymentsPage';
import { ClientPaymentsPage } from './pages/ClientPaymentsPage';

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/bookings', label: 'Bookings', icon: Briefcase },
    { path: '/tracking', label: 'Event Tracking', icon: Clipboard },
    { path: '/staff', label: 'Staff', icon: Users },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/staff-payments', label: 'Staff Payments', icon: Users },
    { path: '/client-payments', label: 'Client Payments', icon: UserCircle },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">WedRing Studios</h1>
          </div>
          <div className="flex space-x-1">
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
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/tracking" element={<EventTrackingPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/staff-payments" element={<NewPaymentsPage />} />
            <Route path="/client-payments" element={<ClientPaymentsPage />} />
          </Routes>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
