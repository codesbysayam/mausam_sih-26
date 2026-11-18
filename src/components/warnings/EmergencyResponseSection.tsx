import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  CloudCog,
  Globe2,
  Phone,
  Search,
  ShieldAlert,
  Siren,
} from 'lucide-react';
import { LocationRecord } from '../../types';
import { STATE_DISASTER_NUMBERS } from '../../data/nationalWarningsData';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface EmergencyResponseSectionProps {
  selectedLocation?: LocationRecord;
}

export const EmergencyResponseSection: React.FC<EmergencyResponseSectionProps> = () => {
  const [stateSearch, setStateSearch] = useState('');
  const [isStateDirectoryExpanded, setIsStateDirectoryExpanded] = useState(false);

  const nationalHelplines = [
    {
      id: 'national-112',
      badge: 'Unified 24x7',
      name: 'National Emergency Helpline',
      number: '112',
      telLink: 'tel:112',
      agency: 'Ministry of Home Affairs (MHA)',
      desc: 'All-India unified emergency response for Police, Fire, Ambulance & Marine rescue.',
      Icon: Siren,
      accentColor: 'text-[#FCA5A5]',
      btnBg: 'bg-[#EF4444] hover:bg-[#DC2626] text-white',
    },
    {
      id: 'ndma-1078',
      badge: 'National Control',
      name: 'Disaster Management (NDMA)',
      number: '1078',
      secondary: '011-26701728',
      telLink: 'tel:1078',
      agency: 'NDMA Central Command Centre',
      desc: 'National Disaster Management Authority 24x7 Control Room & Incident Coordination.',
      Icon: ShieldAlert,
      accentColor: 'text-[#FDBA74]',
      btnBg: 'bg-[#F97316] hover:bg-[#EA580C] text-white',
    },
    {
      id: 'state-1070',
      badge: 'Relief Commissioner',
      name: 'State Relief Commissioner / SDMA',
      number: '1070',
      secondary: 'Toll-Free in all States',
      telLink: 'tel:1070',
      agency: 'State Emergency Operations Centre',
      desc: 'State Disaster Management Authority 24x7 Emergency Operations Command.',
      Icon: AlertTriangle,
      accentColor: 'text-[#35C7E8]',
      btnBg: 'bg-[#0B72B9] hover:bg-[#095C96] text-white',
    },
    {
      id: 'imd-1800',
      badge: 'Toll-Free (IMD)',
      name: 'IMD Weather Information Helpline',
      number: '1800-180-1717',
      secondary: '011-24631913',
      telLink: 'tel:18001801717',
      agency: 'India Meteorological Department',
      desc: 'Official meteorological bulletins, synoptic radar updates & cyclone inquiries.',
      Icon: CloudCog,
      accentColor: 'text-[#6EE7B7]',
      btnBg: 'bg-[#22C7A0] hover:bg-[#1BA885] text-[#07111D]',
    },
  ];

  const stateNumbersList = useMemo(() => {
    return Object.entries(STATE_DISASTER_NUMBERS).map(([code, data]) => ({
      code,
      stateName: data.stateName,
      number: data.number,
      directTel: data.directTel,
      agency: data.agency,
    }));
  }, []);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return stateNumbersList;
    const q = stateSearch.toLowerCase().trim();
    return stateNumbersList.filter(
      (s) =>
        s.stateName.toLowerCase().includes(q) ||
        s.agency.toLowerCase().includes(q) ||
        s.number.includes(q)
    );
  }, [stateNumbersList, stateSearch]);

  return (
    <DataPanel
      id="emergency-disaster-response-section"
      className="flex flex-col gap-4"
    >
      <SectionHeading
        title="Emergency & Disaster Response Directory"
        subtitle="Official 24x7 command helplines for public safety & civil defense"
        icon={<Phone className="w-4 h-4" />}
        badge={<SourceStatus status="REFERENCE" labelOverride="Verified Lines" />}
      />

      <div>
        <div className="text-xs font-mono font-bold text-[#B5C3D1] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5 text-[#35C7E8]" />
          <span>National Emergency Command Lines</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {nationalHelplines.map((item) => {
            const Icon = item.Icon;
            return (
              <div
                key={item.id}
                id={`helpline-card-${item.id}`}
                className="bg-[#08131F] border border-[#26394B] rounded-xl p-4 flex flex-col justify-between gap-2.5 hover:border-[#38536A] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-[#8295A8] uppercase tracking-wider">
                      {item.badge}
                    </span>
                    <Icon className={`w-4 h-4 ${item.accentColor}`} />
                  </div>

                  <h4 className="text-xs font-bold text-[#F3F6FA] leading-tight">
                    {item.name}
                  </h4>

                  <div className="text-lg font-bold font-mono tabular-nums text-[#F3F6FA] mt-1">
                    {item.number}
                  </div>
                  {item.secondary && (
                    <div className="text-[10px] text-[#8295A8] font-mono tabular-nums">
                      {item.secondary}
                    </div>
                  )}

                  <p className="text-[11px] text-[#B5C3D1] mt-1.5 leading-snug">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#26394B] flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#8295A8] truncate max-w-[130px]">
                    {item.agency}
                  </span>

                  <a
                    href={item.telLink}
                    className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${item.btnBg}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-[#26394B]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-xs font-mono font-bold text-[#F3F6FA] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>State Disaster Management Directory (SDMA / SEOC)</span>
            </div>
            <p className="text-[11px] text-[#8295A8] mt-0.5">
              Direct emergency operations numbers across Indian States &amp; Union Territories
            </p>
          </div>

          <button
            id="btn-toggle-state-directory"
            type="button"
            onClick={() => setIsStateDirectoryExpanded((p) => !p)}
            className="self-start sm:self-auto px-3 py-2 min-h-[38px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{isStateDirectoryExpanded ? 'Collapse Directory' : 'Expand All States'}</span>
            {isStateDirectoryExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#35C7E8]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#35C7E8]" />
            )}
          </button>
        </div>

        {isStateDirectoryExpanded && (
          <div className="space-y-3 pt-1">
            <div className="relative max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8295A8]" />
              <input
                id="input-state-directory-search"
                type="text"
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                placeholder="Search state emergency number or agency..."
                className="w-full min-h-[38px] pl-9 pr-3 py-1.5 bg-[#08131F] border border-[#26394B] rounded-lg text-xs text-[#F3F6FA] placeholder-[#8295A8] focus:outline-none focus:border-[#35C7E8]"
              />
            </div>

            <div className="overflow-x-auto border border-[#26394B] rounded-lg bg-[#08131F] max-h-[340px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0B1927] z-10 border-b border-[#26394B] text-[#8295A8] uppercase tracking-wider text-[10px] font-mono font-bold">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-[#26394B]">State / UT</th>
                    <th className="py-2.5 px-3 border-r border-[#26394B]">Helpline / Direct Line</th>
                    <th className="py-2.5 px-3 border-r border-[#26394B]">Nodal Agency</th>
                    <th className="py-2.5 px-3 text-right">Call</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26394B] text-[#B5C3D1]">
                  {filteredStates.map((st) => (
                    <tr key={st.code} className="hover:bg-[#101F2E]/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#F3F6FA] border-r border-[#26394B]">
                        {st.stateName}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-[#F3F6FA] border-r border-[#26394B]">
                        {st.number}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#8295A8] border-r border-[#26394B]">
                        {st.agency}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={`tel:${st.directTel}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B1927] hover:bg-[#0B72B9] text-[#F3F6FA] border border-[#26394B] text-[11px] font-mono font-bold transition-colors cursor-pointer"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{st.directTel}</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DataPanel>
  );
};
