import React, { ReactNode } from 'react';

export function Table({ 
  columns, 
  children, 
  minWidth = '500px' 
}: { 
  columns: (string | ReactNode)[], 
  children: ReactNode, 
  minWidth?: string 
}) {
  return (
    // Wrapped in `relative` so the edge-fade below can hint that the table
    // scrolls horizontally on narrow screens, instead of silently cutting
    // off columns with no indication more content exists.
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E4E7EC]">
              {columns.map((col, i) => (
                <th key={i} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
          </tbody>
        </table>
      </div>
      <div className="md:hidden pointer-events-none absolute top-0 right-0 h-full w-8 table-scroll-fade" />
    </div>
  );
}
