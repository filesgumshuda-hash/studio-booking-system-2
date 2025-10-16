import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin' as const,
  staff_id: null,
};

const mockAppData = {
  bookings: [],
  events: [],
  clients: [],
  staff: [],
  staffAssignments: [],
  workflows: [],
  payments: [],
  staffPaymentRecords: [],
  clientPaymentRecords: [],
  refreshData: async () => {},
  loading: false,
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: typeof mockUser | null;
  appData?: Partial<typeof mockAppData>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    user = mockUser,
    appData = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const mergedAppData = { ...mockAppData, ...appData };

  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  };

  const MockAppProvider = ({ children }: { children: React.ReactNode }) => {
    return (
      <AppProvider>
        {children}
      </AppProvider>
    );
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <MockAuthProvider>
          <MockAppProvider>
            {children}
          </MockAppProvider>
        </MockAuthProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
