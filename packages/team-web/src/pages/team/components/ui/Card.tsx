import React from 'react';

interface CardProps {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  selected = false,
  onClick,
  children,
  className = '',
}) => (
  <div
    onClick={onClick}
    className={`rounded-lg border-2 transition-all ${
      onClick ? 'cursor-pointer hover:shadow-lg' : ''
    } ${
      selected
        ? 'border-blue-500 bg-blue-50 shadow-md'
        : 'border-gray-200 bg-white hover:border-gray-300'
    } ${className}`}
  >
    {children}
  </div>
);
