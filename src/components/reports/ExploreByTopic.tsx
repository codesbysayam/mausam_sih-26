import React from 'react';
import {
  CloudRain,
  Flame,
  Radio,
  Satellite,
  Wind,
  Sprout,
  Cpu,
  ShieldAlert,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface ExploreByTopicProps {
  publications: MeteorologicalPublication[];
  onSelectTopic: (topicQuery: string) => void;
  activeQuery: string;
}

interface TopicDefinition {
  id: string;
  title: string;
  query: string;
  icon: React.ElementType;
  description: string;
  accentColor: string;
}

export const ExploreByTopic: React.FC<ExploreByTopicProps> = ({
  publications,
  onSelectTopic,
  activeQuery,
}) => {
  const topics: TopicDefinition[] = [
    {
      id: 'monsoon',
      title: 'MONSOON & CIRCULATION',
      query: 'monsoon',
      icon: CloudRain,
      description: 'Seasonal rainfall, synoptic troughs, ENSO teleconnections & MJO variability.',
      accentColor: '#35C7E8',
    },
    {
      id: 'climatology',
      title: 'CLIMATE & URBAN HEAT',
      query: 'climatological',
      icon: Flame,
      description: 'Urban Heat Island (UHI), thermal anomalies & 30-year climate baselines.',
      accentColor: '#F59E0B',
    },
    {
      id: 'radar',
      title: 'RADAR & NOWCASTING',
      query: 'radar',
      icon: Radio,
      description: 'Dual-polarization DWR, TITAN convective tracking & microburst warnings.',
      accentColor: '#35C7E8',
    },
    {
      id: 'satellite',
      title: 'SATELLITE METEOROLOGY',
      query: 'satellite',
      icon: Satellite,
      description: 'INSAT-3D/3DR radiometry, MOSDAC ocean winds & cloud-top thermal imaging.',
      accentColor: '#0B72B9',
    },
    {
      id: 'air-quality',
      title: 'AIR QUALITY & POLLEN',
      query: 'air quality',
      icon: Wind,
      description: 'NAQI ambient criteria pollutants, CAAQMS networks & bio-aeroallergens.',
      accentColor: '#22C7A0',
    },
    {
      id: 'agromet',
      title: 'AGROMETEOROLOGY',
      query: 'agrometeorology',
      icon: Sprout,
      description: 'GKMS district farm advisories, Kharif crop protection & phenology matrices.',
      accentColor: '#22C7A0',
    },
    {
      id: 'nwp',
      title: 'NUMERICAL PREDICTION',
      query: 'ncmrwf',
      icon: Cpu,
      description: 'NCMRWF Unified Model (NCUM 12km), 4D-Var assimilation & NEPS ensembles.',
      accentColor: '#35C7E8',
    },
    {
      id: 'standards',
      title: 'OBSERVATION STANDARDS',
      query: 'wmo',
      icon: ShieldAlert,
      description: 'WMO-No. 8 sensor calibration traceability & NDMA color-coded alert matrix.',
      accentColor: '#F59E0B',
    },
  ];

  return (
    <DataPanel id="explore-by-topic-section" className="space-y-4">
      <SectionHeading
        title="Explore Meteorological Research by Topic"
        subtitle="Filter the institutional library by atmospheric domain or observation system"
        icon={<Compass className="w-4 h-4" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {topics.map((topic) => {
          const Icon = topic.icon;
          const count = publications.filter(
            (p) =>
              p.title.toLowerCase().includes(topic.query) ||
              p.abstract.toLowerCase().includes(topic.query) ||
              p.category.toLowerCase().includes(topic.query) ||
              p.keywords.some((k) => k.toLowerCase().includes(topic.query))
          ).length;

          const isMatching = activeQuery.toLowerCase() === topic.query.toLowerCase();

          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onSelectTopic(topic.query)}
              className={`text-left p-4 rounded-xl bg-[#08131F] border transition-colors cursor-pointer flex flex-col justify-between group m-focus-ring ${
                isMatching
                  ? 'border-[#35C7E8] bg-[#101F2E]'
                  : 'border-[#26394B] hover:border-[#38536A] hover:bg-[#101F2E]'
              }`}
            >
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center border"
                    style={{
                      backgroundColor: `${topic.accentColor}18`,
                      borderColor: `${topic.accentColor}40`,
                      color: topic.accentColor,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#0B1927] border border-[#26394B] text-[#B5C3D1] tabular-nums">
                    {count} {count === 1 ? 'pub' : 'pubs'}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[#F3F6FA] uppercase tracking-wider group-hover:text-[#35C7E8] transition-colors">
                  {topic.title}
                </h4>

                <p className="text-xs text-[#8295A8] mt-1.5 leading-relaxed">
                  {topic.description}
                </p>
              </div>

              <div className="w-full mt-3.5 pt-2.5 border-t border-[#26394B] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#8295A8]">Filter Library</span>
                <span
                  className="flex items-center gap-1 font-bold"
                  style={{ color: topic.accentColor }}
                >
                  <span>EXPLORE</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </DataPanel>
  );
};
