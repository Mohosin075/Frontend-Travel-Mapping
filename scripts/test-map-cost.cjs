const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Exercise the actual TypeScript without adding production dependencies.
function load(file, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    }, loaded, loaded.exports, ...Object.values(globals),
  );
  return loaded.exports;
}

test("concurrent identical geocoding calls share one request; completed results are not cached", async () => {
  const { geocodeInFlight } = load("lib/maps/geocode.ts");
  const callbacks = [];
  const geocoder = { geocode: (_, callback) => callbacks.push(callback) };
  const first = geocodeInFlight(geocoder, { address: "Puerto Rico" });
  const second = geocodeInFlight(geocoder, { address: "Puerto Rico" });
  assert.equal(first, second);
  assert.equal(callbacks.length, 1);
  callbacks[0]([], "OK");
  await first;
  const third = geocodeInFlight(geocoder, { address: "Puerto Rico" });
  assert.equal(callbacks.length, 2);
  callbacks[1](null, "ZERO_RESULTS");
  assert.equal((await third).status, "ZERO_RESULTS");
});

test("different geocoding requests remain independent and errors allow retry", async () => {
  const { geocodeInFlight } = load("lib/maps/geocode.ts");
  const callbacks = [];
  const geocoder = { geocode: (_, callback) => callbacks.push(callback) };
  const a = geocodeInFlight(geocoder, { location: { lat: 18, lng: -66 } });
  const b = geocodeInFlight(geocoder, { location: { lat: 19, lng: -66 } });
  assert.equal(callbacks.length, 2);
  callbacks.forEach((callback) => callback(null, "OVER_QUERY_LIMIT"));
  await Promise.all([a, b]);
  const broken = { geocode: () => { throw new Error("Unavailable"); } };
  await assert.rejects(geocodeInFlight(broken, { placeId: "retry" }), /Unavailable/);
  await assert.rejects(geocodeInFlight(broken, { placeId: "retry" }), /Unavailable/);
});

// A small hook host with controlled Google callbacks and debounce timers.
// It tests request ordering without loading Google or making billable requests.
function searchHarness() {
  const slots = [];
  let index = 0;
  let dirty = false;
  let effects = [];
  let tree;
  const timers = new Map();
  let timerId = 0;
  const predictions = [];
  const lookups = [];
  const picks = [];
  const props = { onPick: (...args) => picks.push(args), countryName: "Puerto Rico" };
  const react = {
    useState(initial) {
      const slot = index++;
      if (!slots[slot]) slots[slot] = { value: initial };
      return [slots[slot].value, (value) => {
        slots[slot].value = typeof value === "function" ? value(slots[slot].value) : value;
        dirty = true;
      }];
    },
    useRef(initial) {
      const slot = index++;
      return slots[slot] ||= { current: initial };
    },
    useEffect(callback, deps) {
      const slot = index++;
      const old = slots[slot];
      if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i]))) {
        slots[slot] = { deps, cleanup: old?.cleanup };
        effects.push(() => {
          slots[slot].cleanup?.();
          slots[slot].cleanup = callback();
        });
      }
    },
  };
  const libraries = {
    places: { AutocompleteService: class {
      getPlacePredictions(request, callback) { predictions.push({ request, callback }); }
    } },
    geocoding: { Geocoder: class {
      geocode(request, callback) { lookups.push({ request, callback }); }
    } },
  };
  const jsx = (type, props) => ({ type, props });
  const { LocationSearch } = load("components/shared/maps/location-search.tsx", {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": { Search: "SearchIcon" },
    "@vis.gl/react-google-maps": { useMapsLibrary: (name) => libraries[name] },
    "@/lib/maps/geocode": load("lib/maps/geocode.ts"),
  }, {
    window: {
      setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
      clearTimeout(id) { timers.delete(id); },
    },
    document: { addEventListener() {}, removeEventListener() {} },
  });
  function render() {
    let passes = 0;
    do {
      assert.ok(passes++ < 20, "render should settle");
      dirty = false;
      index = 0;
      effects = [];
      tree = LocationSearch(props);
      effects.forEach((effect) => effect());
    } while (dirty);
  }
  function nodes(type, node = tree) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap((child) => nodes(type, child));
    return [...(node.type === type ? [node] : []), ...nodes(type, node.props?.children ?? null)];
  }
  render();
  return {
    predictions, lookups, picks, props, render, nodes,
    change(value) { nodes("input")[0].props.onChange({ target: { value } }); render(); },
    flushTimers() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((cb) => cb()); render(); },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

test("search debounces typing, rejects stale responses, and does not geocode stale fallback", () => {
  const h = searchHarness();
  h.change("Be");
  h.change("Beach");
  h.flushTimers();
  assert.equal(h.predictions.length, 1);
  h.change("Forest");
  h.flushTimers();
  h.predictions[1].callback([{ description: "New forest", place_id: "new" }], "OK");
  h.predictions[0].callback(null, "ZERO_RESULTS");
  h.render();
  assert.equal(h.lookups.length, 0);
  assert.equal(h.nodes("button")[0].props.children, "New forest");
});

test("selection waits for geocoding, commits once, and does not search its own label", async () => {
  const h = searchHarness();
  h.change("Beach");
  h.flushTimers();
  h.predictions[0].callback([{ description: "Beach PR", place_id: "beach" }], "OK");
  h.render();
  h.nodes("button")[0].props.onClick();
  h.render();
  assert.equal(h.picks.length, 0);
  h.lookups[0].callback([{ geometry: { location: { lat: () => 18, lng: () => -66 } } }], "OK");
  await new Promise(setImmediate);
  h.render();
  h.flushTimers();
  assert.deepEqual(h.picks, [[18, -66, "Beach PR"]]);
  assert.equal(h.predictions.length, 1);
  assert.equal(h.nodes("button").length, 0);
});

