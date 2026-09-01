import React, { ReactNode } from 'react';

export function Card({ 
  title, 
  action, 
  children, 
  className = '', 
  noPadding = false 
}: { 
  title?: ReactNode, 
  action?: ReactNode, 
  children: ReactNode, 
  className?: string, 
  noPadding?: boolean 
}) {
  return (
    <div className={`bg-white rounded-xl border border-[#E4E7EC] overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between p-5 border-b border-[#E4E7EC]">
          {title && <h3 className="font-display font-extrabold text-base text-[#1E2A3B]">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}
