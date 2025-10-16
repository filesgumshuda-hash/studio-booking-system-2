import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { useAppData } from '../../context/AppContext';

export function TopClientsWidget() {
  const navigate = useNavigate();
  const { clients, bookings } = useAppData();

  const topClients = clients
    .map(client => {
      const clientBookings = bookings.filter(b => b.client_id === client.id);
      const totalRevenue = clientBookings.reduce((sum, b) => sum + (b.package_amount || 0), 0);

      return {
        id: client.id,
        name: client.name,
        bookingCount: clientBookings.length,
        totalRevenue
      };
    })
    .filter(c => c.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>👑</span> Top Clients
      </h3>

      {topClients.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No clients yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {topClients.map((client, index) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.bookingCount} booking{client.bookingCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap ml-3">
                  ₹{client.totalRevenue.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/client-payments')}
            className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Clients →
          </button>
        </>
      )}
    </Card>
  );
}
