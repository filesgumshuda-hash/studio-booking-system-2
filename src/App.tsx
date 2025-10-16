import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/common/Navigation';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BookingsPage } from './pages/BookingsPage';
import { EventTrackingPage } from './pages/EventTrackingPage';
import { BookingTrackingDetailPage } from './pages/BookingTrackingDetailPage';
import { StaffPage } from './pages/StaffPage';
import { CalendarPage } from './pages/CalendarPage';
import { NewPaymentsPage } from './pages/NewPaymentsPage';
import { ClientPaymentsPage } from './pages/ClientPaymentsPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <EventTrackingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-events"
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <EventTrackingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tracking/:bookingId"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <BookingTrackingDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <StaffPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff-payments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <NewPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-payments"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'staff']}>
            <NewPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-payments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ClientPaymentsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <AppRoutes />
          </div>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
