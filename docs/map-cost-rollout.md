# Map cost changes and rollout

## Implemented

- Main-map reuse is on by default. Set `NEXT_PUBLIC_GOOGLE_MAP_REUSE=false` and rebuild to restore a new instance on each mount. Only the main map uses this pool, preventing picker/admin settings from leaking into it.
- Country, category, search and dark/light changes update the current main map.
- Add-stop maps mount on the first map-tab visit, then remain mounted during list/map and filter changes within that open modal. Closing releases the map; reopening in list mode does not create a hidden map.
- Business verification waits for viewport visibility before creating its map and retains it after scrolling away.
- Admin places, recommendation, verification and picker maps wait for theme hydration, avoiding an initial LIGHT instance followed by DARK.
- Search retains its debounce, suggestions, geocoding fallback and selection behavior. Selection no longer searches its label again; stale results cannot overwrite newer input.
- JavaScript and REST geocoding share identical requests only while in flight. Completed results/errors are discarded for retry. REST callers share parsed JSON, not a Response body that can only be read once.
- Business pin changes no longer re-geocode the same country. Clearing a saved pin restores the country camera from the current form's last lookup. Boundary and reverse-geocoding checks remain. Failed/superseded lookups cannot replace a saved or cleared pin.
- Picker geolocation no longer repeats when an inline callback changes; responses after unmount are ignored.
- Optional counters track map mounts, distinct observed instances, geocoding requests/shared calls, autocomplete requests and committed selections.

Access, purchases, marker limits, controls, validation and route behavior are preserved. Backend code is unchanged.

## Decisions that preserve features

Other maps do not join the main-map reuse pool: their cursors, controls, restrictions and styles differ, and the library documents problems reusing different option sets. Their loading, hydration and tab lifecycle are optimized separately.

Maps using native `colorScheme` still recreate on a user theme change because that option is immutable. Initial hydration recreation is avoided. Main-map themes use its existing styled map and retain the instance.

Business map records do not store authoritative boundaries. Approximate country presets must not replace validation viewports. The main/admin panners already use existing presets; the main map also fits stored place coordinates before geocoding.

The existing Autocomplete + Geocoding flow is retained: this search needs coordinates, and session tokens/Place Details are not automatically cheaper. Measure requests per completed selection before changing billing flows. Google documents cases where the current flow is cheaper:
https://developers.google.com/maps/documentation/javascript/legacy/place-autocomplete#advanced_cost_optimization

The route view draws polylines and opens Google Maps for directions. No duplicate Routes/Directions calculation was found to remove. Backend reverse geocoding is used for country lookup/validation; maintenance photo scripts were not run or changed.

## Verification

```powershell
node --test scripts/test-map-cost.cjs scripts/test-map-lifecycle.cjs
npm.cmd run build
```

All 24 automated tests pass. They cover request sharing, retry, stale input, pin validation/update/clear and camera restoration, lazy visibility and add-stop lifecycle.

The browser check requires dedicated headless Chrome with remote debugging on port 9226 and a separate temporary profile. Run a local production build on port 3011 with `NEXT_PUBLIC_MAP_COST_DIAGNOSTICS=true`, then:

```powershell
$env:MAP_CHECK_FIXTURES = 'true'
node scripts/verify-map-browser.cjs
```

The check uses the real Google Maps SDK with mocked app API/auth data. App API requests are fulfilled by the test and sockets blocked. It does not submit forms or modify production records. Reports/screenshots go under `.next/map-cost-verification/`. Anonymous mode cannot fully test protected screens.

Controlled comparison for `/maps` -> `/catalog` -> `/maps`:

| Setting | Mounts | Distinct observed instances |
| --- | ---: | ---: |
| Reuse disabled | 2 | 2 |
| Reuse enabled | 2 | 1 |

All 19 browser checks passed with no browser exceptions: country switching, marker visibility after switching/returning, dark/light, a 390px mobile viewport, and add-stop lazy creation/list-map retention. These are lifecycle observations, not a claim that the production bill will be halved. Reuse applies within the current client session; a full page reload or a new tab still creates a map. For a disabled baseline, build with reuse=false and run the browser script with `MAP_CHECK_EXPECT_REUSE=false`.

## Counters

Development exposes `window.__mapCostDiagnostics.snapshot()` after the first tracked operation. Production counters are off unless the build sets `NEXT_PUBLIC_MAP_COST_DIAGNOSTICS=true`. They store counts only: no keys, tokens, search text, addresses or coordinates. They send nothing to another service.

Use a fresh page per comparison. `mapInstancesSeen` counts distinct objects observed by the app, not finalized billable loads. React Strict Mode can repeat mount effects; compare production-mode builds. `reset()` also forgets previously seen objects.

## Production and Cloud account checks

Before deployment, check real staging buyer/non-buyer/editor flows: pins, popups, category filters, search, geolocation, satellite, navigation and forms. Record Dynamic Maps, Geocoding and Places usage separately against comparable traffic. Deploy through the normal release process, monitor errors and compare finalized billing over equivalent traffic periods.

Account settings cannot be verified from the repository and were not changed:

- Google Maps Platform -> Credentials: check production browser-key referrer restrictions for every real hostname and appropriate API restrictions. Use separate development/staging keys.
- Keep server keys separate, with API/IP restrictions appropriate to their deployment. Retain services required by existing admin/photo workflows.
- Billing -> Reports: compare Dynamic Maps, Geocoding and Places separately. Check account-wide usage before disabling APIs shared by other apps.
- Billing -> Budgets & alerts: use thresholds matching the owner's budget. Alerts do not cap spending.
- Google Maps Platform -> Quotas: measure peak traffic before adjusting limits. Low limits can interrupt real users.

No usable connected Google Cloud Billing/Maps administration integration was found. Account verification and actual savings require the project owner's Cloud Console access. No quotas, keys or billing settings were changed.

## Rollback

`NEXT_PUBLIC_*` settings are compiled into the frontend. Set `NEXT_PUBLIC_GOOGLE_MAP_REUSE=false`, rebuild and deploy to disable main-map reuse. Restarting an old build with a changed environment value is insufficient. For other regressions, redeploy the previous known-good artifact. Restore production diagnostics to default-off after measurement.
