import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, GripVertical } from 'lucide-react';

interface DraggableAskMausamButtonProps {
  onClick: () => void;
  isVisible: boolean;
}

const PADDING = 24;
const DRAG_THRESHOLD = 6; // px moved to distinguish drag from click

export const DraggableAskMausamButton: React.FC<DraggableAskMausamButtonProps> = ({
  onClick,
  isVisible,
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Tracking drag state in ref to avoid lag in pointer event listeners
  const dragInfoRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    hasMoved: false,
    pointerId: -1,
  });

  // Purge any stale localStorage coordinates so button starts cleanly at bottom-right
  useEffect(() => {
    try {
      localStorage.removeItem('mausam_ask_btn_coords');
      localStorage.removeItem('mausam_ask_btn_coords_v2');
    } catch {
      // Ignore
    }
  }, []);

  // Calculate default position comfortably at bottom-right of viewport with clearance
  const getDefaultPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const btnWidth = buttonRef.current?.offsetWidth || 160;
    const btnHeight = buttonRef.current?.offsetHeight || 44;
    return {
      x: Math.max(PADDING, window.innerWidth - btnWidth - PADDING),
      y: Math.max(PADDING, window.innerHeight - btnHeight - PADDING),
    };
  }, []);

  // Clamp coordinates within screen viewport
  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const btnWidth = buttonRef.current?.offsetWidth || 160;
    const btnHeight = buttonRef.current?.offsetHeight || 44;
    const minX = PADDING;
    const maxX = Math.max(PADDING, window.innerWidth - btnWidth - PADDING);
    const minY = PADDING;
    const maxY = Math.max(PADDING, window.innerHeight - btnHeight - PADDING);

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, []);

  // Snapping utility: automatically aligns to closest screen edge (prefers bottom-right)
  const snapToEdge = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const btnWidth = buttonRef.current?.offsetWidth || 160;
    const btnHeight = buttonRef.current?.offsetHeight || 44;
    const minX = PADDING;
    const maxX = Math.max(PADDING, window.innerWidth - btnWidth - PADDING);
    const minY = PADDING;
    const maxY = Math.max(PADDING, window.innerHeight - btnHeight - PADDING);

    const distLeft = Math.abs(x - minX);
    const distRight = Math.abs(maxX - x);
    const distTop = Math.abs(y - minY);
    const distBottom = Math.abs(maxY - y);

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    let targetX = x;
    let targetY = y;

    if (minDist === distLeft) {
      targetX = minX;
    } else if (minDist === distRight) {
      targetX = maxX;
    } else if (minDist === distTop) {
      targetY = minY;
    } else {
      targetY = maxY;
    }

    return {
      x: Math.min(Math.max(targetX, minX), maxX),
      y: Math.min(Math.max(targetY, minY), maxY),
    };
  }, []);

  // Reset to default on window resize if moved
  useEffect(() => {
    const handleResize = () => {
      if (position) {
        setPosition(clampPosition(position.x, position.y));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, clampPosition]);

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const currentPos = position || getDefaultPosition();
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: currentPos.x,
      originY: currentPos.y,
      hasMoved: false,
      pointerId: e.pointerId,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - dragInfoRef.current.startX;
    const deltaY = e.clientY - dragInfoRef.current.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (!dragInfoRef.current.hasMoved && distance > DRAG_THRESHOLD) {
      dragInfoRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragInfoRef.current.hasMoved) {
      const targetX = dragInfoRef.current.originX + deltaX;
      const targetY = dragInfoRef.current.originY + deltaY;
      setPosition(clampPosition(targetX, targetY));
    }
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const wasDragging = dragInfoRef.current.hasMoved;
    dragInfoRef.current.pointerId = -1;
    setIsDragging(false);

    if (wasDragging) {
      const current = position || getDefaultPosition();
      const snapped = snapToEdge(current.x, current.y);
      setIsSnapping(true);
      requestAnimationFrame(() => {
        setPosition(snapped);
      });
    } else {
      onClick();
    }
  };

  // Pointer Cancel Handler
  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current.pointerId === e.pointerId) {
      dragInfoRef.current.pointerId = -1;
      setIsDragging(false);
      if (dragInfoRef.current.hasMoved && position) {
        const snapped = snapToEdge(position.x, position.y);
        setIsSnapping(true);
        requestAnimationFrame(() => {
          setPosition(snapped);
        });
      }
    }
  };

  // Double click resets cleanly to bottom-right
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSnapping(true);
    setPosition(null);
  };

  // By default, sits strictly fixed at bottom: max(20px, env(safe-area-inset-bottom)), right: max(20px, env(safe-area-inset-right))
  const currentStyle: React.CSSProperties = {
    position: 'fixed',
    right: position ? 'auto' : 'max(20px, env(safe-area-inset-right, 20px))',
    bottom: position ? 'auto' : 'max(20px, env(safe-area-inset-bottom, 20px))',
    left: position ? `${position.x}px` : undefined,
    top: position ? `${position.y}px` : undefined,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    zIndex: 50,
    willChange: isDragging || isSnapping ? 'left, top' : 'auto',
    transition: isSnapping
      ? 'left 0.42s cubic-bezier(0.16, 1, 0.3, 1), top 0.42s cubic-bezier(0.16, 1, 0.3, 1)'
      : isDragging
      ? 'none'
      : 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
  };

  return (
    <div
      ref={buttonRef}
      id="floating-ask-mausam-container"
      style={currentStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'left' || e.propertyName === 'top') {
          setIsSnapping(false);
        }
      }}
      className={`mausam-draggable-ask-button z-50 select-none group transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="button"
      tabIndex={0}
      aria-label="Ask MAUSAM AI Weather & Advisory"
      title="Ask MAUSAM (Fixed at bottom-right • Double-click to reset)"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-full bg-[#0B72B9] hover:bg-[#095991] active:bg-[#074773] text-white border border-[#38BDF8] shadow-2xl transition-all select-none ${
          isDragging
            ? 'scale-105 shadow-[0_12px_32px_rgba(11,114,185,0.65)] ring-2 ring-[#38BDF8] cursor-grabbing'
            : 'cursor-grab hover:shadow-[0_8px_24px_rgba(11,114,185,0.45)]'
        }`}
      >
        <span
          className="text-[#93C5FD] opacity-70 group-hover:opacity-100 transition-opacity hidden sm:flex items-center"
          title="Drag to adjust position"
        >
          <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </span>

        <Sparkles className="w-4 h-4 text-[#38BDF8] shrink-0" aria-hidden="true" />

        {/* Compact on mobile, full pill on desktop */}
        <span className="font-bold tracking-wide text-[11px] sm:text-xs whitespace-nowrap hidden sm:inline">
          Ask MAUSAM
        </span>
        <span className="font-bold tracking-wide text-[10px] whitespace-nowrap sm:hidden">
          Ask
        </span>

        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ECC71] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2ECC71]" />
        </span>
      </div>

      {isHovered && !isDragging && (
        <div
          className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#0D1E33] border border-[#1E3A5F] text-[10px] text-[#93C5FD] whitespace-nowrap shadow pointer-events-none transition-all"
          aria-hidden="true"
        >
          Ask MAUSAM
        </div>
      )}
    </div>
  );
};
