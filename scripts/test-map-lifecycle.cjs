const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(file, dependencies, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", ...Object.keys(globals), code)(
    (name) => {
      if (!(name in dependencies)) throw new Error(`Unmocked dependency ${name}`);
      return dependencies[name];
    }, loaded.exports, ...Object.values(globals),
  );
  return loaded.exports;
}

// A controlled hook host tests effects and async ordering against the actual
// components. Rendering/Google SDK behavior is checked by verify-map-browser.cjs.
function host() {
  const slots = [];
  let index;
  let effects;
  let dirty;
  let tree;
  const frames = [];
  const react = {
    useState(initial) {
      const slot = index++;
      if (!slots[slot]) slots[slot] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[slot].value, (value) => {
        const next = typeof value === "function" ? value(slots[slot].value) : value;
        if (!Object.is(next, slots[slot].value)) dirty = true;
        slots[slot].value = next;
      }];
    },
    useRef(initial) { return slots[index++] ||= { current: initial }; },
    useMemo(callback, deps) {
      const slot = index++;
      if (!slots[slot] || deps.some((dep, i) => !Object.is(dep, slots[slot].deps[i]))) {
        slots[slot] = { value: callback(), deps };
      }
      return slots[slot].value;
    },
    useEffect(callback, deps) {
      const slot = index++;
      const previous = slots[slot];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
        slots[slot] = { deps, cleanup: previous?.cleanup };
        effects.push(() => {
          slots[slot].cleanup?.();
          slots[slot].cleanup = callback();
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  function render(component, attachRefs) {
    let passes = 0;
    do {
      assert.ok(passes++ < 25, "effects should settle");
      dirty = false; index = 0; effects = [];
      tree = component();
      frames.push(tree);
      attachRefs?.(tree);
      effects.forEach((effect) => effect());
    } while (dirty);
    return tree;
  }
  function nodes(match, node = tree) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap((child) => nodes(match, child));
    return [...(match(node) ? [node] : []), ...nodes(match, node.props?.children ?? null)];
  }
  return {
    react, render, nodes, frames,
    jsx: { jsx, jsxs: jsx, Fragment: "Fragment" },
    unmount: () => slots.forEach((slot) => slot?.cleanup?.()),
  };
}

const settle = () => new Promise(setImmediate);
const dummy = new Proxy({}, { get: (_, key) => String(key) });

function businessHarness() {
  const hooks = host();
  const values = { country: "Puerto Rico", mapLocation: { lat: 18, lng: -66 } };
  const lookups = [];
  const errors = [];
  const confirmations = [];
  const form = {
    watch: (name) => values[name], getValues: (name) => values[name], register: () => ({}),
    setValue: (name, value) => { values[name] = value; },
  };
  const maps = { data: { data: [{ name: "Puerto Rico", country: "Puerto Rico" }] } };
  const dependencies = {
    react: hooks.react, "react/jsx-runtime": hooks.jsx,
    "@/components/shared/maps/map-cost-observer": dummy,
    "@/components/shared/maps/animated-map-pin": dummy,
    "@/components/shared/maps/CustomLocationButton": dummy,
    "@/components/shared/maps/location-search": { LocationSearch: "LocationSearch" },
    "@/components/ui/button": dummy, "@/components/ui/input": dummy, "@/components/ui/label": dummy,
    "@/lib/map-country": load("lib/map-country.ts", {}),
    "@/lib/maps/geocode": { fetchGeocodeJson: (url) => new Promise((resolve, reject) => lookups.push({ url, resolve, reject })) },
    "@/lib/parse-maps-url": dummy,
    "@/redux/features/place/placeApi": { useExtractCoordinatesMutation: () => [() => {}] },
    "@/redux/features/map/mapApi": { useGetMapsQuery: () => maps },
    "@vis.gl/react-google-maps": { APIProvider: "Provider", Map: "GoogleMap", useMap: () => null },
    sonner: { toast: { error: (message) => errors.push(message), success() {} } },
    "@/lib/app-alert": { appAlert: { fire: async () => { confirmations.push(true); return { isConfirmed: true }; } } },
    "@/lib/i18n/LanguageContext": { useLanguage: () => ({ t: (key) => key }) },
  };
  const { BusinessFormStep2 } = load("components/Common/for-business/business-form-step2.tsx", dependencies, {
    process: { env: { NEXT_PUBLIC_GOOGLE_MAP_API_KEY: "fixture-only" } },
  });
  const render = () => hooks.render(() => BusinessFormStep2({ form }));
  const search = () => hooks.nodes((node) => node.type === "LocationSearch")[0];
  const respond = (index, country = "Puerto Rico") => lookups[index].resolve({ status: "OK", results: [{
    geometry: { location: { lat: 18, lng: -66 } },
    address_components: [{ types: ["country"], long_name: country }],
    formatted_address: "Test address",
  }] });
  render();
  return { ...hooks, render, search, respond, values, lookups, errors, confirmations };
}

test("business pin changes do not re-geocode the same country", async () => {
  const h = businessHarness();
  assert.equal(h.lookups.length, 1);
  h.respond(0);
  await settle(); h.render();
  h.values.mapLocation = { lat: 18.4, lng: -66.2 };
  h.render();
  assert.equal(h.lookups.length, 1);
  h.values.country = "Dominican Republic";
  h.render();
  assert.equal(h.lookups.length, 2);
});

test("failed business pin lookup releases loading and preserves the saved pin", async () => {
  const h = businessHarness();
  const saved = h.values.mapLocation;
  h.respond(0); await settle(); h.render();
  h.search().props.onPick(18.4, -66.2); h.render();
  assert.equal(h.search().props.disabled, true);
  h.lookups[1].reject(new Error("Network error"));
  await settle(); h.render();
  assert.equal(h.search().props.disabled, false);
  assert.equal(h.values.mapLocation, saved);
  assert.equal(h.errors.length, 1);
});

test("country change or unmount prevents a pending business pin from committing", async () => {
  for (const unmount of [false, true]) {
    const h = businessHarness();
    const saved = h.values.mapLocation;
    h.respond(0); await settle(); h.render();
    h.search().props.onPick(18.4, -66.2); h.render();
    if (unmount) h.unmount();
    else { h.values.country = "Dominican Republic"; h.render(); }
    h.respond(1);
    await settle();
    assert.equal(h.values.mapLocation, saved);
    assert.equal(h.confirmations.length, 0);
    assert.equal(h.errors.length, 0);
  }
});

test("successful business pin selection still confirms an update and fills the address", async () => {
  const h = businessHarness();
  h.respond(0); await settle(); h.render();
  h.search().props.onPick(18.4, -66.2); h.render();
  h.respond(1); await settle(); h.render();
  assert.deepEqual(h.values.mapLocation, { lat: 18.4, lng: -66.2 });
  assert.equal(h.values.streetAddress, "Test address");
  assert.equal(h.confirmations.length, 1);
  assert.equal(h.lookups.length, 2);
});

test("offscreen map waits for intersection and remains mounted after scrolling away", () => {
  const hooks = host();
  let notify;
  let disconnected = 0;
  const { useMapVisibility } = load("components/shared/maps/use-map-visibility.ts", { react: hooks.react }, {
    IntersectionObserver: class {
      constructor(callback) { notify = callback; }
      observe() {}
      disconnect() { disconnected += 1; }
    },
  });
  const render = () => hooks.render(useMapVisibility, (value) => { value.containerRef.current = {}; });
  assert.equal(render().visible, false);
  notify([{ isIntersecting: false }]);
  assert.equal(render().visible, false);
  notify([{ isIntersecting: true }]);
  assert.equal(render().visible, true);
  assert.equal(disconnected, 1);
  hooks.unmount();
  assert.equal(disconnected, 2);
});

test("visibility falls back to rendering when IntersectionObserver is unavailable", () => {
  const hooks = host();
  const { useMapVisibility } = load("components/shared/maps/use-map-visibility.ts", { react: hooks.react }, {
    IntersectionObserver: undefined,
  });
  const value = hooks.render(useMapVisibility, (result) => { result.containerRef.current = {}; });
  assert.equal(value.visible, true);
});

test("clearing a business pin invalidates a previous pending lookup", async () => {
  const h = businessHarness();
  h.respond(0); await settle(); h.render();
  h.search().props.onPick(18.4, -66.2); h.render();
  const clear = h.nodes(node => node.type === "Button" && node.props.children === "for_business.step2.clear_location")[0];
  await clear.props.onClick();
  h.respond(1); await settle(); h.render();
  assert.equal(h.values.mapLocation, null);
  assert.equal(h.search().props.disabled, false);
});

test("clearing a saved business pin restores the country camera without another lookup", async () => {
  const h = businessHarness();
  h.respond(0); await settle(); h.render();
  const mapContent = () => h.nodes(node => node.type?.name === "MapContent")[0];
  assert.equal(mapContent().props.defaultZoom, 15);
  const clear = h.nodes(node => node.type === "Button" && node.props.children === "for_business.step2.clear_location")[0];
  await clear.props.onClick(); h.render();
  assert.equal(mapContent().props.defaultZoom, 7);
  assert.equal(h.lookups.length, 1);
});

test("add-stop map is lazy and retained across list/filter changes within an open modal", () => {
  const hooks = host();
  const query = { data: { data: [] }, isLoading: false };
  const dependencies = {
    react: hooks.react, "react/jsx-runtime": hooks.jsx,
    "./route-modal-layer": { default: "Layer" },
    "@/lib/place-access": { canRevealPlace: () => true },
    "@/components/Common/maps/map": { HIDE_GOOGLE_POI_STYLES: [] },
    "@/components/shared/maps/map-cost-observer": dummy,
    "lucide-react": dummy, "next/link": { default: "Link" },
    "@/redux/features/place/placeApi": { useGetPlacesQuery: () => query },
    "@/redux/features/category/categoryApi": { useGetCategoriesQuery: () => query },
    "@/redux/features/map/mapApi": { useGetMapsQuery: () => query },
    "@/redux/features/user/userApi": { useGetProfileQuery: () => query },
    "@/components/shared/safe-image": dummy, "@/lib/others/others": dummy,
    "@/lib/utils": { getLocalized: value => value || "", getUsableMediaUrl: () => "" },
    "@/lib/i18n/LanguageContext": { useLanguage: () => ({ t: key => key, language: "en" }) },
    "@/components/shared/categories/category-icon": dummy,
    "@vis.gl/react-google-maps": { Map: "GoogleMap", AdvancedMarker: "Marker" },
    "next-themes": { useTheme: () => ({ resolvedTheme: "dark" }) },
  };
  const { default: AddStopModal } = load("components/Common/route-planner/add-stop-modal.tsx", dependencies);
  const props = { isOpen: true, onClose() {}, onSelectPlace() {} };
  const render = () => hooks.render(() => AddStopModal(props));
  const maps = () => hooks.nodes(node => node.type === "GoogleMap");
  const text = node => typeof node === "string" ? node : Array.isArray(node) ? node.map(text).join("") : text(node?.props?.children || "");
  const clickTab = label => hooks.nodes(node => node.type === "button" && text(node).includes(label))[0].props.onClick();
  render(); assert.equal(maps().length, 0);
  clickTab("route_planner.tab_map"); render(); assert.equal(maps().length, 1);
  clickTab("route_planner.tab_list"); render(); assert.equal(maps().length, 1);
  query.isLoading = true; render(); assert.equal(maps().length, 1);
  query.isLoading = false; render(); assert.equal(maps().length, 1);
  props.isOpen = false; render(); assert.equal(maps().length, 0);
  props.isOpen = true; render(); assert.equal(maps().length, 0);
});
