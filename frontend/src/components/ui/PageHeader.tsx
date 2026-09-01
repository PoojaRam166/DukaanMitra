import React, { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action, children }: { title: ReactNode, subtitle?: ReactNode, action?: ReactNode, children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-[#1E2A3B]">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {(action || children) && (
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {action}
          {children}
        </div>
      )}
    </div>
  );
}
