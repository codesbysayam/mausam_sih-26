// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Interactive Message Bubble with Markdown Rendering & Grounded Facts
// ====================================================================

import React from 'react';
import { AskMausamMessage } from '../../types/askMausam';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ComparisonAnswer } from './ComparisonAnswer';

interface MessageBubbleProps {
  message: AskMausamMessage;
  onSelectPrompt: (prompt: string) => void;
  onSelectLocation?: (locationName: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSelectPrompt,
  onSelectLocation,
}) => {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-[var(--m-accent)] border border-[var(--m-accent)]/35 text-[var(--m-text-primary)] px-3.5 py-2.5">
          <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
          <span className="block text-[10px] text-[var(--m-text-primary)]/75 text-right mt-1 font-mono tabular-nums">
            {time}
          </span>
        </div>
      </div>
    );
  }

  const structured = message.structured;
  const context = message.contextSnapshot;
  const intent = structured?.intent || 'CURRENT_WEATHER';
  const facts = structured?.facts || [];
  const followUps = structured?.suggestedFollowUps || [];
  const sourceName = context?.sources?.[0]?.provider || 'Atmospheric Telemetry';
  const isKnowledgeResponse =
    structured?.responseType === 'knowledge' ||
    intent === 'GENERAL_KNOWLEDGE' ||
    intent === 'ABOUT_MAUSAM' ||
    intent === 'ABOUT_DEVELOPER' ||
    intent === 'HELP' ||
    intent === 'GREETING' ||
    intent === 'CLARIFICATION' ||
    intent === 'GENERAL_MAUSAM_INFORMATION';

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      {/* Sender Header */}
      <div className="flex items-center justify-between text-xs text-[var(--m-text-muted)] px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isKnowledgeResponse ? 'bg-[#22C7A0]' : 'bg-[var(--m-accent)]'
            }`}
          />
          <span className="font-semibold text-[var(--m-text-primary)] tracking-wide">Ask MAUSAM</span>
          <span>·</span>
          <span className="text-[10px] font-mono text-[var(--m-text-secondary)] truncate max-w-[180px]">
            {isKnowledgeResponse ? 'Knowledge Base' : sourceName}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums shrink-0">{time}</span>
      </div>

      {/* Main Bubble Content */}
      <div className="rounded-xl rounded-tl-sm bg-[var(--m-surface-1)] border border-[var(--m-border)] p-3.5 sm:p-4 text-[var(--m-text-secondary)] flex flex-col gap-3">
        {isKnowledgeResponse && structured?.knowledge && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35">
              {structured.knowledge.category}
            </span>
            <span className="text-xs text-[var(--m-text-muted)] font-medium truncate">
              {structured.knowledge.title}
            </span>
          </div>
        )}

        <MarkdownRenderer content={message.text} />

        {intent === 'MULTI_LOCATION_COMPARISON' && structured?.comparison && (
          <div className="pt-2 border-t border-[var(--m-border)]">
            <ComparisonAnswer comparison={structured.comparison} />
          </div>
        )}

        {!isKnowledgeResponse && facts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--m-border)]">
            {facts.map((fact, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] font-mono text-[var(--m-text-secondary)] tabular-nums"
              >
                <strong className="text-[var(--m-text-primary)] font-semibold">{fact.label}:</strong> {fact.value}
              </span>
            ))}
          </div>
        )}

        {!isKnowledgeResponse &&
          context?.location &&
          onSelectLocation &&
          !structured?.debug?.locationIsContextOnly && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--m-border)] text-[11px]">
              <span className="text-[var(--m-text-muted)] truncate">
                Grounded in: {context.location.name}
              </span>
              <button
                type="button"
                onClick={() => onSelectLocation(context.location.name)}
                className="min-h-[36px] px-2 text-[var(--m-accent)] hover:underline font-mono font-semibold shrink-0 ml-2 cursor-pointer"
              >
                Switch Location
              </button>
            </div>
          )}

        {followUps.length > 0 && (
          <div className="pt-2 border-t border-[var(--m-border)] flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[var(--m-text-muted)]">
              Suggested Inquiries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {followUps.map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectPrompt(promptText)}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] transition-colors text-left cursor-pointer m-focus-ring"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
