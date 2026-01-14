import React from 'react';
import { DollarSign } from 'lucide-react';
import { Card } from '../common/Card';
import { useAppData } from '../../context/AppContext';

export function ExpensesWidget() {
  const { expenses } = useAppData();

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const monthlyExpenses = expenses.filter((e) => new Date(e.date) >= thisMonth);

  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const generalExpenses = monthlyExpenses
    .filter((e) => e.type === 'general')
    .reduce((sum, e) => sum + e.amount, 0);
  const bookingExpenses = monthlyExpenses
    .filter((e) => e.type === 'booking')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card className="hover:shadow-lg transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">This Month Expenses</p>
          <p className="text-3xl font-bold text-gray-900">₹{totalExpenses.toLocaleString('en-IN')}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-600">
              General: ₹{generalExpenses.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-600">
              Booking: ₹{bookingExpenses.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="bg-red-100 p-3 rounded-lg">
          <DollarSign className="text-red-600" size={24} />
        </div>
      </div>
    </Card>
  );
}
