import React from 'react';

interface SectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  title,
  action,
  children,
  className = '',
}) => (
  <div className={`mb-8 ${className}`}>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);
