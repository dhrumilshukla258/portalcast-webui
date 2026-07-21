import React from 'react';

export const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; accent?: string }> = ({
  icon: Icon,
  label,
  value,
  accent = 'text-blue-500',
}) => (
  <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
      <Icon size={14} className={accent} />
      {label}
    </div>
    <div className="mt-2 text-2xl font-black text-white">{value}</div>
  </div>
);
