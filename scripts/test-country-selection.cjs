const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(file, dependencies, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", ...Object.keys(globals), code)(
    name => {
      assert.ok(name in dependencies, `Unmocked dependency: ${name}`);
      return dependencies[name];
    }, exports, ...Object.values(globals),
  );
  return exports;
}

// Exercise real components through mount effects and user change handlers.
function harness(storage, session = new Map(), maps = [
  { _id: "pr", name: { en: "Puerto Rico", es: "Puerto Rico" }, country: "Puerto Rico" },
  { _id: "us", name: { en: "United States", es: "Estados Unidos" }, country: "USA" },
]) {
  const slots = [];
  let index, effects, dirty;
  const react = {
    useState(initial) {
      const slot = index++;
      slots[slot] ||= { value: typeof initial === "function" ? initial() : initial };
      return [slots[slot].value, value => {
        const next = typeof value === "function" ? value(slots[slot].value) : value;
        dirty ||= !Object.is(next, slots[slot].value);
        slots[slot].value = next;
      }];
    },
    useMemo(fn, deps) {
      const slot = index++;
      if (!slots[slot] || deps.some((dep, i) => !Object.is(dep, slots[slot].deps[i]))) {
        slots[slot] = { value: fn(), deps };
      }
      return slots[slot].value;
    },
    useEffect(fn, deps) {
      const slot = index++;
      if (!slots[slot] || deps.some((dep, i) => !Object.is(dep, slots[slot].deps[i]))) {
        slots[slot] = { deps };
        effects.push(fn);
      }
    },
  };
  const wrapStorage = data => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) });
  const globals = {
    localStorage: wrapStorage(storage), sessionStorage: wrapStorage(session),
    window: { addEventListener() {}, removeEventListener() {} },
    setTimeout: () => 1, clearTimeout() {},
  };
  const jsx = (type, props) => ({ type, props });
  const dummy = new Proxy({}, { get: (_, key) => key });
  const requests = [];
  const dependencies = {
    react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "@/redux/features/map/mapApi": { useGetMapsQuery: () => ({ data: { data: maps }, isLoading: false }) },
    "@/lib/i18n/LanguageContext": { useLanguage: () => ({ language: "es", t: key => key }) },
    "@/lib/utils": { getLocalized: (name, lang) => typeof name === "string" ? name : name?.[lang] || "" },
    "@/lib/offer-country": load("lib/offer-country.ts", {}),
    "@/redux/features/user/userApi": { useGetProfileQuery: () => ({}) },
    "@/redux/features/visited/visitedApi": { useGetMyVisitedPlacesQuery: () => ({}) },
    "@/redux/features/category/categoryApi": { useGetCategoriesQuery: () => ({}) },
    "@/redux/features/place/placeApi": { useGetPlacesQuery: (args, options) => {
      if (!options.skip) requests.push(args);
      return { data: { data: [] }, isLoading: false };
    } },
    "@/components/ui/button": dummy, "@/components/ui/input": dummy,
    "lucide-react": dummy, "next/link": dummy, sonner: dummy,
    "./place-card": dummy, "@/lib/place-access": dummy,
  };
  const shared = load("components/shared/country-filter.tsx", dependencies, globals);
  dependencies["@/components/shared/country-filter"] = shared;
  const Places = load("components/Common/places/explore-places.tsx", dependencies, globals).default;
  return {
    shared, Places, requests,
    render(component) {
      let result, passes = 0;
      do {
        assert.ok(passes++ < 20, "effects must settle");
        index = 0; effects = []; dirty = false;
        result = component();
        effects.forEach(fn => fn());
      } while (dirty);
      return result;
    },
  };
}

test("Map to Places uses latest shared ID over stale Places country, page and scroll", () => {
  const storage = new Map([["selectedMapId", "us"], ["selectedCountryFilter", "United States"]]);
  const session = new Map([["explore_places_state", JSON.stringify({ selectedCountry: "Puerto Rico", selectedMapId: "pr", page: 4, scrollY: 800 })]]);
  const app = harness(storage, session);
  app.render(app.Places);
  assert.ok(app.requests.length);
  assert.ok(app.requests.every(request => request.map === "us" && request.page === 1));
  assert.equal(storage.get("selectedMapId"), "us");
});

test("changing country updates both storage keys for other pages and reloads", () => {
  const storage = new Map([["selectedMapId", "pr"], ["selectedCountryFilter", "Puerto Rico"]]);
  const app = harness(storage);
  const filter = app.render(() => app.shared.useCountryFilter({ allowAll: false }));
  filter.change("us");
  assert.equal(storage.get("selectedMapId"), "us");
  assert.equal(storage.get("selectedCountryFilter"), "USA");
  const nextPage = harness(storage);
  const next = nextPage.render(() => nextPage.shared.useCountryFilter({ allowAll: false }));
  assert.equal(next.mapId, "us");
  assert.equal(next.country, "USA");
});

test("Places preserves pagination when returning to the same country", () => {
  const storage = new Map([["selectedMapId", "us"], ["selectedCountryFilter", "United States"]]);
  const session = new Map([["explore_places_state", JSON.stringify({ selectedMapId: "us", page: 4 })]]);
  const app = harness(storage, session);
  app.render(app.Places);
  assert.ok(app.requests.every(request => request.map === "us" && request.page === 4));
});

test("a selected map absent from the catalogue page keeps its ID instead of defaulting", () => {
  const storage = new Map([["selectedMapId", "outside-page"]]);
  const app = harness(storage);
  const filter = app.render(() => app.shared.useCountryFilter({ allowAll: false }));
  assert.equal(filter.value, "outside-page");
  assert.equal(filter.mapId, "outside-page");
});

test("country names saved in another language still resolve without an ID", () => {
  const app = harness(new Map([["selectedCountryFilter", "United States"]]));
  app.render(app.Places);
  assert.ok(app.requests.every(request => request.map === "us"));
});
