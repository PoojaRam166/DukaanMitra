import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title?: ReactNode;
  label?: string; // fallback if title is not provided
  subtitle?: ReactNode;
  value: ReactNode;
  icon?: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  change?: string;
  trend?: 'up' | 'down';
  valueColor?: string;
  bgColor?: string;
  centered?: boolean;
  onClick?: () => void;
  className?: string;
  /** When true, renders the card's "currently selected" border. Drive this
   * from state (e.g. `selectedCard === 'inStock'`) rather than hard-coding
   * it on a single card, so only one card is ever marked selected at a time. */
  selected?: boolean;
  titleClassName?: string;
}

export function StatCard({ 
  title, 
  label,
  subtitle,
  value, 
  icon: Icon, 
  iconColor, 
  iconBg, 
  change, 
  trend, 
  valueColor = 'text-[#1E2A3B]',
  bgColor = '',
  centered = false,
  onClick,
  className = '',
  selected = false,
  titleClassName,
}: StatCardProps) {
  const displayTitle = title || label;

  const clickableClasses = onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-none' : '';

  // Inline style (rather than a Tailwind `border-*`/`ring-*` class) so the
  // selected state always wins over the base `.stat-card` border defined in
  // index.css, regardless of stylesheet load order or Tailwind ring support.
  const selectionStyle: React.CSSProperties = selected
    ? { border: '2px solid #3B5BDB', boxShadow: '0 0 0 2px rgba(59,91,219,0.15)' }
    : {};

  if (centered) {
    return (
      <div onClick={onClick} style={selectionStyle} className={`stat-card text-center ${bgColor} ${clickableClasses} ${className}`}>
        <div className={`font-display font-extrabold text-2xl ${valueColor} mb-1`}>{value}</div>
        <div className={titleClassName || "text-xs text-gray-500"}>{displayTitle}</div>
      </div>
    );
  }

  return (
    <div onClick={onClick} style={selectionStyle} className={`stat-card fade-in flex flex-col justify-between ${bgColor} ${clickableClasses} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {Icon && !iconBg && (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100" style={{ background: bgColor }}>
              <Icon size={16} style={{ color: iconColor }} />
            </div>
          )}
          <p className={titleClassName || "text-xs text-gray-500 font-medium"}>{displayTitle}</p>
        </div>
        {Icon && iconBg && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
            <Icon size={14} style={{ color: iconColor }} />
          </div>
        )}
      </div>
      <div className={`font-display font-extrabold text-xl ${valueColor} mb-1`}>{value}</div>
      {subtitle && (
        <div className="text-[11px] text-gray-500 mt-1 font-medium">{subtitle}</div>
      )}
      {change && (
        <div className={`text-[11px] font-semibold flex items-center gap-0.5 ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp size={10} /> : trend === 'down' ? <TrendingDown size={10} /> : null}
          {change}
        </div>
      )}
    </div>
  );
}
