// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Canonical Markdown Renderer for Meteorological Assistant
// Sanitizes output, eliminates literal asterisks, styles lists & values
// ====================================================================

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function normalizeMarkdown(text: string): string {
  if (!text) return '';

  let normalized = text;

  normalized = normalized.replace(/\*{4,}([^*]+)\*{4,}/g, '**$1**');
  normalized = normalized.replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**');
  normalized = normalized.replace(/^(#{1,6})\s*(#{1,6})\s*$/gm, '');
  normalized = normalized.replace(/^(#{1,6})([A-Za-z0-9])/gm, '$1 $2');
  normalized = normalized.replace(/^([•\-\*])([A-Za-z0-9])/gm, '$1 $2');
  normalized = normalized.replace(/^•\s*/gm, '- ');
  normalized = normalized.replace(/([^\n])\n(- |\d+\. )/g, '$1\n\n$2');

  return normalized.trim();
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const cleanContent = useMemo(() => normalizeMarkdown(content), [content]);

  return (
    <div className={`text-xs sm:text-sm leading-relaxed text-[#B5C3D1] space-y-2 select-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ children }) => (
            <strong className="font-semibold text-[#F3F6FA] tracking-wide">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#8295A8]">{children}</em>
          ),
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold text-[#F3F6FA] mt-3 mb-1 border-b border-[#26394B] pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-[#35C7E8] mt-2.5 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-[#F3F6FA] mt-2 mb-0.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-[#B5C3D1]">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-4 my-1.5 space-y-1 text-[#B5C3D1]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-4 my-1.5 space-y-1 text-[#B5C3D1]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-snug text-[#B5C3D1] pl-0.5">{children}</li>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[#35C7E8] font-mono text-[11px]">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#0B72B9] pl-3 py-1 my-2 bg-[#0B72B9]/10 rounded-r text-[#B5C3D1] italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-[#26394B]">
              <table className="min-w-full divide-y divide-[#26394B] text-left text-[11px] font-mono tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#08131F] text-[#F3F6FA] font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#26394B] bg-[#0B1927] text-[#B5C3D1]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 whitespace-nowrap">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#35C7E8] hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};
