import React from 'react';
import { Check } from 'lucide-react';
import type { PasswordChecks } from '@/utils/passwordChecks';

const CheckRow: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
  <div className="flex items-center space-x-2">
    {met ? (
      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
    ) : (
      <div className="w-3.5 h-3.5 border border-line-strong rounded-full shrink-0" />
    )}
    <span className={met ? 'text-fg-soft' : 'text-fg-subtle'}>{label}</span>
  </div>
);

// Was duplicated verbatim between the signup view and the reset-password
// view in Login.tsx — same four rules, same markup.
export const PasswordStrengthChecklist: React.FC<{ checks: PasswordChecks }> = ({ checks }) => (
  <div className="space-y-1 bg-page/40 p-3.5 rounded-2xl border border-divider/80 text-xs">
    <CheckRow met={checks.length} label="At least 8 characters" />
    <CheckRow met={checks.capital} label="One capital letter" />
    <CheckRow met={checks.number} label="One number" />
    <CheckRow met={checks.special} label="One special character" />
  </div>
);
