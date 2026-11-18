import React from 'react';
import {
  Activity,
  AlertTriangle,
  CloudRain,
  Compass,
  FileText,
  Info,
  Radio,
  Thermometer,
  Wind,
} from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: React.ReactNode;
  id?: string;
}

function renderSectionIcon(icon?: string) {
  if (!icon) return null;
  const cls = 'w-5 h-5 text-[#35C7E8] shrink-0';
  switch (icon) {
    case 'warning':
      return <AlertTriangle className={cls} />;
    case 'thermostat':
      return <Thermometer className={cls} />;
    case 'air':
      return <Wind className={cls} />;
    case 'rainy':
      return <CloudRain className={cls} />;
    case 'radar':
      return <Radio className={cls} />;
    case 'monitoring':
    case 'analytics':
      return <Activity className={cls} />;
    case 'description':
    case 'article':
      return <FileText className={cls} />;
    case 'explore':
      return <Compass className={cls} />;
    default:
      return <Info className={cls} />;
  }
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  id,
}) => {
  return (
    <div className="mausam-section-header" id={id}>
      <div>
        <h3 className="mausam-section-title">
          {renderSectionIcon(icon)}
          <span>{title}</span>
        </h3>
        {subtitle && <p className="mausam-section-subtitle">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
