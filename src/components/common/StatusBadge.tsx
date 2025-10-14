import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    'Shoot Scheduled': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Post-Production': 'bg-yellow-100 text-yellow-800',
    'Delivered': 'bg-green-100 text-green-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Partial': 'bg-orange-100 text-orange-800',
    'Paid': 'bg-green-100 text-green-800',
    'Overdue': 'bg-red-100 text-red-800',
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    morning: 'bg-blue-100 text-blue-800',
    afternoon: 'bg-green-100 text-green-800',
    evening: 'bg-orange-100 text-orange-800',
    fullDay: 'bg-purple-100 text-purple-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'} ${className}`}>
      {status}
    </span>
  );
}
