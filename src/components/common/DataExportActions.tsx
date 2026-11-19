import React, { useState } from 'react';
import { Download, FileSpreadsheet, Printer, Check } from 'lucide-react';
import { StateWeatherData } from '../map/IndiaWeatherMap';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';

interface DataExportActionsProps {
  data?: StateWeatherData[];
  reportTitle?: string;
}

export const DataExportActions: React.FC<DataExportActionsProps> = ({
  data = INDIA_WEATHER_DATA,
  reportTitle = 'Mausam National Atmospheric Observation Report',
}) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  const generateCSVContent = () => {
    const headers = [
      'State_Code',
      'State_Name',
      'Capital_Station',
      'Temperature_C',
      'Rainfall_24h_mm',
      'Air_Quality_AQI',
      'Relative_Humidity_Pct',
      'Wind_Speed_kmh',
      'Wind_Direction',
      'Atmospheric_Condition',
      'Warning_Level',
      'Warning_Message',
      'Observation_Time_IST',
      'Data_Source_Attribution',
    ];

    const rows = data.map((item) => [
      `"${item.id}"`,
      `"${item.name}"`,
      `"${item.city || 'Regional Station'}"`,
      typeof item.temperature === 'number' && Number.isFinite(item.temperature) ? item.temperature : '—',
      typeof item.rainfall === 'number' && Number.isFinite(item.rainfall) ? item.rainfall : '—',
      typeof item.aqi === 'number' && Number.isFinite(item.aqi) ? item.aqi : '—',
      typeof item.humidity === 'number' && Number.isFinite(item.humidity) ? item.humidity : '—',
      typeof item.windSpeed === 'number' && Number.isFinite(item.windSpeed) ? item.windSpeed : '—',
      `"${item.windDir || '—'}"`,
      `"${item.condition || '—'}"`,
      `"${(item.warningLevel || 'NORMAL').toUpperCase()}"`,
      `"${(item.warningMessage || 'Routine observation').replace(/"/g, '""')}"`,
      `"${item.updatedAt || '—'}"`,
      `"${item.dataSource || 'IMD National Synoptic Observational Grid'}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const handleDownloadCSV = () => {
    const csvData = generateCSVContent();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `MAUSAM_National_Weather_Data_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedFormat('csv');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const handleExportExcel = () => {
    const csvData = generateCSVContent();
    const blob = new Blob([csvData], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `MAUSAM_National_Weather_Report_${new Date().toISOString().slice(0, 10)}.xls`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedFormat('excel');
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="data-export-action-bar"
      aria-label={reportTitle}
      className="flex flex-wrap items-center gap-2 p-3 bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl text-xs"
    >
      <span className="text-[var(--m-text-muted)] font-bold text-[11px] uppercase tracking-wider mr-1">
        Data Export:
      </span>

      <button
        type="button"
        id="btn-download-csv"
        onClick={handleDownloadCSV}
        className="flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[36px] bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/50 text-[var(--m-text-primary)] rounded-lg transition-colors cursor-pointer font-medium"
      >
        {downloadedFormat === 'csv' ? (
          <Check className="w-3.5 h-3.5 text-[var(--m-ok)]" />
        ) : (
          <Download className="w-3.5 h-3.5 text-[var(--m-accent)]" />
        )}
        <span>Download CSV</span>
      </button>

      <button
        type="button"
        id="btn-export-excel"
        onClick={handleExportExcel}
        className="flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[36px] bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-ok)]/50 text-[var(--m-text-primary)] rounded-lg transition-colors cursor-pointer font-medium"
      >
        {downloadedFormat === 'excel' ? (
          <Check className="w-3.5 h-3.5 text-[var(--m-ok)]" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--m-ok)]" />
        )}
        <span>Export Excel</span>
      </button>

      <button
        type="button"
        id="btn-print-report"
        onClick={handlePrint}
        className="flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[36px] bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-watch)]/50 text-[var(--m-text-primary)] rounded-lg transition-colors cursor-pointer font-medium"
      >
        <Printer className="w-3.5 h-3.5 text-[var(--m-watch)]" />
        <span>Print Report</span>
      </button>

      <span className="ml-auto text-[10px] text-[var(--m-text-muted)] font-mono hidden md:inline">
        Official IMD Observation Format
      </span>
    </div>
  );
};
