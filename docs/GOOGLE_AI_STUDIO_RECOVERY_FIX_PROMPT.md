# Google AI Studio — MAUSAM Runtime Recovery & Responsive QA Prompt

You are working directly in the existing GitHub repository:

- Repository: https://github.com/codesbysayam/mausam_sih-26
- Current working branch: fix/mausam-responsive-all-viewports
- Production URL: https://mausamgovt.vercel.app
- Failure route observed: https://mausamgovt.vercel.app/warnings

## Mission

Resolve the MAUSAM Atmospheric Shell / Autonomous Fail-Safe Recovery screen shown when opening /warnings. Complete the runtime resilience work already started on this branch, repair dependency reproducibility, validate the responsive implementation, and update README.md in the same GitHub branch.

Do not merely redesign or hide the fallback screen. Identify and correct the first/root runtime exception.

## Evidence and known defects

1. The current ErrorBoundary directly accesses sessionStorage in componentDidCatch and componentDidMount. Browser storage property access can itself throw in restricted browser contexts.
2. Provider cache helpers in src/store/providerStore.ts checked window.sessionStorage before entering their try/catch. This can throw during ProviderStoreProvider initial state creation and prevent the whole app from mounting.
3. src/utils/lazyWithRetry.ts also accessed sessionStorage outside a safe wrapper and could mask a chunk-import failure with a storage exception.
4. The original recovery reset removed mausam_saved_locations and called sessionStorage.clear(), which can destroy user data and unrelated state. Recovery must preserve saved locations, language, theme and preferences.
5. AnalyzeWorkspace owns the /warnings page. A rendering error in this workspace should not unmount the entire app. Workspace-level Error Boundaries must isolate Analyze/Warnings from Explore and Classic.
6. GitHub Actions runs on Node 22 now, as required by @google/genai 3.x. However, package.json and package-lock.json are out of sync. CI logs explicitly report:
   - package.json requires @google/genai 3.6.1 while the lock contains 2.18.0
   - missing lock entries include @types/three, happy-dom, three, @dimforge/rapier3d-compat, @tweenjs/tween.js, @types/stats.js, @types/webxr, fflate, meshoptimizer, @types/whatwg-mimetype, @types/ws, buffer-image-size, entities and whatwg-mimetype.
7. The screenshot's generic recovery screen does not expose the actual originating exception unless Diagnostic Information is expanded. Do not claim the exact cause of a specific incident without examining its stack and browser console.

## Required repository workflow

1. Inspect the complete current branch and preserve all valid work already present.
2. Read the current package.json, package-lock.json, tsconfig.json, CI workflow, ErrorBoundary, main.tsx, App.tsx, providerStore, lazyWithRetry, location/language/experience providers, warning route, WebGL fallback and Vercel configuration.
3. Verify all existing edits before changing them. Do not overwrite newer code with old snippets.
4. Keep the current branch. Do not commit directly to main.
5. Do not introduce new dependencies unless technically essential and justified.

## Runtime recovery requirements

### Browser storage
- Use src/utils/safeStorage.ts for every optional localStorage/sessionStorage read, write, remove or prefix cleanup.
- Catch failures while retrieving the storage object itself as well as when invoking its methods.
- Treat storage as optional. App startup, warnings, navigation, language defaults and provider initialization must work if localStorage/sessionStorage are blocked.
- Validate and safely parse cached JSON. Malformed cache must be discarded without crashing React.
- Do not clear the complete sessionStorage or localStorage.
- Never delete saved locations, user settings, theme, language, bookmarks or unrelated website data during recovery.

### Error isolation
- Keep the root ErrorBoundary around application providers as the final fallback.
- Keep separate Error Boundaries around Explore, Analyze/Warnings and Classic workspaces.
- A failure in /warnings must not remove the global header, navigation or other independent workspaces.
- The local fallback must provide a retry action and show useful diagnostics.
- The root fallback must be usable on narrow screens, support keyboard navigation, and show error.message, error.stack and React componentStack.
- Do not make ErrorBoundary itself depend on storage, network, WebGL, context providers or application theme initialization.
- Error handlers must log useful diagnostics. Do not blanket-suppress unknown errors or unhandled rejections.

### Lazy chunk loading
- Retry only genuine module/chunk loading errors.
- Use bounded exponential backoff.
- Permit at most one recovery reload within a bounded time window.
- If session storage is blocked, do not reload repeatedly. Render a local recovery state instead.
- Do not return a permanently pending Promise after calling location.reload().
- Do not classify every generic fetch/API failure as a JavaScript chunk failure.

### WebGL and browser compatibility
- Detect unsupported WebGL before initializing the 3D scene.
- Handle WebGL context lost/restored events.
- If GPU/WebGL fails, switch to the existing 2D/accessibility map fallback without crashing the root app.
- Respect reduced motion, safe areas and touch input.
- A ResizeObserver notification loop must not be used as a reason to suppress unrelated runtime errors.

