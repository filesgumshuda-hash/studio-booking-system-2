import React from 'react';
import { useNavigate } from 'react-router-dom';

export function PaymentQuickAccess() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* Client Payments Button */}
      <button
        onClick={() => navigate('/client-payments')}
        className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg hover:shadow-lg hover:border-green-400 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">💰</div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Client Payments</h3>
            <p className="text-sm text-gray-600">Manage client invoices and payments</p>
          </div>
        </div>
        <div className="text-2xl text-green-600 group-hover:translate-x-1 transition-transform">
          →
        </div>
      </button>

      {/* Staff Payments Button */}
      <button
        onClick={() => navigate('/staff-payments')}
        className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg hover:shadow-lg hover:border-blue-400 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">💵</div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900">Staff Payments</h3>
            <p className="text-sm text-gray-600">Track staff earnings and payments</p>
          </div>
        </div>
        <div className="text-2xl text-blue-600 group-hover:translate-x-1 transition-transform">
          →
        </div>
      </button>
    </div>
  );
}