test("editing or unmounting during a lookup prevents an old selection from committing", async () => {
  for (const unmount of [false, true]) {
    const h = searchHarness();
    h.change("Beach");
    h.flushTimers();
    h.predictions[0].callback([{ description: "Beach PR", place_id: "beach" }], "OK");
    h.render();
    h.nodes("button")[0].props.onClick();
    if (unmount) h.unmount(); else h.change("Forest");
    h.lookups[0].callback([{ geometry: { location: { lat: () => 18, lng: () => -66 } } }], "OK");
    await new Promise(setImmediate);
    assert.equal(h.picks.length, 0);
  }
});

test("disabled search sends no requests", () => {
  const h = searchHarness();
  h.change("Beach");
  h.props.disabled = true;
  h.render();
  h.flushTimers();
  assert.equal(h.predictions.length, 0);
  assert.equal(h.lookups.length, 0);
});

test("empty autocomplete falls back to geocoding and can select coordinates directly", async () => {
  const h = searchHarness();
  h.change("Beach");
  h.flushTimers();
  h.predictions[0].callback(null, "ZERO_RESULTS");
  assert.equal(h.lookups.length, 1);
  h.lookups[0].callback([{
    formatted_address: "Beach PR",
    geometry: { location: { lat: () => 18, lng: () => -66 } },
  }], "OK");
  await new Promise(setImmediate);
  h.render();
  h.nodes("button")[0].props.onClick();
  h.render();
  h.flushTimers();
  assert.deepEqual(h.picks, [[18, -66, "Beach PR"]]);
  assert.equal(h.lookups.length, 1);
  assert.equal(h.predictions.length, 1);
});

test("country change or clearing input invalidates a pending selection", async () => {
  for (const clear of [false, true]) {
    const h = searchHarness();
    h.change("Beach");
    h.flushTimers();
    h.predictions[0].callback([{ description: "Beach PR", place_id: "beach" }], "OK");
    h.render();
    h.nodes("button")[0].props.onClick();
    if (clear) h.change("");
    else { h.props.countryName = "Dominican Republic"; h.render(); }
    h.lookups[0].callback([{ geometry: { location: { lat: () => 18, lng: () => -66 } } }], "OK");
    await new Promise(setImmediate);
    assert.equal(h.picks.length, 0);
  }
});

test("a slow previous lookup does not block a newly typed selection or unlock a newer lookup", async () => {
  const h = searchHarness();
  h.change("Beach");
  h.flushTimers();
  h.predictions[0].callback([{ description: "Beach PR", place_id: "beach" }], "OK");
  h.render();
  h.nodes("button")[0].props.onClick();
  h.render();
  h.change("Forest");
  h.flushTimers();
  h.predictions[1].callback([{ description: "Forest PR", place_id: "forest" }], "OK");
  h.render();
  assert.equal(h.nodes("button")[0].props.disabled, false);
  h.nodes("button")[0].props.onClick();
  h.render();
  assert.equal(h.lookups.length, 2);
  h.lookups[0].callback(null, "ZERO_RESULTS");
  await new Promise(setImmediate);
  h.render();
  // Focusing the input may reopen existing suggestions, but the newer lookup
  // must still own the loading state until it completes.
  h.nodes("input")[0].props.onFocus();
  h.render();
  assert.equal(h.nodes("button")[0].props.disabled, true);
  h.lookups[1].callback([{ geometry: { location: { lat: () => 19, lng: () => -65 } } }], "OK");
  await new Promise(setImmediate);
  h.render();
  assert.deepEqual(h.picks, [[19, -65, "Forest PR"]]);
});

test("a rejected Google promise releases the shared request even without a callback", async () => {
  const { geocodeInFlight } = load("lib/maps/geocode.ts");
  let calls = 0;
  const geocoder = { geocode() {
    calls += 1;
    return Promise.reject(new Error("Network failure"));
  } };
  await assert.rejects(geocodeInFlight(geocoder, { address: "Retry" }), /Network failure/);
  await assert.rejects(geocodeInFlight(geocoder, { address: "Retry" }), /Network failure/);
  assert.equal(calls, 2);
});

test("a failed selection can be retried and rapid duplicate clicks only start one lookup", async () => {
  const h = searchHarness();
  h.change("Beach");
  h.flushTimers();
  h.predictions[0].callback([{ description: "Beach PR", place_id: "beach" }], "OK");
  h.render();
  const click = h.nodes("button")[0].props.onClick;
  click();
  click();
  assert.equal(h.lookups.length, 1);
  h.lookups[0].callback(null, "UNKNOWN_ERROR");
  await new Promise(setImmediate);
  h.render();
  assert.equal(h.picks.length, 0);
  h.nodes("input")[0].props.onFocus();
  h.render();
  assert.equal(h.nodes("button")[0].props.disabled, false);
  h.nodes("button")[0].props.onClick();
  assert.equal(h.lookups.length, 2);
  h.lookups[1].callback([{ geometry: { location: { lat: () => 18, lng: () => -66 } } }], "OK");
  await new Promise(setImmediate);
  assert.deepEqual(h.picks, [[18, -66, "Beach PR"]]);
});
