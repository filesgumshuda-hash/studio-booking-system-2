import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/clientPaymentCalculations';

export function ExpensesPage() {
  const navigate = useNavigate();
  const { expenses, bookings, clients, dispatch } = useAppData();
  const [showModal, setShowModal] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('this_month');
  const [bookingFilter, setBookingFilter] = useState('all');

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }

    const today = new Date();
    if (timeFilter === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      filtered = filtered.filter((e) => new Date(e.date) >= firstDay);
    } else if (timeFilter === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      filtered = filtered.filter((e) => {
        const date = new Date(e.date);
        return date >= firstDay && date <= lastDay;
      });
    } else if (timeFilter === 'this_year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      filtered = filtered.filter((e) => new Date(e.date) >= firstDay);
    }

    if (bookingFilter !== 'all') {
      filtered = filtered.filter((e) => e.booking_id === bookingFilter);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, typeFilter, timeFilter, bookingFilter]);

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const generalAmount = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.type === 'general')
        .reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const bookingAmount = useMemo(
    () =>
      filteredExpenses
        .filter((e) => e.type === 'booking')
        .reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;

      dispatch({ type: 'DELETE_EXPENSE', payload: expenseId });
      showToast('Expense deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      showToast(error.message || 'Failed to delete expense', 'error');
    }
  };

  const handleAddExpense = async (expenseData: any) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (error) throw error;

      dispatch({ type: 'ADD_EXPENSE', payload: data });
      showToast('Expense added successfully', 'success');
      setShowModal(false);
    } catch (error: any) {
      console.error('Error adding expense:', error);
      showToast(error.message || 'Failed to add expense', 'error');
      throw error;
    }
  };

  const bookingsWithClient = useMemo(() => {
    return bookings.map((b) => {
      const client = clients.find((c) => c.id === b.client_id);
      return {
        ...b,
        clientName: client?.name || 'Unknown',
      };
    });
  }, [bookings, clients]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <Button
            type="button"
            onClick={() => setShowModal(true)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            + Add Expense
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[180px]"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="booking">Booking</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[180px]"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={bookingFilter}
            onChange={(e) => setBookingFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[180px]"
          >
            <option value="all">All Bookings</option>
            {bookingsWithClient.map((b) => (
              <option key={b.id} value={b.id}>
                {b.clientName} - {b.booking_name || 'Unnamed Booking'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-8 bg-gray-100 rounded-lg p-5 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">Total:</span>
            <span className="text-red-600 font-bold text-xl">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">General:</span>
            <span className="text-red-600 font-bold text-xl">{formatCurrency(generalAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">Booking:</span>
            <span className="text-red-600 font-bold text-xl">{formatCurrency(bookingAmount)}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-600 text-sm">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No expenses found for selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Booking
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Method
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => {
                    const booking = bookingsWithClient.find((b) => b.id === expense.booking_id);

                    return (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              expense.type === 'general'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {expense.type === 'general' ? 'General' : 'Booking'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {booking ? `${booking.clientName} - ${booking.booking_name}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                          {expense.payment_method.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete expense"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && <AddExpenseModal onClose={() => setShowModal(false)} onSave={handleAddExpense} />}

      {ToastComponent}
    </div>
  );
}
