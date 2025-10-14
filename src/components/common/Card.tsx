import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  borderColor?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', borderColor, onClick }: CardProps) {
  const borderStyle = borderColor ? `border-l-4 border-l-${borderColor}` : '';
  const cursorStyle = onClick ? 'cursor-pointer hover:shadow-lg' : '';

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 transition-shadow ${borderStyle} ${cursorStyle} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
