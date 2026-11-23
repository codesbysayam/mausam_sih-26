// ====================================================================
// MAUSAM - Smart TV & Remote Spatial Directional Focus Navigation
// Enables predictable ArrowUp / ArrowDown / ArrowLeft / ArrowRight /
// Enter / Escape navigation when TV Mode is active without hijacking
// text inputs, selects, range sliders, or interactive Leaflet maps.
// ====================================================================

import { useEffect } from 'react';

export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

export interface SpatialRect {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Pure guard determining whether directional arrow keys should trigger
 * spatial TV focus movement instead of native element behavior.
 */
export function shouldAllowSpatialNavigation(target: {
  tagName?: string;
  isContentEditable?: boolean;
  role?: string | null;
  insideMapCanvas?: boolean;
} | null): boolean {
  if (!target) return true;
  const tag = (target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return false;
  }
  if (target.isContentEditable) {
    return false;
  }
  const role = (target.role || '').toLowerCase();
  if (role === 'slider' || role === 'spinbutton' || role === 'textbox' || role === 'combobox') {
    return false;
  }
  if (target.insideMapCanvas) {
    return false;
  }
  return true;
}

/**
 * Pure geometric nearest-neighbor selector for TV D-pad directional focus.
 * Prefers elements aligned along the requested axis while penalizing lateral drift.
 */
export function findNextFocusableInDirection(
  current: SpatialRect,
  candidates: SpatialRect[],
  direction: SpatialDirection
): SpatialRect | null {
  const curCx = current.left + current.width / 2;
  const curCy = current.top + current.height / 2;

  let best: SpatialRect | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const cand of candidates) {
    if (cand.id === current.id) continue;
    if (cand.width <= 0 || cand.height <= 0) continue;

    const cx = cand.left + cand.width / 2;
    const cy = cand.top + cand.height / 2;
    const dx = cx - curCx;
    const dy = cy - curCy;

    let primaryDelta = 0;
    let crossDelta = 0;

    if (direction === 'right') {
      if (dx <= 4) continue;
      primaryDelta = dx;
      crossDelta = Math.abs(dy);
    } else if (direction === 'left') {
      if (dx >= -4) continue;
      primaryDelta = Math.abs(dx);
      crossDelta = Math.abs(dy);
    } else if (direction === 'down') {
      if (dy <= 4) continue;
      primaryDelta = dy;
      crossDelta = Math.abs(dx);
    } else {
      if (dy >= -4) continue;
      primaryDelta = Math.abs(dy);
      crossDelta = Math.abs(dx);
    }

    // Strongly favor aligned items on the same row/column so D-pad feels natural
    const score = primaryDelta + crossDelta * 2.4;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return best;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  '[data-tv-focusable="true"]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
].join(',');

function isElementVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width >= 8 && rect.height >= 8;
}

export function useTvSpatialNavigation(
  enabled: boolean,
  onEscape?: () => void
): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      const directionMap: Record<string, SpatialDirection> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const direction = directionMap[event.key];
      if (!direction) return;

      const active = document.activeElement as HTMLElement | null;
      const insideMapCanvas = Boolean(
        active?.closest('.leaflet-container, [data-map-interactive="true"]')
      );

      if (
        !shouldAllowSpatialNavigation(
          active
            ? {
                tagName: active.tagName,
                isContentEditable: active.isContentEditable,
                role: active.getAttribute('role'),
                insideMapCanvas,
              }
            : null
        )
      ) {
        return;
      }

      // Scope focus search to an open dialog if one is active, else document
      const activeDialog = document.querySelector<HTMLElement>('[role="dialog"]');
      const scope: ParentNode = activeDialog || document;

      const elements = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => isElementVisible(el) && !el.closest('[aria-hidden="true"]')
      );

      if (elements.length === 0) return;

      // If nothing meaningful is focused yet, focus the first visible control
      if (!active || !elements.includes(active)) {
        event.preventDefault();
        elements[0].focus({ preventScroll: false });
        elements[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        return;
      }

      const elementById = new Map<string, HTMLElement>();
      const rects: SpatialRect[] = elements.map((el, idx) => {
        const id = `tv-node-${idx}`;
        elementById.set(id, el);
        const r = el.getBoundingClientRect();
        return {
          id,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      });

      const currentIdx = elements.indexOf(active);
      const currentRect = rects[currentIdx];
      if (!currentRect) return;

      const nextRect = findNextFocusableInDirection(currentRect, rects, direction);
      if (!nextRect) return;

      const targetEl = elementById.get(nextRect.id);
      if (targetEl) {
        event.preventDefault();
        targetEl.focus({ preventScroll: false });
        targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape]);
}
