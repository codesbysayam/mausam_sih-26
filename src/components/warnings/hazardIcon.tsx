import React from 'react';
import {
  AlertTriangle,
  CloudFog,
  CloudLightning,
  CloudRain,
  Flame,
  LayoutGrid,
  Orbit,
  Snowflake,
  Sprout,
  Waves,
  Wind,
} from 'lucide-react';

export const renderHazardIcon = (
  iconName: string | undefined,
  className = 'w-4 h-4'
): React.ReactNode => {
  switch ((iconName || '').toLowerCase()) {
    case 'rainy':
    case 'heavy_rain':
      return <CloudRain className={className} />;
    case 'thunderstorm':
      return <CloudLightning className={className} />;
    case 'cyclone':
      return <Orbit className={className} />;
    case 'flood':
    case 'tsunami':
    case 'coastal_warning':
      return <Waves className={className} />;
    case 'local_fire_department':
    case 'heatwave':
      return <Flame className={className} />;
    case 'ac_unit':
    case 'cold_wave':
      return <Snowflake className={className} />;
    case 'foggy':
    case 'dense_fog':
      return <CloudFog className={className} />;
    case 'air':
    case 'strong_wind':
      return <Wind className={className} />;
    case 'agriculture':
    case 'agromet_advisory':
      return <Sprout className={className} />;
    case 'apps':
    case 'all':
      return <LayoutGrid className={className} />;
    default:
      return <AlertTriangle className={className} />;
  }
};
