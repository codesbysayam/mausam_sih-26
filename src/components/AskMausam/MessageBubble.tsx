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
        <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-[#0B72B9] border border-[#35C7E8]/35 text-[#F3F6FA] px-3.5 py-2.5">
          <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
          <span className="block text-[10px] text-[#F3F6FA]/75 text-right mt-1 font-mono tabular-nums">
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
      <div className="flex items-center justify-between text-xs text-[#8295A8] px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isKnowledgeResponse ? 'bg-[#22C7A0]' : 'bg-[#35C7E8]'
            }`}
          />
          <span className="font-semibold text-[#F3F6FA] tracking-wide">Ask MAUSAM</span>
          <span>·</span>
          <span className="text-[10px] font-mono text-[#B5C3D1] truncate max-w-[180px]">
            {isKnowledgeResponse ? 'Knowledge Base' : sourceName}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#8295A8] tabular-nums shrink-0">{time}</span>
      </div>

      {/* Main Bubble Content */}
      <div className="rounded-xl rounded-tl-sm bg-[#0B1927] border border-[#26394B] p-3.5 sm:p-4 text-[#B5C3D1] flex flex-col gap-3">
        {isKnowledgeResponse && structured?.knowledge && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase bg-[#35C7E8]/12 text-[#35C7E8] border border-[#35C7E8]/35">
              {structured.knowledge.category}
            </span>
            <span className="text-xs text-[#8295A8] font-medium truncate">
              {structured.knowledge.title}
            </span>
          </div>
        )}

        <MarkdownRenderer content={message.text} />

        {intent === 'MULTI_LOCATION_COMPARISON' && structured?.comparison && (
          <div className="pt-2 border-t border-[#26394B]">
            <ComparisonAnswer comparison={structured.comparison} />
          </div>
        )}

        {!isKnowledgeResponse && facts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#26394B]">
            {facts.map((fact, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md bg-[#08131F] border border-[#26394B] text-[11px] font-mono text-[#B5C3D1] tabular-nums"
              >
                <strong className="text-[#F3F6FA] font-semibold">{fact.label}:</strong> {fact.value}
              </span>
            ))}
          </div>
        )}

        {!isKnowledgeResponse &&
          context?.location &&
          onSelectLocation &&
          !structured?.debug?.locationIsContextOnly && (
            <div className="flex items-center justify-between pt-2 border-t border-[#26394B] text-[11px]">
              <span className="text-[#8295A8] truncate">
                Grounded in: {context.location.name}
              </span>
              <button
                type="button"
                onClick={() => onSelectLocation(context.location.name)}
                className="min-h-[36px] px-2 text-[#35C7E8] hover:underline font-mono font-semibold shrink-0 ml-2 cursor-pointer"
              >
                Switch Location
              </button>
            </div>
          )}

        {followUps.length > 0 && (
          <div className="pt-2 border-t border-[#26394B] flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#8295A8]">
              Suggested Inquiries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {followUps.map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectPrompt(promptText)}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] hover:border-[#38536A] transition-colors text-left cursor-pointer m-focus-ring"
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
