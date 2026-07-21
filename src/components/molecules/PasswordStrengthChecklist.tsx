import React from 'react';
import { Check } from 'lucide-react';
import type { PasswordChecks } from '@/utils/passwordChecks';

const CheckRow: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
  <div className="flex items-center space-x-2">
    {met ? (
      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
    ) : (
      <div className="w-3.5 h-3.5 border border-slate-600 rounded-full shrink-0" />
    )}
    <span className={met ? 'text-gray-300' : 'text-gray-500'}>{label}</span>
  </div>
);

// Was duplicated verbatim between the signup view and the reset-password
// view in Login.tsx — same four rules, same markup.
export const PasswordStrengthChecklist: React.FC<{ checks: PasswordChecks }> = ({ checks }) => (
  <div className="space-y-1 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
    <CheckRow met={checks.length} label="At least 8 characters" />
    <CheckRow met={checks.capital} label="One capital letter" />
    <CheckRow met={checks.number} label="One number" />
    <CheckRow met={checks.special} label="One special character" />
  </div>
);
