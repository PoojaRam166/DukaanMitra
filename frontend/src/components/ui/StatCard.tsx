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

  const clickableClasses = onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-[#3B5BDB]/50 hover:bg-[#EEF2FF]/30 active:translate-y-0 transition-all duration-200' : '';

  // Removed persistent blue border for selected state as requested,
  // rely purely on the hover effect for interactivity feedback.
  const selectionStyle: React.CSSProperties = selected
    ? { background: 'rgba(59,91,219,0.02)' }
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
    <div onClick={onClick} style={selectionStyle} className={`stat-card fade-in flex flex-col items-center justify-center text-center py-6 min-h-[140px] ${bgColor} ${clickableClasses} ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg || bgColor || '#f3f4f6' }}>
            <Icon size={16} style={{ color: iconColor }} />
          </div>
        )}
        <p className={titleClassName || "text-sm text-gray-500 font-medium"}>{displayTitle}</p>
      </div>
      <div className={`font-display font-extrabold text-2xl ${valueColor} mb-1 mt-1`}>{value}</div>
      {subtitle && (
        <div className="text-[11px] text-gray-500 mt-1 font-medium">{subtitle}</div>
      )}
      {change && (
        <div className={`text-[12px] font-semibold flex items-center gap-1 mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
          {change}
        </div>
      )}
    </div>
  );
}
