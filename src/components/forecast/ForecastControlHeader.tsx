import React from 'react';
import { NWPModelType, StructuredModelForecast } from '../../services/nwpModelService';
import { LocationRecord } from '../../types';
import { NWPWorkspace } from '../nwp/NWPWorkspace';

interface ForecastControlHeaderProps {
  selectedLocation: LocationRecord;
  modelType: NWPModelType;
  onSelectModel: (model: NWPModelType) => void;
  lastUpdated: string;
  isLive?: boolean;
  onExportCSV: () => void;
  structuredForecast?: StructuredModelForecast | null;
  isLoadingModel?: boolean;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
}

export const ForecastControlHeader: React.FC<ForecastControlHeaderProps> = ({
  selectedLocation,
  onExportCSV,
}) => {
  return (
    <div id="forecast-command-header" className="w-full flex flex-col gap-4">
      {/* Comprehensive Numerical Weather Prediction (NWP) Control Room */}
      <NWPWorkspace location={selectedLocation} />
    </div>
  );
};
