import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Types
export interface Client {
  id: string;
  name: string;
  contact_number: string;
  email?: string;
  alternate_contact?: string;
  notes?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  booking_name?: string;
  booking_date: string;
  package_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  events?: Event[];
}

export interface Event {
  id: string;
  booking_id: string;
  event_name: string;
  event_date: string;
  time_slot: 'morning' | 'afternoon' | 'evening' | 'fullDay';
  venue: string;
  notes?: string;
  photographers_required: number;
  videographers_required: number;
  drone_operators_required: number;
  editors_required: number;
  created_at: string;
  updated_at: string;
  booking?: Booking;
  staff_assignments?: StaffAssignment[];
  workflow?: Workflow;
}

export interface Staff {
  id: string;
  name: string;
  role: 'photographer' | 'videographer' | 'drone_operator' | 'editor' | 'manager' | 'coordinator';
  contact_number: string;
  email?: string;
  join_date: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface StaffAssignment {
  id: string;
  event_id: string;
  staff_id: string;
  role: string;
  data_received?: boolean;
  data_received_at?: string;
  data_received_by?: string;
  created_at: string;
  staff?: Staff;
  event?: Event;
}

export interface WorkflowStep {
  completed: boolean;
  completed_at?: string;
  updated_by?: string;
  notes?: string;
  notApplicable?: boolean;
}

export interface Workflow {
  id: string;
  event_id: string | null;
  booking_id: string;
  still_workflow: Record<string, WorkflowStep>;
  reel_workflow: Record<string, WorkflowStep>;
  video_workflow: Record<string, WorkflowStep>;
  portrait_workflow: Record<string, WorkflowStep>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  event_id: string;
  staff_id: string;
  role: string;
  agreed_amount: number;
  amount_paid: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  payment_date?: string;
  payment_mode?: string;
  transaction_ref?: string;
  payment_proof?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  staff?: Staff;
  event?: Event;
}

export interface StaffPaymentRecord {
  id: string;
  staff_id: string;
  type: 'agreed' | 'made';
  amount: number;
  payment_date: string;
  payment_method?: string;
  remarks?: string;
  event_id?: string;
  created_at: string;
  updated_at: string;
  staff?: Staff;
  event?: Event;
}

export interface ClientPaymentRecord {
  id: string;
  client_id: string;
  booking_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_status: 'agreed' | 'received';
  transaction_ref?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  booking?: Booking;
}

export interface Expense {
  id: string;
  type: 'general' | 'booking';
  amount: number;
  description: string;
  date: string;
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'card';
  booking_id?: string | null;
  created_at: string;
  updated_at: string;
  booking?: Booking;
}

interface AppState {
  clients: Client[];
  bookings: Booking[];
  events: Event[];
  staff: Staff[];
  staffAssignments: StaffAssignment[];
  workflows: Workflow[];
  payments: Payment[];
  staffPaymentRecords: StaffPaymentRecord[];
  clientPaymentRecords: ClientPaymentRecord[];
  expenses: Expense[];
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'SET_BOOKINGS'; payload: Booking[] }
  | { type: 'SET_EVENTS'; payload: Event[] }
  | { type: 'SET_STAFF'; payload: Staff[] }
  | { type: 'SET_STAFF_ASSIGNMENTS'; payload: StaffAssignment[] }
  | { type: 'SET_WORKFLOWS'; payload: Workflow[] }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'SET_STAFF_PAYMENT_RECORDS'; payload: StaffPaymentRecord[] }
  | { type: 'SET_CLIENT_PAYMENT_RECORDS'; payload: ClientPaymentRecord[] }
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'UPDATE_BOOKING'; payload: Booking }
  | { type: 'DELETE_BOOKING'; payload: string }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_STAFF'; payload: Staff }
  | { type: 'UPDATE_STAFF'; payload: Staff }
  | { type: 'DELETE_STAFF'; payload: string }
  | { type: 'ADD_STAFF_ASSIGNMENT'; payload: StaffAssignment }
  | { type: 'DELETE_STAFF_ASSIGNMENT'; payload: string }
  | { type: 'UPDATE_WORKFLOW'; payload: Workflow }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'UPDATE_PAYMENT'; payload: Payment }
  | { type: 'DELETE_PAYMENT'; payload: string }
  | { type: 'ADD_STAFF_PAYMENT_RECORD'; payload: StaffPaymentRecord }
  | { type: 'DELETE_STAFF_PAYMENT_RECORD'; payload: string }
  | { type: 'ADD_CLIENT_PAYMENT_RECORD'; payload: ClientPaymentRecord }
  | { type: 'DELETE_CLIENT_PAYMENT_RECORD'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string };

