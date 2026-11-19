import React from 'react';

export const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; accent?: string }> = ({
  icon: Icon,
  label,
  value,
  accent = 'text-accent',
}) => (
  <div className="rounded-2xl border border-line bg-panel/30 p-5">
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-fg-subtle">
      <Icon size={14} className={accent} />
      {label}
    </div>
    <div className="mt-2 text-2xl font-black text-white">{value}</div>
  </div>
);
