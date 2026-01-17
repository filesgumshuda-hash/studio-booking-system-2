import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Plus, Wallet, Clipboard } from 'lucide-react';
import { useState } from 'react';

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moneySheetOpen, setMoneySheetOpen] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50 md:hidden">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className={`flex flex-col items-center text-xs ${
            isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/tracking')}
          className={`flex flex-col items-center text-xs ${
            isActive('/tracking') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Clipboard size={20} />
          <span>Tracking</span>
        </button>
        <button
          type="button"
          onClick={() => setNewSheetOpen(true)}
          className="flex flex-col items-center text-xs text-gray-600"
        >
          <div className="bg-blue-500 text-white rounded-full p-1">
            <Plus size={20} />
          </div>
          <span>New</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className={`flex flex-col items-center text-xs ${
            isActive('/calendar') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Calendar size={20} />
          <span>Cal</span>
        </button>
        <button
          type="button"
          onClick={() => setMoneySheetOpen(true)}
          className="flex flex-col items-center text-xs text-gray-600"
        >
          <Wallet size={20} />
          <span>Money</span>
        </button>
      </nav>

      {/* New Bottom Sheet */}
      {newSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNewSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <button
              type="button"
              onClick={() => {
                navigate('/bookings');
                setNewSheetOpen(false);
              }}
              className="w-full text-left py-3 border-b hover:bg-gray-50 transition-colors"
            >
              New Booking
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/expenses');
                setNewSheetOpen(false);
              }}
              className="w-full text-left py-3 hover:bg-gray-50 transition-colors"
            >
              New Expense
            </button>
          </div>
        </div>
      )}

      {/* Money Bottom Sheet */}
      {moneySheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoneySheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <button
              type="button"
              onClick={() => {
                navigate('/client-payments');
                setMoneySheetOpen(false);
              }}
              className="w-full text-left py-3 border-b hover:bg-gray-50 transition-colors"
            >
              Client Payments
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/staff-payments');
                setMoneySheetOpen(false);
              }}
              className="w-full text-left py-3 border-b hover:bg-gray-50 transition-colors"
            >
              Staff Payments
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/expenses');
                setMoneySheetOpen(false);
              }}
              className="w-full text-left py-3 hover:bg-gray-50 transition-colors"
            >
              Expenses
            </button>
          </div>
        </div>
      )}
    </>
  );
}
