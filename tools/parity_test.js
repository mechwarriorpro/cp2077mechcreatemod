/* CET <-> browser telemetry parity harness.
   Runs the real Lua MF.compute() (Fengari + CET stubs) and the real browser
   MF.sim.compute() on the SAME default design, then reports relative deltas.
   A small tolerance is expected: CET uses a compact derive() mirror. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const KEYS = ['powerMargin','totalMass','netHeat','rcsFront','speed','detectRange',
  'jamStrength','temperature','powerUsed','heatGen','heatDiss','moduleScale'];

/* ---- Lua side ---- */
const luaOut = execFileSync(process.execPath,
  [path.join(__dirname, 'lua_test.js'), '--telemetry-json'], { encoding: 'utf8' });
const m = luaOut.match(/MF_TELEMETRY=([^\n]+)/);
if (!m) { console.error('no telemetry from lua_test.js'); process.exit(1); }
const vals = m[1].split('|').map(Number);
if (vals.length !== KEYS.length || vals.some((v) => !Number.isFinite(v))) {
  console.error('bad telemetry payload', m[1]); process.exit(1);
}
const lua = Object.fromEntries(KEYS.map((k, i) => [k, vals[i]]));

/* ---- Browser side ---- */
const vc = new VirtualConsole();
const ctxCache = new WeakMap();
function makeCtx() {
  const t = {};
  return new Proxy(t, {
    get(o, k) { if (k in o) return o[k]; if (k === 'canvas') return null; return () => undefined; },
    set(o, k, v) { o[k] = v; return true; }
  });
}
const html = fs.readFileSync(path.join(ROOT, 'test_build.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://parity.local/',
  virtualConsole: vc, beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = function () {
      if (!ctxCache.has(this)) ctxCache.set(this, makeCtx());
      return ctxCache.get(this);
    };
    w.URL.createObjectURL = () => 'b'; w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = () => {};
    w.requestAnimationFrame = () => 0;
  } });
const MF = dom.window.MF;
if (!MF || !MF.sim) { console.error('browser MF.sim missing'); process.exit(1); }
const t = MF.sim.compute(MF.activeDesign());
const browser = {
  powerMargin: t.powerMargin, totalMass: t.totalMass, netHeat: t.netHeat,
  rcsFront: t.rcsFront, speed: t.speed, detectRange: t.detectRange,
  jamStrength: t.jamStrength, temperature: t.temperature,
  powerUsed: t.powerUsed, heatGen: t.heatGen, heatDiss: t.heatDiss,
  moduleScale: t.moduleScale
};

/* ---- Compare ---- */
const TOL = 0.12;   // 12% documented tolerance for the compact CET mirror
let worst = 0, worstKey = '';
console.log('CET / browser telemetry parity (' + MF.activeDesign().name + ')');
for (const k of KEYS) {
  const a = browser[k], b = lua[k];
  const rel = Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
  if (rel > worst) { worst = rel; worstKey = k; }
  console.log('  ' + k.padEnd(14) + ' browser=' + a.toFixed(3).padStart(12) +
    '  CET=' + b.toFixed(3).padStart(12) + '  Δ=' + (rel * 100).toFixed(2) + '%' +
    (rel > TOL ? '  <-- OVER TOLERANCE' : ''));
}
console.log('worst delta: ' + worstKey + ' ' + (worst * 100).toFixed(2) + '% (tolerance ' + (TOL * 100) + '%)');
if (worst > TOL) { console.error('*** PARITY TEST FAILED ***'); process.exit(1); }
console.log('*** PARITY TEST PASSED ***');
