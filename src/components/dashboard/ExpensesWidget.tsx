import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { useAppData } from '../../context/AppContext';

export function ExpensesWidget() {
  const navigate = useNavigate();
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
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate('/expenses')}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">💸</div>
        <div>
          <h3 className="text-sm font-medium text-gray-600">This Month Expenses</h3>
          <div className="text-2xl font-bold text-red-600 mt-1">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">General:</span>
          <span className="font-semibold text-gray-900">
            ₹{generalExpenses.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Booking:</span>
          <span className="font-semibold text-gray-900">
            ₹{bookingExpenses.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {monthlyExpenses.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          {monthlyExpenses.length} expense{monthlyExpenses.length !== 1 ? 's' : ''} this month
        </div>
      )}
    </Card>
  );
}
