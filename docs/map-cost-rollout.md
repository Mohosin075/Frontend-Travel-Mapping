# Map cost changes: staged rollout

## Included in this change

- Location search keeps its existing 280 ms debounce and Google API flow.
- Selecting a suggestion no longer searches the selected label again.
- Superseded search/selection responses cannot overwrite newer input.
- Editing during a slow selection releases the old loading state; an old
  response cannot unlock a newer selection. Rapid duplicate clicks are ignored.
- Geocoding for search and the main map shares identical requests only while
  they are in flight. Completed responses, including errors, are not cached.
- A rejected Google geocoding promise releases its shared request even if the
  Google callback does not run, allowing a later lookup to retry.
- Main-map reverse geocoding ignores results after the location changes or the
  component unmounts.
- Main-map instance reuse is available behind
  `NEXT_PUBLIC_GOOGLE_MAP_REUSE=true`. It is **off by default**. No other map
  opts into the shared instance pool, avoiding options leaking between pickers
  and the main map.

No access rules, marker limits, theme behavior, Cloud keys, quotas, billing
configuration, or route calculation behavior are changed.

## Verification

Run `node --test scripts/test-map-cost.cjs` and `npm run build`.
The regression tests use controlled Google callbacks and timers; they make no
Google requests. They do not replace browser testing of Google map rendering.

Before enabling map reuse, test a staging build with the same installed Maps
library and a staging-restricted API key:

1. Check desktop and mobile maps, including tiles, markers, popups and controls.
2. Change country, category, search and selected place; verify the camera and
   access restrictions remain correct without creating another map instance.
3. Leave `/maps` and return repeatedly. Verify camera restoration, marker
   cleanup, no duplicate callbacks and no blank tiles. Check map instance counts
   in browser profiling rather than treating tile requests as new map loads.
4. Toggle dark/light mode, map/satellite, and desktop/mobile viewport repeatedly.
5. Open/close route and location-picker modals before returning to the main map;
   verify their options and markers do not leak into the main map.
6. Type quickly, clear search, change country mid-search, select a suggestion,
   and edit while its lookup is pending. Verify the chosen location is correct
   and no extra autocomplete request follows a successful selection.
7. Exercise failed and empty searches and confirm the next search still works.

Compare like-for-like navigation/search scenarios before and after, then compare
Google Cloud SKU usage over equivalent traffic periods. Do not infer a savings
percentage from these code changes alone.

## Enabling and rollback

`NEXT_PUBLIC_*` settings are compiled into the frontend. Enable reuse only in a
new build after staging verification; changing the running server environment
without rebuilding is insufficient. To turn it off, unset the setting or set it
to `false`, rebuild and deploy. If the default search changes regress, redeploy
the previous known-good frontend artifact.

## Separate follow-up work

- Browser validation and gradual enabling of main-map reuse.
- Audit other maps before enabling reuse: the library pools instances by map
  ID, color scheme and rendering type, and some options may persist on reuse.
- Evaluate an autocomplete session-token/details flow separately. This change
  keeps the existing autocomplete-to-geocoding flow and does not claim session
  billing savings.
- Audit business/admin geocoding and hidden-map mounting independently.
- Review key restrictions, separate production/staging keys, budget alerts and
  quotas in Google Cloud. Do not reduce production quotas without traffic data.
