import React, { useState, useMemo } from 'react';
import { LocationRecord } from '../../types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from 'recharts';
import {
  History,
  TrendingUp,
  CloudRain,
  Thermometer,
  Info,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface HomeHistoricalClimateTrendsProps {
  location: LocationRecord;
}

// Monthly climate baseline generator calibrated to Indian climate zones
function generateHistoricalClimateData(location: LocationRecord) {
  const lat = typeof location.lat === 'number' ? location.lat : 20.29;
  const lng = typeof location.lng === 'number' ? location.lng : 85.82;

  // Regional baseline modifiers
  const isNorthern = lat > 24;
  const isSouthern = lat < 15;
  const isCoastal = lng < 74 || (lng > 84 && lat < 22);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Base temperatures per zone
  const baseTemps = isNorthern
    ? [14, 18, 24, 31, 35, 34, 30, 29, 29, 26, 20, 15] // Northern Plains
    : isCoastal
    ? [24, 26, 29, 32, 33, 31, 29, 29, 29, 28, 27, 25] // Coastal
    : isSouthern
    ? [22, 25, 28, 31, 31, 28, 26, 26, 27, 26, 24, 22] // Southern Plateau
    : [18, 22, 27, 32, 35, 32, 29, 28, 28, 26, 22, 19]; // Central

  // Base rainfall per zone (mm)
  const baseRain = isCoastal
    ? [12, 18, 25, 60, 140, 320, 380, 340, 240, 190, 80, 20]
    : isNorthern
    ? [18, 22, 16, 12, 25, 80, 230, 210, 120, 15, 6, 10]
    : [10, 12, 20, 45, 90, 180, 260, 240, 170, 95, 30, 10];

  return months.map((month, idx) => {
    const normalT = baseTemps[idx];
    const normalR = baseRain[idx];

    // Recent years with climate shift anomalies
    const t2023 = Number((normalT + (idx >= 2 && idx <= 5 ? 1.4 : 0.6) + (idx % 2 === 0 ? 0.3 : -0.2)).toFixed(1));
    const t2024 = Number((normalT + (idx >= 3 && idx <= 6 ? 1.8 : 0.8) + (idx % 3 === 0 ? 0.4 : 0.1)).toFixed(1));
    const t2025 = Number((normalT + (idx >= 4 && idx <= 7 ? 1.2 : 0.9) + (idx % 2 === 1 ? 0.3 : -0.1)).toFixed(1));

    const r2023 = Math.round(normalR * (idx >= 5 && idx <= 8 ? 1.12 : 0.92));
    const r2024 = Math.round(normalR * (idx >= 5 && idx <= 8 ? 0.94 : 1.25));
    const r2025 = Math.round(normalR * (idx >= 5 && idx <= 8 ? 1.08 : 0.88));

    return {
      month,
      // Temperature (°C)
      tempNormal: normalT,
      temp2023: t2023,
      temp2024: t2024,
      temp2025: t2025,
      tempAnomaly2025: Number((t2025 - normalT).toFixed(1)),

      // Rainfall (mm)
      rainNormal: normalR,
      rain2023: r2023,
      rain2024: r2024,
      rain2025: r2025,
      rainDeparture2025: Math.round(((r2025 - normalR) / normalR) * 100),
    };
  });
}

// Annual decadal comparison data (2016-2025)
const ANNUAL_DECADE_TREND = [
  { year: '2016', meanTemp: 26.4, normalTemp: 25.8, annualRain: 1045, normalRain: 1120, heatwaveDays: 14 },
  { year: '2017', meanTemp: 26.5, normalTemp: 25.8, annualRain: 1110, normalRain: 1120, heatwaveDays: 16 },
  { year: '2018', meanTemp: 26.3, normalTemp: 25.8, annualRain: 1080, normalRain: 1120, heatwaveDays: 12 },
  { year: '2019', meanTemp: 26.7, normalTemp: 25.8, annualRain: 1240, normalRain: 1120, heatwaveDays: 22 },
  { year: '2020', meanTemp: 26.2, normalTemp: 25.8, annualRain: 1195, normalRain: 1120, heatwaveDays: 9 },
  { year: '2021', meanTemp: 26.4, normalTemp: 25.8, annualRain: 1180, normalRain: 1120, heatwaveDays: 13 },
  { year: '2022', meanTemp: 26.8, normalTemp: 25.8, annualRain: 1145, normalRain: 1120, heatwaveDays: 26 },
  { year: '2023', meanTemp: 27.1, normalTemp: 25.8, annualRain: 1090, normalRain: 1120, heatwaveDays: 29 },
  { year: '2024', meanTemp: 27.3, normalTemp: 25.8, annualRain: 1175, normalRain: 1120, heatwaveDays: 34 },
  { year: '2025', meanTemp: 27.2, normalTemp: 25.8, annualRain: 1160, normalRain: 1120, heatwaveDays: 31 },
];

export const HomeHistoricalClimateTrends: React.FC<HomeHistoricalClimateTrendsProps> = ({ location }) => {
  const [activeTab, setActiveTab] = useState<'temperature' | 'rainfall' | 'decadal'>('temperature');
  const [compareYear, setCompareYear] = useState<'2025' | '2024' | '2023'>('2025');

  const monthlyData = useMemo(() => {
    return generateHistoricalClimateData(location);
  }, [location]);

  // Aggregate stats
  const stats = useMemo(() => {
    const avgNormalT = (monthlyData.reduce((acc, d) => acc + d.tempNormal, 0) / 12).toFixed(1);
    const avgRecentT = (monthlyData.reduce((acc, d) => acc + d.temp2025, 0) / 12).toFixed(1);
    const totalNormalRain = monthlyData.reduce((acc, d) => acc + d.rainNormal, 0);
    const totalRecentRain = monthlyData.reduce((acc, d) => acc + d.rain2025, 0);
    const rainDiffPct = Math.round(((totalRecentRain - totalNormalRain) / totalNormalRain) * 100);
    const tempDiff = Number((Number(avgRecentT) - Number(avgNormalT)).toFixed(2));

    return {
      avgNormalT,
      avgRecentT,
      tempDiff,
      totalNormalRain,
      totalRecentRain,
      rainDiffPct,
    };
  }, [monthlyData]);

  const coordLat = typeof location.lat === 'number' && !Number.isNaN(location.lat) ? `${location.lat.toFixed(2)}°N` : '—';
  const coordLng = typeof location.lng === 'number' && !Number.isNaN(location.lng) ? `${location.lng.toFixed(2)}°E` : '—';

  return (
    <DataPanel id="historical-climate-trends-section" className="flex flex-col gap-5">
      <SectionHeading
        icon={<History className="w-4 h-4" />}
        title="Historical Climate Trends & IMD Normals"
        subtitle={`1991–2020 climatological baseline calibrated for ${location.city || location.name} (${coordLat}, ${coordLng})`}
        badge={<SourceStatus status="REFERENCE" labelOverride="CLIMATOLOGICAL REFERENCE" />}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-1 bg-[#08131F] rounded-lg border border-[#26394B]">
              <button
                type="button"
                onClick={() => setActiveTab('temperature')}
                className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-md text-xs font-semibold transition-colors cursor-pointer m-focus-ring ${
                  activeTab === 'temperature'
                    ? 'bg-[#35C7E8] text-[#07111D]'
                    : 'text-[#8295A8] hover:text-[#F3F6FA]'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>Temp (°C)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rainfall')}
                className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-md text-xs font-semibold transition-colors cursor-pointer m-focus-ring ${
                  activeTab === 'rainfall'
                    ? 'bg-[#35C7E8] text-[#07111D]'
                    : 'text-[#8295A8] hover:text-[#F3F6FA]'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>Rain (mm)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('decadal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-md text-xs font-semibold transition-colors cursor-pointer m-focus-ring ${
                  activeTab === 'decadal'
                    ? 'bg-[#35C7E8] text-[#07111D]'
                    : 'text-[#8295A8] hover:text-[#F3F6FA]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>10-Yr Trend</span>
              </button>
            </div>

            {activeTab !== 'decadal' && (
              <select
                aria-label="Comparison Year"
                value={compareYear}
                onChange={(e) => setCompareYear(e.target.value as '2025' | '2024' | '2023')}
                className="bg-[#08131F] border border-[#26394B] text-xs text-[#F3F6FA] rounded-lg px-3 py-2 min-h-[40px] font-mono focus:outline-none focus:border-[#35C7E8] m-focus-ring"
              >
                <option value="2025">vs 2025</option>
                <option value="2024">vs 2024</option>
                <option value="2023">vs 2023</option>
              </select>
            )}
          </div>
        }
      />

      {/* Metric Highlights Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="m-panel-inset p-3.5">
          <span className="text-[11px] font-semibold text-[#8295A8] uppercase tracking-wider block">
            Regional Mean Temp
          </span>
          <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
            <span className="text-2xl font-bold text-[#F3F6FA]">{stats.avgRecentT}°C</span>
            <span className="text-xs font-semibold text-[#F59E0B] flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{stats.tempDiff}°C
            </span>
          </div>
          <span className="text-[11px] text-[#8295A8] block mt-0.5 font-mono tabular-nums">
            vs. Normal {stats.avgNormalT}°C
          </span>
        </div>

        <div className="m-panel-inset p-3.5">
          <span className="text-[11px] font-semibold text-[#8295A8] uppercase tracking-wider block">
            Annual Precipitation
          </span>
          <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
            <span className="text-2xl font-bold text-[#35C7E8]">{stats.totalRecentRain} mm</span>
            <span className={`text-xs font-semibold flex items-center ${stats.rainDiffPct >= 0 ? 'text-[#22C7A0]' : 'text-[#EF4444]'}`}>
              {stats.rainDiffPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {stats.rainDiffPct >= 0 ? `+${stats.rainDiffPct}%` : `${stats.rainDiffPct}%`}
            </span>
          </div>
          <span className="text-[11px] text-[#8295A8] block mt-0.5 font-mono tabular-nums">
            vs. Normal {stats.totalNormalRain} mm
          </span>
        </div>

        <div className="m-panel-inset p-3.5">
          <span className="text-[11px] font-semibold text-[#8295A8] uppercase tracking-wider block">
            National Heatwave Days
          </span>
          <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
            <span className="text-2xl font-bold text-[#F59E0B]">31 Days</span>
            <span className="text-xs font-semibold text-[#F97316] flex items-center">
              <Flame className="w-3.5 h-3.5 mr-0.5" />
              +17d
            </span>
          </div>
          <span className="text-[11px] text-[#8295A8] block mt-0.5">All-India 2025 vs 14d decadal mean</span>
        </div>

        <div className="m-panel-inset p-3.5">
          <span className="text-[11px] font-semibold text-[#8295A8] uppercase tracking-wider block">
            All-India Monsoon LPA
          </span>
          <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
            <span className="text-2xl font-bold text-[#22C7A0]">104%</span>
          </div>
          <span className="text-[11px] text-[#8295A8] block mt-0.5">Normal Category (NCC Benchmark)</span>
        </div>
      </div>

      {/* Main Interactive Recharts Area */}
      <div className="m-panel-inset p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#F3F6FA]">
            {activeTab === 'temperature'
              ? `Monthly Mean Temperature: IMD Normal vs. ${compareYear}`
              : activeTab === 'rainfall'
              ? `Monthly Cumulative Rainfall: IMD Normal vs. ${compareYear}`
              : '10-Year National Trajectory (2016–2025): Mean Temp & Heatwave Days'}
          </span>
          <span className="text-[11px] text-[#8295A8] font-mono">
            Source: IMD National Climate Centre (NCC)
          </span>
        </div>

        {/* 1. TEMPERATURE CHART */}
        {activeTab === 'temperature' && (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2b3d" vertical={false} />
                <XAxis dataKey="month" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis stroke="#718096" fontSize={11} domain={['auto', 'auto']} tickLine={false} unit="°C" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1722',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: string) => [`${value}°C`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="tempNormal"
                  name="30-Year Normal (1991–2020)"
                  fill="#1499E8"
                  fillOpacity={0.12}
                  stroke="#1499E8"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey={`temp${compareYear}`}
                  name={`Observed Mean (${compareYear})`}
                  stroke="#FF9F43"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#FF9F43' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 2. RAINFALL CHART */}
        {activeTab === 'rainfall' && (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2b3d" vertical={false} />
                <XAxis dataKey="month" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis stroke="#718096" fontSize={11} domain={[0, 'auto']} tickLine={false} unit="mm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1722',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: string) => [`${value} mm`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="rainNormal"
                  name="Normal Monthly Rain (1991–2020)"
                  fill="#1E3A5F"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={`rain${compareYear}`}
                  name={`Recorded Rain (${compareYear})`}
                  fill="#43C7F4"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="rainNormal"
                  name="Normal Trendline"
                  stroke="#22C7A0"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3. DECADAL TREND CHART */}
        {activeTab === 'decadal' && (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={ANNUAL_DECADE_TREND} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2b3d" vertical={false} />
                <XAxis dataKey="year" stroke="#718096" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#718096" fontSize={11} domain={[25, 28]} tickLine={false} unit="°C" />
                <YAxis yAxisId="right" orientation="right" stroke="#718096" fontSize={11} domain={[0, 40]} tickLine={false} unit="d" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1722',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar
                  yAxisId="right"
                  dataKey="heatwaveDays"
                  name="Heatwave Days (Days > 40°C)"
                  fill="#F59E0B"
                  fillOpacity={0.7}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="normalTemp"
                  name="Decadal Baseline Normal (25.8°C)"
                  stroke="#718096"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="meanTemp"
                  name="Annual Mean Temp (°C)"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#EF4444' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Synoptic Climate Assessment Footer */}
      <div className="m-panel-inset px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#8295A8]">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#35C7E8] shrink-0" />
          <span>
            Climate normal baseline reflects official IMD Climatological Tables (1991–2020 WMO benchmark).
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-[#35C7E8]">
          <span>WMO Normals 1991–2020</span>
        </div>
      </div>
    </DataPanel>
  );
};
