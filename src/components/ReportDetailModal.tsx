import React, { useState } from 'react';
import {
  AlignLeft,
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Orbit,
  Printer,
  X,
} from 'lucide-react';
import { MeteorologicalPublication } from '../data/reportsAndArticles';

interface ReportDetailModalProps {
  publication: MeteorologicalPublication | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  publication,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'abstract' | 'data' | 'advisory'>('content');
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  if (!isOpen || !publication) return null;

  const handlePrint = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${publication.title} - Government of India Official Report</title>
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
            .gov-sub { font-size: 13px; color: #333; }
            .doc-title {
              font-size: 18px;
              font-weight: bold;
              margin: 14px 0 6px 0;
              text-align: center;
              text-transform: uppercase;
            }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            .meta-table td { padding: 4px 8px; border: 1px solid #999; }
            .meta-table td.label { font-weight: bold; background-color: #F3F4F6; width: 25%; }
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
            .table-custom { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
            .table-custom th, .table-custom td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
            .table-custom th { background: #E5E7EB; font-weight: bold; }
            .rec-list { padding-left: 20px; margin: 6px 0; }
            .rec-list li { margin-bottom: 5px; }
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
            <div class="gov-emblem">भारत सरकार / Government of India</div>
            <div class="gov-sub">पृथ्वी विज्ञान मंत्रालय / Ministry of Earth Sciences</div>
            <div class="gov-sub" style="font-weight: bold;">भारत मौसम विज्ञान विभाग / India Meteorological Department</div>
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

          ${
            publication.synopticSummary
              ? `<div class="section-heading">Synoptic Meteorology &amp; Boundary Conditions</div><p>${publication.synopticSummary}</p>`
              : ''
          }

          ${publication.sections
            .map(
              (sec) => `
            <div class="section-heading">${sec.title}</div>
            <p>${sec.content}</p>
            ${
              sec.tableData
                ? `
              <table class="table-custom">
                <thead>
                  <tr>${sec.tableData.headers.map((h) => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${sec.tableData.rows
                    .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`)
                    .join('')}
                </tbody>
              </table>
            `
                : ''
            }
          `
            )
            .join('')}

          ${
            publication.recommendations && publication.recommendations.length > 0
              ? `
            <div class="section-heading">Operational Advisory &amp; Action Directives</div>
            <ul class="rec-list">
              ${publication.recommendations.map((r) => `<li>${r}</li>`).join('')}
            </ul>
          `
              : ''
          }

          <div class="signature-block">
            <div>
              <div class="official-stamp">MAUSAM OFFICIAL PUBLICATION VERIFIED</div>
              <div style="margin-top: 4px; color: #555;">Document Digitally Signed &amp; Authenticated</div>
            </div>
            <div style="text-align: right;">
              <strong>Director General of Meteorology</strong><br/>
              India Meteorological Department, New Delhi<br/>
              <em>National Weather Forecasting Centre</em>
            </div>
          </div>
        </body>
      </html>
    `;

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

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          } finally {
            setTimeout(() => {
              if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }, 1000);
          }
        }, 250);
      } else {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleDownloadHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${publication.title} - IMD Publication</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; line-height: 1.6; color: #202424; max-width: 900px; margin: 40px auto; padding: 0 24px; }
    .header { text-align: center; border-bottom: 2px solid #C5A46D; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { font-size: 20px; text-transform: uppercase; margin: 0; color: #C5A46D; }
    .header h2 { font-size: 15px; color: #898B83; margin: 4px 0 0 0; font-weight: normal; }
    .title-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .title-box h3 { margin: 0 0 10px 0; color: #111314; font-size: 20px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px; color: #898B83; }
    .meta-grid strong { color: #202424; }
    .section { margin-bottom: 24px; }
    .section h4 { font-size: 16px; color: #C5A46D; border-bottom: 1px solid #CBD5E1; padding-bottom: 6px; margin: 20px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #CBD5E1; padding: 8px 12px; text-align: left; }
    th { background: #F1F5F9; font-weight: bold; color: #2F3534; }
    tr:nth-child(even) { background: #F8FAFC; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Government of India • Ministry of Earth Sciences</h1>
    <h2>India Meteorological Department (IMD) • ${publication.issuingAuthority}</h2>
  </div>
  <div class="title-box">
    <h3>${publication.title}</h3>
    <div class="meta-grid">
      <div><strong>Document ID:</strong> ${publication.documentNumber}</div>
      <div><strong>Date:</strong> ${publication.date}</div>
      <div><strong>Category:</strong> ${publication.category}</div>
      <div><strong>Author:</strong> ${publication.author}</div>
    </div>
  </div>
  <div class="section">
    <h4>Executive Abstract</h4>
    <p>${publication.abstract}</p>
  </div>
  ${
    publication.synopticSummary
      ? `<div class="section"><h4>Synoptic Atmospheric Summary</h4><p>${publication.synopticSummary}</p></div>`
      : ''
  }
  ${publication.sections
    .map(
      (sec) => `
    <div class="section">
      <h4>${sec.title}</h4>
      <p>${sec.content}</p>
      ${
        sec.tableData
          ? `
        <table>
          <thead><tr>${sec.tableData.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${sec.tableData.rows
            .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`)
            .join('')}</tbody>
        </table>
      `
          : ''
      }
    </div>
  `
    )
    .join('')}
  ${
    publication.recommendations && publication.recommendations.length > 0
      ? `
    <div class="section">
      <h4>Operational Recommendations</h4>
      <ul>${publication.recommendations.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>
  `
      : ''
  }
  <div class="footer">
    <p>Official publication catalogued via MAUSAM National Meteorological Platform.</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${publication.id}-official-bulletin.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice('Official HTML Document downloaded successfully.');
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  const handleDownloadText = () => {
    let textDoc = `========================================================================\n`;
    textDoc += `GOVERNMENT OF INDIA - MINISTRY OF EARTH SCIENCES\n`;
    textDoc += `INDIA METEOROLOGICAL DEPARTMENT (IMD)\n`;
    textDoc += `${publication.issuingAuthority.toUpperCase()}\n`;
    textDoc += `========================================================================\n\n`;
    textDoc += `TITLE: ${publication.title}\n`;
    textDoc += `DOCUMENT NO: ${publication.documentNumber}\n`;
    textDoc += `DATE: ${publication.date}\n`;
    textDoc += `CATEGORY: ${publication.category}\n`;
    textDoc += `AUTHOR: ${publication.author}\n\n`;
    textDoc += `------------------------------------------------------------------------\n`;
    textDoc += `EXECUTIVE ABSTRACT:\n`;
    textDoc += `${publication.abstract}\n\n`;

    if (publication.synopticSummary) {
      textDoc += `------------------------------------------------------------------------\n`;
      textDoc += `SYNOPTIC SUMMARY:\n`;
      textDoc += `${publication.synopticSummary}\n\n`;
    }

    publication.sections.forEach((sec) => {
      textDoc += `------------------------------------------------------------------------\n`;
      textDoc += `${sec.title.toUpperCase()}\n`;
      textDoc += `${sec.content}\n\n`;
      if (sec.tableData) {
        textDoc += `TABLE DATA:\n`;
        textDoc += sec.tableData.headers.join(' | ') + '\n';
        textDoc += sec.tableData.headers.map(() => '-----------').join(' | ') + '\n';
        sec.tableData.rows.forEach((r) => {
          textDoc += r.join(' | ') + '\n';
        });
        textDoc += '\n';
      }
    });

    if (publication.recommendations && publication.recommendations.length > 0) {
      textDoc += `------------------------------------------------------------------------\n`;
      textDoc += `OPERATIONAL RECOMMENDATIONS:\n`;
      publication.recommendations.forEach((r, i) => {
        textDoc += `${i + 1}. ${r}\n`;
      });
      textDoc += '\n';
    }

    textDoc += `========================================================================\n`;
    textDoc += `END OF BULLETIN - MAUSAM ATMOSPHERIC INTELLIGENCE PLATFORM\n`;
    textDoc += `========================================================================\n`;

    const blob = new Blob([textDoc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${publication.id}-bulletin.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadNotice('Telegraphic Text Bulletin downloaded successfully.');
    setTimeout(() => setDownloadNotice(null), 3000);
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
      role="dialog"
      aria-modal="true"
      aria-label={publication.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-[var(--m-surface-inset)] px-5 py-4 border-b border-[var(--m-border)] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/35 flex items-center justify-center text-[var(--m-accent)] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/45 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                  {publication.type}
                </span>
                <span className="text-[11px] text-[var(--m-text-muted)] font-mono tabular-nums">
                  Ref: {publication.documentNumber}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--m-text-primary)] leading-snug mt-1">
                {publication.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close publication modal"
            className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] rounded-lg transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar (Tabs & Export) */}
        <div className="bg-[var(--m-surface-2)] px-5 py-2.5 border-b border-[var(--m-border)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'content', label: 'Full Monograph' },
                { id: 'abstract', label: 'Abstract & Summary' },
                { id: 'data', label: 'Observation Data Tables' },
                { id: 'advisory', label: 'Advisory & Directives' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 min-h-[40px] sm:min-h-[34px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[var(--m-accent)] text-[var(--m-text-primary)]'
                    : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[var(--m-accent)] hover:bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] text-xs font-semibold px-3 min-h-[40px] sm:min-h-[34px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print Official Document with Government Header"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bulletin</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              className="bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-accent)] border border-[var(--m-accent)]/35 text-xs font-semibold px-2.5 min-h-[40px] sm:min-h-[34px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download standalone HTML document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.HTML</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadText}
              className="bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] text-xs font-semibold px-2.5 min-h-[40px] sm:min-h-[34px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Download clean plain text bulletin"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>.TXT</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCitation}
              className="bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] text-xs font-semibold px-2.5 min-h-[40px] sm:min-h-[34px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy official academic citation"
            >
              {copiedCitation ? (
                <Check className="w-3.5 h-3.5 text-[var(--m-ok)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCitation ? 'Copied!' : 'Cite'}</span>
            </button>
          </div>
        </div>

        {downloadNotice && (
          <div className="bg-[var(--m-ok-soft)] border-b border-[var(--m-ok)]/35 text-[var(--m-ok)] px-5 py-2 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-sm text-[var(--m-text-secondary)] flex flex-col gap-5">
          {/* Official Issuance Banner */}
          <div className="bg-[var(--m-surface-inset)] p-4 rounded-xl border border-[var(--m-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[var(--m-accent)] font-bold uppercase text-[10px] tracking-wider block">
                Issuing Meteorological Authority
              </span>
              <strong className="text-[var(--m-text-primary)] text-sm block mt-0.5">
                {publication.issuingAuthority}
              </strong>
              <div className="text-[var(--m-text-muted)] mt-0.5">
                Lead Analyst / Directorate:{' '}
                <span className="text-[var(--m-text-secondary)]">{publication.author}</span>
              </div>
            </div>

            <div className="flex sm:flex-col sm:items-end gap-1.5 text-xs">
              <span className="text-[var(--m-text-muted)]">
                Date: <strong className="text-[var(--m-text-primary)]">{publication.date}</strong>
              </span>
              <span className="text-[var(--m-accent)] font-mono text-[11px] tabular-nums">
                {publication.documentNumber}
              </span>
            </div>
          </div>

          {activeTab === 'content' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)]">
                <h3 className="text-xs font-bold uppercase text-[var(--m-accent)] tracking-wider mb-1.5 flex items-center gap-1.5">
                  <AlignLeft className="w-4 h-4" />
                  <span>Executive Abstract</span>
                </h3>
                <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed italic">
                  &ldquo;{publication.abstract}&rdquo;
                </p>
              </div>

              {publication.synopticSummary && (
                <div className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)]">
                  <h3 className="text-xs font-bold uppercase text-[var(--m-ok)] tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Orbit className="w-4 h-4" />
                    <span>Synoptic Atmospheric Synopsis</span>
                  </h3>
                  <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
                    {publication.synopticSummary}
                  </p>
                </div>
              )}

              {publication.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)] flex flex-col gap-3"
                >
                  <h3 className="text-sm font-bold text-[var(--m-text-primary)] border-b border-[var(--m-border)] pb-2">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">{sec.content}</p>

                  {sec.tableData && (
                    <div className="mt-2">
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-[var(--m-surface-inset)] border-b border-[var(--m-border)] text-[var(--m-text-muted)]">
                              {sec.tableData.headers.map((h, hi) => (
                                <th key={hi} className="p-2 font-bold whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.tableData.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-[var(--m-border)]/70 hover:bg-[var(--m-surface-1)]">
                                {row.map((cell, ci) => (
                                  <td
                                    key={ci}
                                    className="p-2 font-mono tabular-nums text-[11px] text-[var(--m-text-primary)]"
                                  >
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
                            className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col gap-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-1.5 gap-2">
                              <span className="text-[10px] font-bold text-[var(--m-accent)] uppercase tracking-wide shrink-0">
                                {sec.tableData!.headers[0] || 'Metric'}
                              </span>
                              <span className="font-bold text-[var(--m-text-primary)] text-xs text-right">
                                {row[0]}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 pt-0.5">
                              {row.slice(1).map((cell, ci) => {
                                const header = sec.tableData!.headers[ci + 1] || `Metric ${ci + 1}`;
                                return (
                                  <div
                                    key={ci}
                                    className="flex items-center justify-between gap-2 text-[11px]"
                                  >
                                    <span className="text-[var(--m-text-muted)]">{header}:</span>
                                    <span className="font-mono tabular-nums text-[var(--m-text-primary)] text-right">
                                      {cell}
                                    </span>
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
            <div className="flex flex-col gap-4">
              <div className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)]">
                <h3 className="text-xs font-bold uppercase text-[var(--m-accent)] tracking-wider mb-2">
                  Executive Scientific Summary
                </h3>
                <p className="text-sm text-[var(--m-text-secondary)] leading-relaxed">{publication.abstract}</p>
              </div>

              {publication.synopticSummary && (
                <div className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)]">
                  <h3 className="text-xs font-bold uppercase text-[var(--m-ok)] tracking-wider mb-2">
                    Atmospheric Flow Regimes
                  </h3>
                  <p className="text-sm text-[var(--m-text-secondary)] leading-relaxed">
                    {publication.synopticSummary}
                  </p>
                </div>
              )}

              <div className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)]">
                <h3 className="text-xs font-bold uppercase text-[var(--m-text-muted)] tracking-wider mb-2">
                  Keywords &amp; Atmospheric Descriptors
                </h3>
                <div className="flex flex-wrap gap-2">
                  {publication.keywords.map((kw, ki) => (
                    <span
                      key={ki}
                      className="bg-[var(--m-surface-inset)] text-[var(--m-accent)] border border-[var(--m-border)] text-xs px-2.5 py-1 rounded"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="flex flex-col gap-4">
              {publication.sections.filter((s) => s.tableData).length === 0 ? (
                <div className="p-8 text-center text-[var(--m-text-muted)] bg-[var(--m-surface-2)] rounded-xl border border-[var(--m-border)]">
                  No structured telemetry tables recorded in this specific monograph.
                </div>
              ) : (
                publication.sections
                  .filter((s) => s.tableData)
                  .map((sec, idx) => (
                    <div
                      key={idx}
                      className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)]"
                    >
                      <h3 className="text-sm font-bold text-[var(--m-text-primary)] mb-2">{sec.title}</h3>
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-[var(--m-surface-inset)] border-b border-[var(--m-border)] text-[var(--m-text-muted)]">
                              {sec.tableData!.headers.map((h, hi) => (
                                <th key={hi} className="p-2.5 font-bold whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.tableData!.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-[var(--m-border)]/70 hover:bg-[var(--m-surface-1)]">
                                {row.map((cell, ci) => (
                                  <td
                                    key={ci}
                                    className="p-2.5 font-mono tabular-nums text-xs text-[var(--m-text-primary)]"
                                  >
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
                            className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex flex-col gap-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-1.5 gap-2">
                              <span className="text-[10px] font-bold text-[var(--m-accent)] uppercase tracking-wide shrink-0">
                                {sec.tableData!.headers[0] || 'Metric'}
                              </span>
                              <span className="font-bold text-[var(--m-text-primary)] text-xs text-right">
                                {row[0]}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 pt-0.5">
                              {row.slice(1).map((cell, ci) => {
                                const header = sec.tableData!.headers[ci + 1] || `Metric ${ci + 1}`;
                                return (
                                  <div
                                    key={ci}
                                    className="flex items-center justify-between gap-2 text-[11px]"
                                  >
                                    <span className="text-[var(--m-text-muted)]">{header}:</span>
                                    <span className="font-mono tabular-nums text-[var(--m-text-primary)] text-right">
                                      {cell}
                                    </span>
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
            <div className="flex flex-col gap-4">
              {publication.recommendations && publication.recommendations.length > 0 ? (
                <div className="bg-[var(--m-surface-2)] p-4 rounded-xl border border-[var(--m-border)]">
                  <h3 className="text-xs font-bold uppercase text-[var(--m-alert)] tracking-wider mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Operational Actions &amp; Public Advisories</span>
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {publication.recommendations.map((rec, ri) => (
                      <li key={ri} className="flex items-start gap-2 text-xs text-[var(--m-text-secondary)]">
                        <ChevronRight className="w-4 h-4 text-[var(--m-alert)] shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--m-text-muted)] bg-[var(--m-surface-2)] rounded-xl border border-[var(--m-border)]">
                  No special advisories attached to this research monograph.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-[var(--m-surface-inset)] px-5 py-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--m-text-muted)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C7A0]" />
            <span>Document Status: Official Open Data Publication (MAUSAM Registry)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 min-h-[40px] sm:min-h-[34px] bg-[var(--m-accent)] hover:bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export / Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 min-h-[40px] sm:min-h-[34px] bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
