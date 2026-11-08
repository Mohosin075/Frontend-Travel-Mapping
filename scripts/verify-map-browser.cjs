// Read-only smoke check against a local frontend and a dedicated headless Chrome.
// Launch Chrome with --remote-debugging-port=9226 and a separate temporary profile.
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const base = process.env.MAP_CHECK_URL || "http://127.0.0.1:3011";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) {
    throw new Error("This check is restricted to a local frontend.");
  }
  const targets = await fetch("http://127.0.0.1:9226/json/list").then((r) => r.json());
  const target = targets.find((t) => t.type === "page" && !t.url.startsWith("chrome"));
  if (!target) throw new Error("No dedicated browser tab found");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  const fixtures = process.env.MAP_CHECK_FIXTURES === "true";
  const expectReuse = process.env.MAP_CHECK_EXPECT_REUSE !== "false";
  const fixtureMaps = [
    { _id: "000000000000000000000001", name: "Puerto Rico", country: "Puerto Rico", isPaid: false, images: [], status: "Published" },
    { _id: "000000000000000000000002", name: "Dominican Republic", country: "Dominican Republic", isPaid: false, images: [], status: "Published" },
  ];
  const fixtureCategory = { _id: "000000000000000000000003", name: "Beach", icon: "🏖️", color: "#ff9800", isBusiness: false };
  let fixtureRequests = 0;
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const operation = pending.get(message.id);
      if (!operation) return;
      pending.delete(message.id);
      if (message.error) operation.reject(new Error(message.error.message));
      else operation.resolve(message.result);
    } else if (message.method === "Fetch.requestPaused") {
      const request = message.params;
      fixtureRequests += 1;
      const url = new URL(request.request.url);
      let data = [];
      if (url.pathname.endsWith("/user/profile")) {
        data = { _id: "fixture-user", name: "Map test", role: "user", country: "Puerto Rico", purchasedMaps: [], visitedPlaces: [] };
      } else if (url.pathname.endsWith("/map")) data = fixtureMaps;
      else if (url.pathname.endsWith("/category")) data = [fixtureCategory];
      else if (url.pathname.endsWith("/map/discovery")) {
        const map = fixtureMaps.find(m => m._id === url.searchParams.get("map")) || fixtureMaps[0];
        data = { data: [{
          _id: "000000000000000000000010", name: "Fixture beach", address: "Test address",
          map, category: fixtureCategory, status: "Published", type: "place", media: [],
          location: { mapLocation: { type: "Point", coordinates: map === fixtureMaps[0] ? [-66.5901, 18.2208] : [-70.1627, 18.7357] } },
        }] };
      }
      void send("Fetch.fulfillRequest", {
        requestId: request.requestId,
        responseCode: 200,
        responseHeaders: [
          { name: "Content-Type", value: "application/json" },
          { name: "Access-Control-Allow-Origin", value: base },
          { name: "Access-Control-Allow-Credentials", value: "true" },
          { name: "Access-Control-Allow-Headers", value: "authorization,content-type,accept-language" },
        ],
        body: Buffer.from(JSON.stringify({ success: true, data })).toString("base64"),
      }).catch((error) => exceptions.push(error.message));
    } else if (message.method === "Runtime.exceptionThrown") {
      exceptions.push(message.params.exceptionDetails.exception?.description?.split("\n")[0] || "Browser exception");
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error("Browser evaluation failed");
    return result.result.value;
  };
  const clickElement = async (selector, text) => {
    const point = await evaluate(`(() => {
      const el = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(e => {
        const r = e.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
        return r.width > 0 && r.height > 0 && e.contains(hit) && ${text ? `e.textContent.includes(${JSON.stringify(text)})` : "true"};
      });
      if (!el) return null;
      const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    if (!point) return false;
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
    return true;
  };
  const waitFor = async (expression, timeout = 45000) => {
    const started = Date.now();
    do {
      try { if (await evaluate(expression)) return true; } catch { /* Navigation can replace the context. */ }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } while (Date.now() - started < timeout);
    return false;
  };
  const report = { mode: fixtures ? "mocked app API, real Google Maps SDK" : "anonymous live API", checks: {}, exceptions };
  const destination = path.join(__dirname, "..", ".next", "map-cost-verification");
  fs.mkdirSync(destination, { recursive: true });
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.clearDeviceMetricsOverride");
    if (fixtures) {
      await send("Network.enable");
      await send("Network.setBlockedURLs", { urls: ["*socket.io*"] });
      await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
      await send("Network.setCookie", { name: "loggedIn", value: "1", url: base, path: "/" });
    }
    await send("Page.addScriptToEvaluateOnNewDocument", { source: `
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('app_language', 'en');
      ${fixtures ? `localStorage.setItem('persist:auth', JSON.stringify({
        user: JSON.stringify({id:'fixture-user',name:'Map test',role:'user'}),
        accessToken: JSON.stringify('local-map-test-only'),
        _persist: JSON.stringify({version:-1,rehydrated:true})
      }));
      localStorage.setItem('selectedMapId', '000000000000000000000001');
      localStorage.setItem('selectedCountryFilter', 'Puerto Rico');` : ""}
      Object.defineProperty(navigator, 'geolocation', { value: {
        getCurrentPosition(success) { setTimeout(() => success({coords: {latitude: 18.2208, longitude: -66.5901}}), 0); }
      }});
    ` });
    await send("Page.navigate", { url: `${base}/maps` });
    report.checks.mapMounted = await waitFor("!!window.__mapCostDiagnostics?.snapshot().totals.mapInstancesSeen");
    if (fixtures) await waitFor("!!document.querySelector('.explorer-map-canvas [role=\"combobox\"]')", 15000);
    if (fixtures) report.checks.markersVisible = await waitFor("!!document.querySelector('.explorer-map-canvas .cat-marker-root')", 10000);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    report.initial = await evaluate(`({
      path: location.pathname,
      counters: window.__mapCostDiagnostics?.snapshot(),
      maps: document.querySelectorAll('.gm-style').length,
      dark: document.documentElement.classList.contains('dark'),
      background: document.querySelector('.explorer-map-canvas .gm-style') && getComputedStyle(document.querySelector('.explorer-map-canvas .gm-style')).backgroundColor,
      googleError: !!document.querySelector('.gm-err-container'),
      selectors: Array.from(document.querySelectorAll('[role="combobox"]')).map(e => e.textContent),
      buttons: Array.from(document.querySelectorAll('button[aria-label]')).map(e => e.getAttribute('aria-label'))
    })`);
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(destination, "desktop.png"), Buffer.from(screenshot.data, "base64"));
    if (report.checks.mapMounted && !report.initial.googleError) {
      if (fixtures) {
        await clickElement('.explorer-map-canvas [role="combobox"]');
        await waitFor("Array.from(document.querySelectorAll('[role=option]')).some(e=>e.textContent.includes('Dominican Republic'))", 5000);
        await clickElement('[role="option"]', 'Dominican Republic');
        report.checks.mapSwitch = await waitFor("localStorage.getItem('selectedMapId') === '000000000000000000000002'", 5000);
        report.checks.markersAfterSwitch = await waitFor("!!document.querySelector('.explorer-map-canvas .cat-marker-root')", 10000);
        report.checks.filterKeepsInstance = await evaluate("window.__mapCostDiagnostics.snapshot().totals.mapInstancesSeen === 1");
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (!await clickElement('button[aria-label="Switch to light mode"]')) {
          await clickElement('button[aria-label="Toggle menu"]');
          await new Promise((resolve) => setTimeout(resolve, 250));
          await clickElement('button[aria-label="Switch to light mode"]');
        }
        report.checks.lightTheme = await waitFor("!document.documentElement.classList.contains('dark')", 5000);
        await clickElement('button[aria-label="Switch to dark mode"]');
        report.checks.darkTheme = await waitFor("document.documentElement.classList.contains('dark')", 5000);
        await clickElement('button[aria-label="Close menu"]');
        report.checks.themeKeepsInstance = await evaluate("window.__mapCostDiagnostics.snapshot().totals.mapInstancesSeen === 1");
      }
      const clicked = await evaluate(`(() => {
        const a = document.querySelector('a[href="/catalog"]');
        if (!a) return false; a.click(); return true;
      })()`);
      report.checks.clientNavigationAway = clicked && await waitFor("location.pathname === '/catalog'");
      if (report.checks.clientNavigationAway) {
        const returned = await evaluate(`(() => {
          const a = document.querySelector('a[href="/maps"]');
          if (!a) return false; a.click(); return true;
        })()`);
        report.checks.clientNavigationBack = returned && await waitFor("location.pathname === '/maps' && !!document.querySelector('.gm-style')");
        report.afterReturn = await evaluate("window.__mapCostDiagnostics?.snapshot()");
        report.observedReuse = report.checks.clientNavigationBack &&
          report.afterReturn?.totals.mapMounts > report.initial.counters?.totals.mapMounts &&
          report.afterReturn?.totals.mapInstancesSeen === report.initial.counters?.totals.mapInstancesSeen;
        report.checks.expectedReuseBehavior = report.observedReuse === expectReuse;
        report.checks.markersAfterReturn = await waitFor("!!document.querySelector('.explorer-map-canvas .cat-marker-root')", 10000);
      }
      await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await new Promise((resolve) => setTimeout(resolve, 700));
      report.mobile = await evaluate(`({
        counters: window.__mapCostDiagnostics?.snapshot(),
        mapWidth: document.querySelector('.gm-style')?.getBoundingClientRect().width,
        bodyWidth: document.body.scrollWidth,
        viewport: innerWidth
      })`);
      report.checks.responsiveMap = report.mobile.mapWidth > 0;
      const mobileShot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(destination, "mobile.png"), Buffer.from(mobileShot.data, "base64"));
      if (fixtures) {
        await send("Emulation.clearDeviceMetricsOverride");
        const routeLink = await evaluate(`(() => {
          const a = document.querySelector('a[href="/route-planner"]');
          if (!a) return false; a.click(); return true;
        })()`);
        if (!routeLink) await send("Page.navigate", { url: `${base}/route-planner?mode=create` });
        report.checks.routePlannerNavigation = await waitFor("location.pathname === '/route-planner'");
        if (report.checks.routePlannerNavigation) {
          if (routeLink) await clickElement('a[href="/route-planner?mode=create"]');
          await waitFor("Array.from(document.querySelectorAll('button')).some(e=>e.textContent.includes('Add stop'))", 5000);
          await evaluate("Array.from(document.querySelectorAll('button')).find(e=>e.textContent.includes('Add stop'))?.scrollIntoView({block:'center'})");
          await clickElement('button', 'Add stop');
          report.checks.addStopOpened = await waitFor("!!document.querySelector('[role=dialog]')", 5000);
          report.checks.addStopLazy = await evaluate("!document.querySelector('[role=dialog] .gm-style')");
          await clickElement('[role="dialog"] button', 'Map');
          report.checks.addStopMap = await waitFor("!!document.querySelector('[role=dialog] .gm-style')", 10000);
          await evaluate("window.__addStopMapElement = document.querySelector('[role=dialog] .gm-style')");
          await clickElement('[role="dialog"] button', 'List');
          await clickElement('[role="dialog"] button', 'Map');
          await new Promise((resolve) => setTimeout(resolve, 350));
          report.checks.addStopRetained = await evaluate("!!window.__addStopMapElement && document.querySelector('[role=dialog] .gm-style') === window.__addStopMapElement");
          report.checks.addStopVisibleAfterTabSwitch = await evaluate("document.querySelector('[role=dialog] .gm-style')?.getBoundingClientRect().width > 0");
        }
      }
    }
    report.fixtureRequests = fixtureRequests;
    report.allPassed = Object.values(report.checks).every(Boolean) && exceptions.length === 0;
    fs.writeFileSync(path.join(destination, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.allPassed) process.exitCode = 1;
  } finally {
    socket.close();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
