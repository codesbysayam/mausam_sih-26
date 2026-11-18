import React, { useState } from 'react';
import { MeteorologicalPublication } from '../../data/reportsAndArticles';
import {
  X,
  Printer,
  Download,
  FileText,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';
import { getCategoryTheme, estimateReadingTime } from './reportUtils';

interface ReportPreviewDrawerProps {
  publication: MeteorologicalPublication | null;
  isOpen: boolean;
  onClose: () => void;
  onBookmark: (id: string) => void;
  isSaved: boolean;
}

export const ReportPreviewDrawer: React.FC<ReportPreviewDrawerProps> = ({
  publication,
  isOpen,
  onClose,
  onBookmark,
  isSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'abstract' | 'data' | 'advisory'>('content');
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen || !publication) return null;

  const theme = getCategoryTheme(publication);
  const readingTime = estimateReadingTime(publication);

  const buildPrintableDocumentHtml = () => `<!DOCTYPE html>
<html>
  <head>
    <title>${publication.title} - Official Meteorological Report</title>
    <style>
      @page { size: A4 portrait; margin: 20mm; }
      body {
        font-family: "Times New Roman", Times, Georgia, serif;
        color: #111;
        background: #FFF;
        line-height: 1.5;
        font-size: 13px;
        margin: 0;
        padding: 20px;
      }
      .gov-header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 12px;
        margin-bottom: 16px;
      }
      .gov-emblem {
        font-size: 15px;
        font-weight: bold;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .gov-sub {
        font-size: 13px;
        color: #333;
      }
      .doc-title {
        font-size: 18px;
        font-weight: bold;
        margin: 14px 0 6px 0;
        text-align: center;
        text-transform: uppercase;
      }
      .meta-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
        font-size: 12px;
      }
      .meta-table td {
        padding: 4px 8px;
        border: 1px solid #999;
      }
      .meta-table td.label {
        font-weight: bold;
        background-color: #F3F4F6;
        width: 25%;
      }
      .section-heading {
        font-size: 14px;
        font-weight: bold;
        border-bottom: 1px solid #333;
        padding-bottom: 3px;
        margin-top: 18px;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      p { margin: 6px 0 10px 0; text-align: justify; }
      .table-custom {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 11px;
      }
      .table-custom th, .table-custom td {
        border: 1px solid #333;
        padding: 6px 8px;
        text-align: left;
      }
      .table-custom th {
        background: #E5E7EB;
        font-weight: bold;
      }
      .signature-block {
        margin-top: 30px;
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        border-top: 1px dashed #777;
        padding-top: 12px;
      }
      .official-stamp {
        display: inline-block;
        border: 2px solid #002B49;
        color: #002B49;
        font-weight: bold;
        padding: 4px 10px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    </style>
  </head>
  <body>
    <div class="gov-header">
      <div class="gov-emblem">Government of India</div>
      <div class="gov-sub">Ministry of Earth Sciences</div>
      <div class="gov-sub" style="font-weight: bold;">India Meteorological Department</div>
      <div class="gov-sub">${publication.issuingAuthority}</div>
    </div>

    <div class="doc-title">${publication.title}</div>

    <table class="meta-table">
      <tr>
        <td class="label">Document Ref. No.:</td>
        <td><strong>${publication.documentNumber}</strong></td>
        <td class="label">Date of Issue:</td>
        <td><strong>${publication.date}</strong></td>
      </tr>
      <tr>
        <td class="label">Classification:</td>
        <td>Official Public Publication / Monograph</td>
        <td class="label">Author / Division:</td>
        <td>${publication.author}</td>
      </tr>
      <tr>
        <td class="label">Category:</td>
        <td>${publication.category}</td>
        <td class="label">Status:</td>
        <td>Verified Institutional Monograph</td>
      </tr>
    </table>

    <div class="section-heading">Executive Synoptic Abstract</div>
    <p><em>${publication.abstract}</em></p>

    ${publication.synopticSummary ? `
      <div class="section-heading">Synoptic Meteorology &amp; Boundary Conditions</div>
      <p>${publication.synopticSummary}</p>
    ` : ''}

    ${publication.sections.map(sec => `
      <div class="section-heading">${sec.title}</div>
      <p>${sec.content}</p>
      ${sec.tableData ? `
        <table class="table-custom">
          <thead>
            <tr>
              ${sec.tableData.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sec.tableData.rows.map(row => `
              <tr>
                ${row.map(c => `<td>${c}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    `).join('')}

    ${publication.recommendations && publication.recommendations.length > 0 ? `
      <div class="section-heading">Operational Advisory &amp; Action Directives</div>
      <ul style="padding-left: 20px;">
        ${publication.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    ` : ''}

    <div class="signature-block">
      <div>
        <div class="official-stamp">MAUSAM ARCHIVE RECORD</div>
        <div style="margin-top: 4px; color: #555;">Issued for Meteorological Reference</div>
      </div>
      <div style="text-align: right;">
        <strong>Directorate of Meteorology</strong><br/>
        ${publication.issuingAuthority}
      </div>
    </div>
  </body>
</html>`;

  const handlePrint = () => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && iframe.contentWindow) {
        doc.open();
        doc.write(buildPrintableDocumentHtml());
        doc.close();
        iframe.contentWindow.focus();
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch {
            window.print();
          } finally {
            setTimeout(() => {
              iframe.remove();
            }, 1500);
          }
        }, 250);
      } else {
        iframe.remove();
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleDownloadHTML = () => {
    const htmlContent = buildPrintableDocumentHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${publication.id}-official-report.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotice('Official HTML report downloaded.');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleCopyCitation = () => {
    const citation = `India Meteorological Department (${publication.date.slice(-4)}). "${publication.title}". ${publication.issuingAuthority}, Government of India. Doc Ref: ${publication.documentNumber}.`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(citation)
        .then(() => {
          setCopiedCitation(true);
          setTimeout(() => setCopiedCitation(false), 2500);
        })
        .catch(() => {});
    }
  };

  return (
    <div
      id="report-preview-drawer"
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={publication.title}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-4xl h-full bg-[#07111D] border-l border-[#26394B] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-[#08131F] border-b border-[#26394B] flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
              >
                {theme.label}
              </span>
              <span className="text-xs font-mono text-[#8295A8] tabular-nums">
                REF: {publication.documentNumber}
              </span>
              <span className="text-xs font-mono text-[#B5C3D1] tabular-nums">
                · {readingTime}
              </span>
            </div>

            <h2 className="text-base sm:text-xl font-bold text-[#F3F6FA] leading-snug">
              {publication.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg bg-[#0B1927] border border-[#26394B] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] transition-colors cursor-pointer shrink-0 m-focus-ring"
            title="Close reader"
            aria-label="Close reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Quick Action Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#0B1927] border-b border-[#26394B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(
              [
                { id: 'content', label: 'Full Monograph' },
                { id: 'abstract', label: 'Abstract & Summary' },
                { id: 'data', label: 'Observation Tables' },
                { id: 'advisory', label: 'Directives' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer shrink-0 m-focus-ring ${
                  activeTab === tab.id
                    ? 'bg-[#35C7E8] text-[#07111D]'
                    : 'text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0B72B9] hover:bg-[#35C7E8] text-white hover:text-[#07111D] text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring"
              title="Print official report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] hover:border-[#38536A] text-xs font-mono text-[#B5C3D1] hover:text-[#F3F6FA] transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring"
              title="Download HTML"
            >
              <Download className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCitation}
              className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] hover:border-[#38536A] text-xs font-mono text-[#B5C3D1] hover:text-[#F3F6FA] transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring"
              title="Copy academic citation"
            >
              <FileText className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>{copiedCitation ? 'Copied' : 'Cite'}</span>
            </button>

            <button
              type="button"
              onClick={() => onBookmark(publication.id)}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer m-focus-ring ${
                isSaved
                  ? 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/40'
                  : 'bg-[#08131F] text-[#B5C3D1] hover:text-[#F3F6FA] border-[#26394B] hover:border-[#38536A]'
              }`}
              title="Bookmark Report"
              aria-label="Bookmark Report"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#F59E0B]' : ''}`} />
            </button>
          </div>
        </div>

        {notice && (
          <div className="bg-[#22C7A0]/12 text-[#6EE7B7] px-5 py-2 text-xs font-mono border-b border-[#22C7A0]/30 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Scrollable Reader Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm text-[#B5C3D1]">
          <div className="m-panel-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-[#35C7E8] uppercase font-bold text-[10px] tracking-wider block">
                Issuing Meteorological Authority
              </span>
              <strong className="text-[#F3F6FA] text-sm block mt-0.5 font-sans">
                {publication.issuingAuthority}
              </strong>
              <div className="text-[#8295A8] mt-0.5">
                Lead Analyst / Directorate:{' '}
                <span className="text-[#F3F6FA]">{publication.author}</span>
              </div>
            </div>

            <div className="flex sm:flex-col sm:items-end gap-1.5 text-xs tabular-nums">
              <span className="text-[#8295A8]">
                Date: <strong className="text-[#F3F6FA]">{publication.date}</strong>
              </span>
              <span className="text-[#35C7E8] font-mono text-[11px]">
                {publication.documentNumber}
              </span>
            </div>
          </div>

          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="m-panel p-4">
                <h4 className="text-xs font-mono font-bold uppercase text-[#35C7E8] tracking-wider mb-2">
                  Executive Abstract
                </h4>
                <p className="text-xs sm:text-sm text-[#F3F6FA] leading-relaxed">
                  {publication.abstract}
                </p>
              </div>

              {publication.synopticSummary && (
                <div className="m-panel p-4">
                  <h4 className="text-xs font-mono font-bold uppercase text-[#22C7A0] tracking-wider mb-2">
                    Synoptic Atmospheric Boundary Synopsis
                  </h4>
                  <p className="text-xs sm:text-sm text-[#F3F6FA] leading-relaxed">
                    {publication.synopticSummary}
                  </p>
                </div>
              )}

              {publication.sections.map((sec, idx) => (
                <div key={idx} className="m-panel p-4 sm:p-5 space-y-3">
                  <h4 className="text-base font-bold text-[#F3F6FA] border-b border-[#26394B] pb-2">
                    {sec.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#B5C3D1] leading-relaxed">
                    {sec.content}
                  </p>

                  {sec.tableData && (
                    <div className="mt-3 pt-2">
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
                          <thead>
                            <tr className="bg-[#08131F] border-b border-[#26394B] text-[#8295A8]">
                              {sec.tableData.headers.map((h, hi) => (
                                <th key={hi} className="p-2.5 font-bold whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.tableData.rows.map((row, ri) => (
                              <tr
                                key={ri}
                                className="border-b border-[#26394B]/70 hover:bg-[#101F2E]"
                              >
                                {row.map((cell, ci) => (
                                  <td key={ci} className="p-2.5 text-[#F3F6FA]">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="sm:hidden flex flex-col gap-2.5">
                        {sec.tableData.rows.map((row, ri) => (
                          <div
                            key={ri}
                            className="p-3.5 rounded-lg bg-[#08131F] border border-[#26394B] flex flex-col gap-2 font-mono text-xs tabular-nums"
                          >
                            <div className="flex items-center justify-between border-b border-[#26394B] pb-1.5 gap-2">
                              <span className="text-[10px] font-bold text-[#35C7E8] uppercase tracking-wide shrink-0">
                                {sec.tableData!.headers[0] || 'Metric'}
                              </span>
                              <span className="font-bold text-[#F3F6FA] text-xs text-right">
                                {row[0]}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                              {row.slice(1).map((cell, ci) => {
                                const header = sec.tableData!.headers[ci + 1] || `Metric ${ci + 1}`;
                                return (
                                  <div key={ci} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-[#8295A8]">{header}:</span>
                                    <span className="font-semibold text-[#F3F6FA] text-right">{cell}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'abstract' && (
            <div className="space-y-4">
              <div className="m-panel p-5">
                <h4 className="text-xs font-mono font-bold uppercase text-[#35C7E8] mb-2">
                  Executive Scientific Summary
                </h4>
                <p className="text-sm leading-relaxed text-[#F3F6FA]">
                  {publication.abstract}
                </p>
              </div>

              {publication.synopticSummary && (
                <div className="m-panel p-5">
                  <h4 className="text-xs font-mono font-bold uppercase text-[#22C7A0] mb-2">
                    Atmospheric Flow Synopsis
                  </h4>
                  <p className="text-sm leading-relaxed text-[#F3F6FA]">
                    {publication.synopticSummary}
                  </p>
                </div>
              )}

              <div className="m-panel p-5">
                <h4 className="text-xs font-mono font-bold uppercase text-[#8295A8] mb-3">
                  Keywords &amp; Atmospheric Descriptors
                </h4>
                <div className="flex flex-wrap gap-2">
                  {publication.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-[#08131F] text-[#35C7E8] border border-[#26394B] text-xs font-mono"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              {publication.sections.filter((s) => s.tableData).length === 0 ? (
                <div className="p-8 text-center text-[#8295A8] m-panel font-mono text-xs">
                  No structured telemetry tables recorded in this monograph.
                </div>
              ) : (
                publication.sections
                  .filter((s) => s.tableData)
                  .map((sec, idx) => (
                    <div key={idx} className="m-panel p-5 space-y-3">
                      <h4 className="text-sm font-bold text-[#F3F6FA] font-mono">
                        {sec.title}
                      </h4>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
                          <thead>
                            <tr className="bg-[#08131F] border-b border-[#26394B] text-[#8295A8]">
                              {sec.tableData!.headers.map((h, hi) => (
                                <th key={hi} className="p-2.5 font-bold whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.tableData!.rows.map((row, ri) => (
                              <tr
                                key={ri}
                                className="border-b border-[#26394B]/70 hover:bg-[#101F2E]"
                              >
                                {row.map((cell, ci) => (
                                  <td key={ci} className="p-2.5 text-[#F3F6FA]">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="sm:hidden flex flex-col gap-2.5 mt-1">
                        {sec.tableData!.rows.map((row, ri) => (
                          <div
                            key={ri}
                            className="p-3.5 rounded-lg bg-[#08131F] border border-[#26394B] flex flex-col gap-2 font-mono text-xs tabular-nums"
                          >
                            <div className="flex items-center justify-between border-b border-[#26394B] pb-1.5 gap-2">
                              <span className="text-[10px] font-bold text-[#35C7E8] uppercase tracking-wide shrink-0">
                                {sec.tableData!.headers[0] || 'Metric'}
                              </span>
                              <span className="font-bold text-[#F3F6FA] text-xs text-right">
                                {row[0]}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                              {row.slice(1).map((cell, ci) => {
                                const header = sec.tableData!.headers[ci + 1] || `Metric ${ci + 1}`;
                                return (
                                  <div key={ci} className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-[#8295A8]">{header}:</span>
                                    <span className="font-semibold text-[#F3F6FA] text-right">{cell}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {activeTab === 'advisory' && (
            <div className="space-y-4">
              {publication.recommendations && publication.recommendations.length > 0 ? (
                <div className="m-panel p-5 space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase text-[#F59E0B] tracking-wider">
                    Operational Actions &amp; Public Directives
                  </h4>
                  <ul className="space-y-2.5">
                    {publication.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-[#F3F6FA]">
                        <span className="text-[#35C7E8] font-mono font-bold tabular-nums">{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-8 text-center text-[#8295A8] m-panel font-mono text-xs">
                  No operational advisories attached to this research monograph.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Verification Footer */}
        <div className="p-4 bg-[#08131F] border-t border-[#26394B] flex items-center justify-between text-xs font-mono text-[#8295A8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C7A0]" />
            <span>MAUSAM Verified Open Research Document</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0B1927] hover:bg-[#101F2E] border border-[#26394B] text-[#F3F6FA] transition-colors cursor-pointer m-focus-ring"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
};
