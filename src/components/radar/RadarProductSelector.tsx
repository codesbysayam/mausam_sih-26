import React from 'react';
import { Layers, ShieldCheck } from 'lucide-react';
import { RadarProductType } from '../../types/radar';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

export interface RadarProductSelectorProps {
  selectedProduct: RadarProductType | 'PRECIP';
  onSelectProduct: (product: RadarProductType | 'PRECIP') => void;
  radarSourceLabel?: string;
  isRadarMode?: boolean;
}

interface ProductItem {
  id: RadarProductType | 'PRECIP';
  label: string;
  shortDesc: string;
  available: boolean;
  statusText: string;
}

const RADAR_PRODUCTS: ProductItem[] = [
  {
    id: 'PRECIP',
    label: 'Precipitation Composite',
    shortDesc: 'RainViewer precipitation radar composite overlay',
    available: true,
    statusText: 'Active (RainViewer Composite)',
  },
  {
    id: 'MAXZ',
    label: 'MAX Z',
    shortDesc: 'Maximum Reflectivity Column (Volumetric Maximum)',
    available: false,
    statusText: 'Unavailable from public gateway',
  },
  {
    id: 'PPZ',
    label: 'PPZ / Reflectivity',
    shortDesc: 'PPI Reflectivity (0.5° Base Elevation Hydrometeor Tilt)',
    available: false,
    statusText: 'Unavailable from public gateway',
  },
  {
    id: 'PPV',
    label: 'PPV / Velocity',
    shortDesc: 'PPI Radial Doppler Hydrometeor Velocity (Mean Wind Field)',
    available: false,
    statusText: 'Unavailable from public gateway',
  },
  {
    id: 'SRI',
    label: 'SRI / Rainfall',
    shortDesc: 'Surface Rainfall Intensity (Instantaneous rate in mm/h)',
    available: false,
    statusText: 'Unavailable from public gateway',
  },
  {
    id: 'PAC',
    label: 'PAC / Accumulation',
    shortDesc: 'Precipitation Accumulation (24-hour total estimation)',
    available: false,
    statusText: 'Unavailable from public gateway',
  },
  {
    id: 'VVP2',
    label: 'VVP2 / Wind',
    shortDesc: 'Volume Velocity Processing (Vertical Azimuth Wind Profile)',
    available: false,
    statusText: 'Unavailable from public gateway',
  },
];

export const RadarProductSelector: React.FC<RadarProductSelectorProps> = ({
  selectedProduct,
  onSelectProduct,
  radarSourceLabel = 'RainViewer precipitation radar',
}) => {
  return (
    <DataPanel>
      <SectionHeading
        title="Radar Data & Product Information"
        subtitle="Operational product status and volumetric Doppler gateway availability"
        icon={<Layers className="w-4 h-4" />}
        action={
          <span className="text-[11px] font-mono text-[#35C7E8] bg-[#08131F] border border-[#26394B] px-2.5 py-1 rounded-md">
            Overlay: {radarSourceLabel}
          </span>
        }
        className="mb-4"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {RADAR_PRODUCTS.map((prod) => {
          const isSelected = selectedProduct === prod.id;
          return (
            <button
              key={prod.id}
              type="button"
              disabled={!prod.available}
              onClick={() => {
                if (prod.available) onSelectProduct(prod.id);
              }}
              className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-colors m-focus-ring ${
                prod.available
                  ? isSelected
                    ? 'bg-[#101F2E] border-[#35C7E8] cursor-pointer'
                    : 'bg-[#08131F] border-[#26394B] hover:border-[#38536A] cursor-pointer'
                  : 'bg-[#08131F]/60 border-[#26394B]/60 opacity-80 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#F3F6FA]">{prod.label}</span>
                  <SourceStatus
                    status={prod.available ? 'LIVE' : 'UNAVAILABLE'}
                    labelOverride={prod.available ? 'ACTIVE' : 'UNAVAILABLE'}
                  />
                </div>
                <p className="text-[11px] text-[#B5C3D1] leading-snug mb-2">
                  {prod.shortDesc}
                </p>
              </div>

              <div className="pt-2 border-t border-[#26394B] mt-1 text-[10px]">
                <span className={prod.available ? 'text-[#35C7E8] font-mono' : 'text-[#8295A8]'}>
                  {prod.statusText}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3.5 bg-[#08131F] border border-[#26394B] rounded-lg text-xs text-[#B5C3D1] flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-[#F3F6FA] block">Data Integrity &amp; Calibration Transparency</span>
          <p className="text-[11px] text-[#B5C3D1] leading-relaxed">
            RainViewer precipitation radar composite provides real-time hydrometeor reflectivity. IMD single-station volumetric Doppler products (MAX Z, PPZ, PPV, SRI, PAC, VVP2) require direct institutional gateway authorization and are marked Unavailable without simulation.
          </p>
        </div>
      </div>
    </DataPanel>
  );
};

export default RadarProductSelector;
