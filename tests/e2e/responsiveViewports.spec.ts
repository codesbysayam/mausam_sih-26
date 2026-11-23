/**
 * MAUSAM Multi-Viewport Responsive, Projector & Smart TV Verification Suite
 * Designed for Playwright (`npx playwright test tests/e2e/responsiveViewports.spec.ts`)
 * Verifies zero horizontal overflow, mobile navigation drawer, Projector Presentation
 * Mode, Smart TV focus navigation, and responsive map rendering across target viewports.
 */

export const MAUSAM_TEST_VIEWPORTS = [
  { name: 'mobile-xs-320', width: 320, height: 568 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-412', width: 412, height: 915 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-portrait-768', width: 768, height: 1024 },
  { name: 'tablet-portrait-820', width: 820, height: 1180 },
  { name: 'tablet-landscape-1024', width: 1024, height: 768 },
  { name: 'tablet-landscape-1180', width: 1180, height: 820 },
  { name: 'laptop-720p', width: 1280, height: 720 },
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'laptop-1440', width: 1440, height: 900 },
  { name: 'laptop-1536', width: 1536, height: 864 },
  { name: 'desktop-1600', width: 1600, height: 900 },
  { name: 'desktop-1080p', width: 1920, height: 1080 },
  { name: 'desktop-1440p', width: 2560, height: 1440 },
  { name: 'ultrawide-2560', width: 2560, height: 1080 },
  { name: 'ultrawide-3440', width: 3440, height: 1440 },
  { name: 'tv-projector-4k', width: 3840, height: 2160 },
] as const;

export const MAUSAM_TEST_ROUTES = [
  '/',
  '/weather',
  '/forecast',
  '/radar',
  '/warnings',
  '/aqi',
  '/agromet',
  '/cyclone-tracker',
  '/reports',
] as const;
