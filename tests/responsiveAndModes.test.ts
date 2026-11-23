import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyViewport } from '../src/hooks/useViewportProfile';
import {
  findNextFocusableInDirection,
  shouldAllowSpatialNavigation,
  type SpatialRect,
} from '../src/hooks/useTvSpatialNavigation';
import { getResponsiveMotionProfile } from '../src/motion/tokens';

const TARGET_VIEWPORTS: Array<{
  name: string;
  width: number;
  height: number;
  expectedBreakpoint: ReturnType<typeof classifyViewport>['breakpoint'];
  expectedOrientation: 'portrait' | 'landscape';
}> = [
  { name: 'Small Mobile SE', width: 320, height: 568, expectedBreakpoint: 'xs', expectedOrientation: 'portrait' },
  { name: 'Android Compact', width: 360, height: 800, expectedBreakpoint: 'xs', expectedOrientation: 'portrait' },
  { name: 'iPhone Mini/SE', width: 375, height: 812, expectedBreakpoint: 'sm', expectedOrientation: 'portrait' },
  { name: 'iPhone Standard', width: 390, height: 844, expectedBreakpoint: 'sm', expectedOrientation: 'portrait' },
  { name: 'Android Large', width: 412, height: 915, expectedBreakpoint: 'sm', expectedOrientation: 'portrait' },
  { name: 'iPhone Pro Max', width: 430, height: 932, expectedBreakpoint: 'sm', expectedOrientation: 'portrait' },
  { name: 'Phablet / Foldable Unfolded Narrow', width: 600, height: 900, expectedBreakpoint: 'md', expectedOrientation: 'portrait' },
  { name: 'Tablet Portrait 768', width: 768, height: 1024, expectedBreakpoint: 'tablet', expectedOrientation: 'portrait' },
  { name: 'iPad Air Portrait', width: 820, height: 1180, expectedBreakpoint: 'tablet', expectedOrientation: 'portrait' },
  { name: 'Tablet Landscape 1024', width: 1024, height: 768, expectedBreakpoint: 'laptop', expectedOrientation: 'landscape' },
  { name: 'iPad Air Landscape', width: 1180, height: 820, expectedBreakpoint: 'laptop', expectedOrientation: 'landscape' },
  { name: 'Laptop / Projector 720p', width: 1280, height: 720, expectedBreakpoint: 'desktop', expectedOrientation: 'landscape' },
  { name: 'Laptop 1366x768', width: 1366, height: 768, expectedBreakpoint: 'desktop', expectedOrientation: 'landscape' },
  { name: 'Laptop 1440x900', width: 1440, height: 900, expectedBreakpoint: 'desktop', expectedOrientation: 'landscape' },
  { name: 'Laptop 1536x864', width: 1536, height: 864, expectedBreakpoint: 'large', expectedOrientation: 'landscape' },
  { name: 'Desktop 1600x900', width: 1600, height: 900, expectedBreakpoint: 'large', expectedOrientation: 'landscape' },
  { name: 'Full HD 1080p / TV / Projector', width: 1920, height: 1080, expectedBreakpoint: 'xl4k', expectedOrientation: 'landscape' },
  { name: 'QHD 1440p Desktop', width: 2560, height: 1440, expectedBreakpoint: 'xl4k', expectedOrientation: 'landscape' },
  { name: 'Ultrawide 21:9 1080p', width: 2560, height: 1080, expectedBreakpoint: 'xl4k', expectedOrientation: 'landscape' },
  { name: 'Ultrawide 21:9 1440p', width: 3440, height: 1440, expectedBreakpoint: 'xl4k', expectedOrientation: 'landscape' },
  { name: '4K Smart TV / Projector', width: 3840, height: 2160, expectedBreakpoint: 'xl4k', expectedOrientation: 'landscape' },
];