## Dependency and CI repair — mandatory

1. Use Node.js 22 and npm 10, matching GitHub Actions and the @google/genai 3.x engine requirement.
2. Regenerate package-lock.json from the current package.json:
   `npm install --package-lock-only`
3. Review the resulting lockfile and ensure it records the exact resolved dependency tree.
4. Run:
   `npm ci`
   `npm run lint`
   `npm run build`
5. Do not delete package-lock.json, use --force, use --legacy-peer-deps as a shortcut, downgrade @google/genai without a compatibility review, or change CI from npm ci to npm install just to bypass the mismatch.
6. If Node 22 must be enforced for Vercel, confirm the package.json engines declaration and Vercel runtime settings agree.

## Responsive QA — mandatory

Validate Explore, Analyze, Warnings and Classic at:

- 320×568, 360×800, 390×844, 430×932
- 568×320, 740×360, 844×390
- 768×1024, 1024×768, 1180×820, 1246×737
- 1366×768, 1440×900, 1920×1080, 2560×1080

Also test 50/50 split screen, browser zoom 80–200%, device rotation, iOS/Android safe areas, keyboard navigation and touch scrolling.

Acceptance:
- No horizontal document overflow.
- No overlapping header, navigation, inspector, layer selector or timeline.
- No clipped primary actions.
- All key controls remain reachable.
- WebGL canvas resizes to its actual container after orientation changes.
- Tables may scroll inside their own containers; the page itself must not overflow horizontally.

## Direct-route and failure-injection QA — mandatory

Test direct navigation and hard refresh on:
- /warnings
- /forecast
- /radar
- /aqi
- /agromet
- /

Run with:
- localStorage blocked
- sessionStorage blocked
- malformed provider cache JSON
- storage quota exceeded
- offline network
- slow network and aborted requests
- failed dynamic import / stale chunk
- WebGL disabled or context lost

The /warnings page must still render its shell and truthful warning-feed empty/degraded state if the warning provider is unavailable. A provider/API failure is not a React rendering failure.

## README update — mandatory

Update README.md in this same branch. Preserve the existing project documentation and add/maintain:
- Runtime Resilience, Error Isolation & Recovery
- Storage-safe persistence contract
- Root vs workspace Error Boundary behaviour
- Lazy chunk retry and reload-loop protection
- Non-destructive recovery policy
- Node 22 and npm toolchain requirement
- Exact clean install, lint and build commands
- Responsive viewport matrix
- Deep-route and failure-injection test matrix
- Release acceptance checklist

Do not state that all tests pass unless you ran them and observed success. Document remaining failures explicitly.

## Final deliverables

1. Corrected source code and updated package-lock.json.
2. Updated README.md committed to this branch.
3. Passing npm ci, npm run lint and npm run build.
4. Verified Vercel preview URL and a concise summary of manual QA performed.
5. A list of remaining known limitations, if any.

Do not merge or deploy to production automatically. Keep all changes on the current branch and report the PR link.


## Additional diagnostics-gateway correction (required)

The Data Sources & Upstream Diagnostics page previously called imdService.getDebugStats(), which resolves to /api/imd/debug/stats. This endpoint exists in the local Express router but is not an individual Vercel serverless function. Do not treat local Express route registration as proof of production route availability.

Use the deployed endpoint GET /api/system?mode=health as the page-level health gateway. Read its actual response contract (status, timestamp, summary.totalProviders, summary.operational, summary.notConfigured, and providers). Fetch with cache: no-store, a seven-second AbortController timeout, and explicit response schema validation. Show a retryable gateway error state with the actual HTTP/network/timeout reason.

Update the client diagnostics adapter to map the serverless response to the UI provider-health contract. Preserve null for counters and latency that the endpoint does not report. The UI must show Not Reported when a provider has no health record, and Not reported by gateway for database/cache fields absent from the serverless response. Never convert missing telemetry to zero, In-Memory Cache, Not Configured, or Operational.

Remove fake cache-hit/miss/deduplication/stale-serve metrics from this screen. Replace them with actual provider counts and measured browser-to-gateway round-trip latency. Label this round-trip separately from server-measured upstream latency.

The serverless health endpoint must not cache live probe results. Use Cache-Control: no-store. Each configured provider may be marked Operational only after a real successful upstream probe. A key being present is configuration evidence, not availability evidence. Any configured but unverified integration must be Degraded/unverified, not Operational. The overall gateway is Degraded if a required core source fails or any configured provider probe fails.

Verify these production routes after deployment: /api/system?mode=health, /api/system?mode=providers, /api/system?mode=readiness. Do not report success until Vercel preview and production endpoints have been checked. Keep changes on the existing working branch and update README.md with the deployment contract.
