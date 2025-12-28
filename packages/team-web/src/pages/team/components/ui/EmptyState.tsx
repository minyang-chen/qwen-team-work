import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  className = '',
}) => (
  <div className={`text-center py-8 text-gray-500 ${className}`}>
    {icon && <div className="mb-2">{icon}</div>}
    <p className="text-sm">{message}</p>
  </div>
);
