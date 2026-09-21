import React from 'react';
import { TicketPriority, TicketStatus } from '../types';

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const styles: Record<TicketStatus, string> = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
    on_hold: 'bg-purple-100 text-purple-800 border-purple-200',
    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    closed: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const label = status.replace('_', ' ').toUpperCase();

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  const styles: Record<TicketPriority, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-sky-100 text-sky-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700 font-bold',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs uppercase font-medium ${styles[priority]}`}>
      {priority}
    </span>
  );
};