test('classifyViewport maps all 21 multi-device viewports accurately', () => {
  for (const vp of TARGET_VIEWPORTS) {
    const profile = classifyViewport(vp.width, vp.height, vp.width < 1024);
    assert.equal(profile.breakpoint, vp.expectedBreakpoint, `Breakpoint mismatch for ${vp.name}`);
    assert.equal(profile.orientation, vp.expectedOrientation, `Orientation mismatch for ${vp.name}`);
    assert.equal(profile.width, vp.width);
    assert.equal(profile.height, vp.height);
  }

  // Verify ultrawide and 4K flags
  const uw = classifyViewport(3440, 1440);
  assert.equal(uw.isUltrawide, true);
  assert.equal(uw.is4K, true);

  const fhd = classifyViewport(1920, 1080);
  assert.equal(fhd.isUltrawide, false);
  assert.equal(fhd.is4K, false);

  const shortLandscape = classifyViewport(844, 390, true);
  assert.equal(shortLandscape.isShortLandscape, true);
  assert.equal(shortLandscape.orientation, 'landscape');
});

test('Smart TV spatial D-pad navigation selects geometrically aligned neighbors', () => {
  // 2x2 grid of focusable buttons
  const grid: SpatialRect[] = [
    { id: 'tl', left: 100, top: 100, right: 300, bottom: 160, width: 200, height: 60 },
    { id: 'tr', left: 360, top: 100, right: 560, bottom: 160, width: 200, height: 60 },
    { id: 'bl', left: 100, top: 220, right: 300, bottom: 280, width: 200, height: 60 },
    { id: 'br', left: 360, top: 220, right: 560, bottom: 280, width: 200, height: 60 },
  ];

  assert.equal(findNextFocusableInDirection(grid[0], grid, 'right')?.id, 'tr');
  assert.equal(findNextFocusableInDirection(grid[0], grid, 'down')?.id, 'bl');
  assert.equal(findNextFocusableInDirection(grid[0], grid, 'left'), null);
  assert.equal(findNextFocusableInDirection(grid[0], grid, 'up'), null);

  assert.equal(findNextFocusableInDirection(grid[3], grid, 'left')?.id, 'bl');
  assert.equal(findNextFocusableInDirection(grid[3], grid, 'up')?.id, 'tr');
  assert.equal(findNextFocusableInDirection(grid[3], grid, 'right'), null);
  assert.equal(findNextFocusableInDirection(grid[3], grid, 'down'), null);
});

test('Smart TV spatial navigation never hijacks inputs, selects, sliders, or Leaflet maps', () => {
  assert.equal(shouldAllowSpatialNavigation({ tagName: 'INPUT' }), false);
  assert.equal(shouldAllowSpatialNavigation({ tagName: 'TEXTAREA' }), false);
  assert.equal(shouldAllowSpatialNavigation({ tagName: 'SELECT' }), false);
  assert.equal(shouldAllowSpatialNavigation({ tagName: 'DIV', isContentEditable: true }), false);
  assert.equal(shouldAllowSpatialNavigation({ tagName: 'DIV', role: 'slider' }), false);
  assert.equal(shouldAllowSpatialNavigation({ tagName: 'DIV', insideMapCanvas: true }), false);

  assert.equal(shouldAllowSpatialNavigation({ tagName: 'BUTTON' }), true);
  assert.equal(shouldAllowSpatialNavigation({ tagName: 'A' }), true);
  assert.equal(shouldAllowSpatialNavigation(null), true);
});

test('Motion profile disables parallax, magnetic hover, and ambient drift in Projector and TV modes', () => {
  const projectorProfile = getResponsiveMotionProfile(1920, false, false, 'projector');
  assert.equal(projectorProfile.allowParallax, false);
  assert.equal(projectorProfile.allowMagnetic, false);
  assert.equal(projectorProfile.allowHoverLift, false);
  assert.equal(projectorProfile.ambientIntensity, 'static');

  const tvProfile = getResponsiveMotionProfile(3840, false, false, 'tv');
  assert.equal(tvProfile.allowParallax, false);
  assert.equal(tvProfile.allowMagnetic, false);
  assert.equal(tvProfile.allowHoverLift, false);
  assert.equal(tvProfile.ambientIntensity, 'static');

  const desktopStandard = getResponsiveMotionProfile(1440, false, false, 'standard');
  assert.equal(desktopStandard.allowParallax, true);
  assert.equal(desktopStandard.ambientIntensity, 'full');

  const reduced = getResponsiveMotionProfile(1920, true, false, 'standard');
  assert.equal(reduced.durationScale, 0);
  assert.equal(reduced.ambientIntensity, 'static');
});
