import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
} from 'lucide-react';

export type StatusVariant = 'good' | 'warning' | 'alert' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  icon?: string;
  className?: string;
}

function renderStatusIcon(icon?: string) {
  if (!icon) return null;
  const cls = 'w-3.5 h-3.5 shrink-0';
  switch (icon) {
    case 'warning':
    case 'error':
      return <AlertTriangle className={cls} />;
    case 'info':
      return <Info className={cls} />;
    case 'lightbulb':
      return <AlertCircle className={cls} />;
    case 'check':
    case 'check_circle':
      return <CheckCircle2 className={cls} />;
    case 'verified_user':
      return <ShieldCheck className={cls} />;
    default:
      return <Info className={cls} />;
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  icon,
  className = '',
}) => {
  return (
    <span className={`mausam-badge mausam-badge--${variant} ${className}`}>
      {renderStatusIcon(icon)}
      <span>{label}</span>
    </span>
  );
};
