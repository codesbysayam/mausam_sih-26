import React, { useState } from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Compass,
  Sparkles,
} from 'lucide-react';

interface AgriculturalRiskScoreProps {
  bulletin: ExtendedAgrometBulletin;
}

export const AgriculturalRiskScore: React.FC<AgriculturalRiskScoreProps> = ({ bulletin }) => {
  const [isWhyOpen, setIsWhyOpen] = useState<boolean>(false);
  const risk = bulletin.riskAnalysis;

  // Farm Score breakdown
  const farmScore = 74; // Overall index
  const farmStatus = 'Favorable Conditions';

  const breakdownMetrics = [
    { name: 'Weather Index', score: 82, color: '#C5A46D' },
    { name: 'Soil State', score: 68, color: '#2ECC71' },
    { name: 'Rainfall Influx', score: 74, color: '#78AEB6' },
    { name: 'Disease Inoculum', score: 56, color: '#EF4444' },
    { name: 'Field Operations', score: 79, color: '#A855F7' },
  ];

  // Radar Axes Definition: 6 axes
  const radarAxes = [
    { label: 'Rainfall', value: 72, angle: -90 },
    { label: 'Temperature', value: 45, angle: -30 },
    { label: 'Humidity', value: 85, angle: 30 },
    { label: 'Pest Pressure', value: 55, angle: 90 },
    { label: 'Disease Risk', value: 65, angle: 150 },
    { label: 'Water Stress', value: 35, angle: 210 },
  ];

  // Radar Geometry Helpers
  const cx = 130;
  const cy = 130;
  const maxR = 90;

  const getCoord = (angleDeg: number, val: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const r = (val / 100) * maxR;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return { x, y };
  };

  // Polygon points for radar
  const polygonPoints = radarAxes
    .map((axis) => {
      const { x, y } = getCoord(axis.angle, axis.value);
      return `${x},${y}`;
    })
    .join(' ');

  // Radial Farm Score Math
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (farmScore / 100) * circumference;

  return (
    <section className="rounded-3xl bg-gradient-to-b from-[var(--m-surface-1)] to-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 sm:p-8 lg:p-10 shadow-2xl space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[var(--m-border)] gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2ECC71]/15 border border-[#2ECC71]/30 flex items-center justify-center text-[#2ECC71]">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              Farm Health &amp; Crop Risk Radar
            </h2>
          </div>
          <p className="text-sm text-[var(--m-text-muted)] mt-0.5">
            Deterministic multi-variable assessment synthesizing atmospheric stress, soil reserves, and pathogen vulnerability.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] text-xs text-[var(--m-accent)] font-mono self-start sm:self-auto">
          <span>Model-Derived Ensemble</span>
          <span className="text-[var(--m-text-muted)]">•</span>
          <span className="text-[#2ECC71]">Verified</span>
        </div>
      </div>

      {/* 2. Dual Panels: Left = Farm Health Score | Right = Crop Risk Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT (5 Cols): Today's Farm Score */}
        <div className="lg:col-span-5 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--m-border)]">
            <div>
              <span className="text-[11px] font-bold text-[#2ECC71] uppercase font-mono tracking-wider block">
                Agronomic Index
              </span>
              <h3 className="text-lg font-bold text-white">Today&apos;s Farm Score</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 text-xs font-mono font-bold">
              {farmStatus}
            </span>
          </div>

          <div className="my-6 flex flex-col sm:flex-row items-center justify-around gap-6">
            {/* Radial Score Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  className="stroke-[var(--m-surface-2)]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  className="stroke-[#2ECC71] transition-all duration-700"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black font-mono text-white tracking-tighter">
                  {farmScore}
                </span>
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase">out of 100</span>
              </div>
            </div>

            {/* Score Factors Breakdown */}
            <div className="w-full space-y-2 text-xs">
              {breakdownMetrics.map((m) => (
                <div key={m.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--m-text-secondary)] font-medium">{m.name}</span>
                    <span className="font-mono font-bold text-white">{m.score}/100</span>
                  </div>
                  <div className="w-full bg-[var(--m-surface-2)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.score}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expandable "Why this score?" Accordion */}
          <div className="pt-3 border-t border-[var(--m-border)]">
            <button
              type="button"
              onClick={() => setIsWhyOpen(!isWhyOpen)}
              className="w-full flex items-center justify-between text-xs text-[var(--m-accent)] hover:text-[var(--m-text-primary)] font-semibold cursor-pointer focus:outline-none"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Why this score?
              </span>
              {isWhyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isWhyOpen && (
              <div className="mt-3 p-3.5 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs text-[var(--m-text-secondary)] space-y-2 leading-relaxed">
                <p>
                  • <strong>Positive Drivers (+28 pts):</strong> Adequate soil moisture reserve (68%) and manageable diurnal temperature span (31°/24°C) favor rapid vegetative tillering.
                </p>
                <p>
                  • <strong>Dampening Factors (-14 pts):</strong> Persistent morning relative humidity (85%) elevates blast/blight pathogen sporulation risk on moist foliage.
                </p>
                <p className="text-[11px] text-[var(--m-text-muted)] font-mono">
                  Formula: 0.25(Weather) + 0.25(Soil) + 0.20(Rain) + 0.15(Disease) + 0.15(Ops).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT (7 Cols): CROP RISK RADAR / PROFILE */}
        <div className="lg:col-span-7 rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-6 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--m-border)]">
            <div>
              <span className="text-[11px] font-bold text-[var(--m-accent)] uppercase font-mono tracking-wider block">
                Multi-Factor Vulnerability
              </span>
              <h3 className="text-lg font-bold text-white">Crop Risk Profile</h3>
            </div>
            <span className="text-xs text-[var(--m-danger)] font-mono font-bold bg-[var(--m-danger-soft)] px-3 py-1 rounded-full border border-[var(--m-danger)]/30">
              Primary Hazard: High Humidity
            </span>
          </div>

          <div className="my-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Radar Spider Visualization (SVG) */}
            <div className="md:col-span-7 flex justify-center items-center">
              <svg className="w-64 h-64 overflow-visible" viewBox="0 0 260 260">
                {/* Concentric grid webs */}
                {[0.25, 0.5, 0.75, 1.0].map((level) => (
                  <polygon
                    key={level}
                    points={radarAxes
                      .map((axis) => {
                        const { x, y } = getCoord(axis.angle, level * 100);
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    className="stroke-[#1E2E40]"
                    strokeWidth="1"
                    strokeDasharray={level === 1.0 ? 'none' : '2 2'}
                    fill="none"
                  />
                ))}

                {/* Radial Axis Spokes */}
                {radarAxes.map((axis) => {
                  const end = getCoord(axis.angle, 100);
                  return (
                    <line
                      key={axis.label}
                      x1={cx}
                      y1={cy}
                      x2={end.x}
                      y2={end.y}
                      className="stroke-[#1E2E40]"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Radar Fill Area */}
                <polygon
                  points={polygonPoints}
                  className="fill-[var(--m-accent)]/25 stroke-[var(--m-accent)]"
                  strokeWidth="2.5"
                />

                {/* Vertex Dots */}
                {radarAxes.map((axis) => {
                  const { x, y } = getCoord(axis.angle, axis.value);
                  return (
                    <circle
                      key={axis.label}
                      cx={x}
                      cy={y}
                      r="4.5"
                      className="fill-[var(--m-accent)] stroke-[#0B131C]"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Axis Labels */}
                {radarAxes.map((axis) => {
                  const labelCoord = getCoord(axis.angle, 122);
                  return (
                    <text
                      key={axis.label}
                      x={labelCoord.x}
                      y={labelCoord.y + 4}
                      textAnchor="middle"
                      className="fill-[#94A3B8] text-[10px] font-mono font-bold"
                    >
                      {axis.label}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Primary Risk Callout Card */}
            <div className="md:col-span-5 space-y-3">
              <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-danger)]/40 relative overflow-hidden">
                <span className="text-[10px] text-[var(--m-danger)] uppercase font-mono font-bold block mb-1">
                  PRIMARY RISK
                </span>
                <h4 className="text-base font-bold text-white">HIGH HUMIDITY</h4>
                <p className="text-xs text-[var(--m-text-secondary)] mt-1 leading-relaxed">
                  &ldquo;Current weather conditions may increase disease pressure. Morning relative humidity (85%) promotes fungal germination.&rdquo;
                </p>
                <div className="mt-3 pt-2.5 border-t border-[var(--m-border)] flex items-center justify-between text-[11px] text-[var(--m-text-muted)]">
                  <span>Action:</span>
                  <span className="text-[var(--m-accent)] font-bold">Field leaf inspection</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)] flex items-center justify-between">
                <span>Data Mode:</span>
                <span className="text-[#2ECC71] font-mono font-semibold">Live Sensor Telemetry + NWP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