const initialState: AppState = {
  clients: [],
  bookings: [],
  events: [],
  staff: [],
  staffAssignments: [],
  workflows: [],
  payments: [],
  staffPaymentRecords: [],
  clientPaymentRecords: [],
  expenses: [],
  loading: true,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload };
    case 'SET_EVENTS':
      return { ...state, events: action.payload };
    case 'SET_STAFF':
      return { ...state, staff: action.payload };
    case 'SET_STAFF_ASSIGNMENTS':
      return { ...state, staffAssignments: action.payload };
    case 'SET_WORKFLOWS':
      return { ...state, workflows: action.payload };
    case 'SET_PAYMENTS':
      return { ...state, payments: action.payload };
    case 'SET_STAFF_PAYMENT_RECORDS':
      return { ...state, staffPaymentRecords: action.payload };
    case 'SET_CLIENT_PAYMENT_RECORDS':
      return { ...state, clientPaymentRecords: action.payload };
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload };
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case 'DELETE_CLIENT':
      return { ...state, clients: state.clients.filter((c) => c.id !== action.payload) };
    case 'ADD_BOOKING':
      return { ...state, bookings: [...state.bookings, action.payload] };
    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map((b) => (b.id === action.payload.id ? action.payload : b)),
      };
    case 'DELETE_BOOKING':
      return { ...state, bookings: state.bookings.filter((b) => b.id !== action.payload) };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) => (e.id === action.payload.id ? action.payload : e)),
      };
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter((e) => e.id !== action.payload) };
    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, action.payload] };
    case 'UPDATE_STAFF':
      return {
        ...state,
        staff: state.staff.map((s) => (s.id === action.payload.id ? action.payload : s)),
      };
    case 'DELETE_STAFF':
      return { ...state, staff: state.staff.filter((s) => s.id !== action.payload) };
    case 'ADD_STAFF_ASSIGNMENT':
      return { ...state, staffAssignments: [...state.staffAssignments, action.payload] };
    case 'DELETE_STAFF_ASSIGNMENT':
      return {
        ...state,
        staffAssignments: state.staffAssignments.filter((sa) => sa.id !== action.payload),
      };
    case 'UPDATE_WORKFLOW':
      return {
        ...state,
        workflows: state.workflows.map((w) => (w.id === action.payload.id ? action.payload : w)),
      };
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload] };
    case 'UPDATE_PAYMENT':
      return {
        ...state,
        payments: state.payments.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    case 'DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter((p) => p.id !== action.payload) };
    case 'ADD_STAFF_PAYMENT_RECORD':
      return { ...state, staffPaymentRecords: [...state.staffPaymentRecords, action.payload] };
    case 'DELETE_STAFF_PAYMENT_RECORD':
      return { ...state, staffPaymentRecords: state.staffPaymentRecords.filter((spr) => spr.id !== action.payload) };
    case 'ADD_CLIENT_PAYMENT_RECORD':
      return { ...state, clientPaymentRecords: [...state.clientPaymentRecords, action.payload] };
    case 'DELETE_CLIENT_PAYMENT_RECORD':
      return { ...state, clientPaymentRecords: state.clientPaymentRecords.filter((cpr) => cpr.id !== action.payload) };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.payload.id ? action.payload : e)),
      };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.payload) };
    default:
      return state;
  }
}

interface AppContextType extends AppState {
  dispatch: React.Dispatch<AppAction>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const refreshData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Fetch all data in parallel
      const [
        clientsRes,
        bookingsRes,
        eventsRes,
        staffRes,
        assignmentsRes,
        workflowsRes,
        paymentsRes,
        staffPaymentRecordsRes,
        clientPaymentRecordsRes,
        expensesRes,
      ] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, client:clients(*)').order('created_at', { ascending: false }),
        supabase.from('events').select('*, booking:bookings(*, client:clients(*))').order('event_date', { ascending: true }),
        supabase.from('staff').select('*').order('name', { ascending: true }),
        supabase.from('staff_assignments').select('*, staff:staff(*), event:events(*)'),
        supabase.from('workflows').select('*'),
        supabase.from('payments').select('*, staff:staff(*), event:events(*)'),
        supabase.from('staff_payment_records').select('*, staff:staff(*), event:events(*)').order('payment_date', { ascending: false }),
        supabase.from('client_payment_records').select('*, client:clients(*), booking:bookings(*)').order('payment_date', { ascending: false }),
        supabase.from('expenses').select('*, booking:bookings(*, client:clients(*))').order('date', { ascending: false }),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (staffRes.error) throw staffRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      if (workflowsRes.error) throw workflowsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (staffPaymentRecordsRes.error) throw staffPaymentRecordsRes.error;
      if (clientPaymentRecordsRes.error) throw clientPaymentRecordsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      dispatch({ type: 'SET_CLIENTS', payload: clientsRes.data });
      dispatch({ type: 'SET_BOOKINGS', payload: bookingsRes.data });
      dispatch({ type: 'SET_EVENTS', payload: eventsRes.data });
      dispatch({ type: 'SET_STAFF', payload: staffRes.data });
      dispatch({ type: 'SET_STAFF_ASSIGNMENTS', payload: assignmentsRes.data });
      dispatch({ type: 'SET_WORKFLOWS', payload: workflowsRes.data });
      dispatch({ type: 'SET_PAYMENTS', payload: paymentsRes.data });
      dispatch({ type: 'SET_STAFF_PAYMENT_RECORDS', payload: staffPaymentRecordsRes.data });
      dispatch({ type: 'SET_CLIENT_PAYMENT_RECORDS', payload: clientPaymentRecordsRes.data });
      dispatch({ type: 'SET_EXPENSES', payload: expensesRes.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <AppContext.Provider value={{ ...state, dispatch, refreshData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppProvider');
  }
  return context;
}
