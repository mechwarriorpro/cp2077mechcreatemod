const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'test_build.html'), 'utf8');

const ctxCache = new WeakMap();
function makeCtx() {
  const target = {};
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'canvas') return null;
      return (...args) => undefined;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: false,
  virtualConsole: vc,
  url: 'https://example.local/',
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = function () {
      if (!ctxCache.has(this)) ctxCache.set(this, makeCtx());
      return ctxCache.get(this);
    };
    w.URL.createObjectURL = () => 'blob:stub';
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
    let frames = 0;
    w.requestAnimationFrame = (cb) => { if (frames++ < 40) setTimeout(() => cb(frames * 16), 1); return frames; };
    w.cancelAnimationFrame = () => {};
    w.onerror = (msg, src, line, col, err) => { errors.push('window.onerror: ' + msg + ' @' + line + ':' + col + ' ' + (err && err.stack)); };
  }
});
const w = dom.window;
w.addEventListener('error', e => errors.push('error event: ' + (e.error && e.error.stack || e.message)));

function must(cond, msg) { if (!cond) throw new Error('ASSERT FAILED: ' + msg); console.log('  ok  ' + msg); }
function click(sel, root) {
  const el = (root || w.document).querySelector(sel);
  if (!el) throw new Error('missing element ' + sel);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  return el;
}
function input(sel, value) {
  const el = w.document.querySelector(sel);
  if (!el) throw new Error('missing input ' + sel);
  el.value = String(value);
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
  return el;
}
function change(sel, value) {
  const el = w.document.querySelector(sel);
  if (!el) throw new Error('missing select ' + sel);
  el.value = String(value);
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
  return el;
}

setTimeout(() => {
  try {
    const MF = w.MF;
    must(!!MF, 'MF global exists');
    const h = MF.health();
    must(h.tabs.length === 8, 'all 8 tabs registered: ' + h.tabs.join(','));
    must(h.data.length === 7, 'data bundle has 7 sections');
    must(Number.isFinite(h.powerMargin) && Number.isFinite(h.totalMass) && Number.isFinite(h.rcsFront), 'simulation produces finite telemetry');
    must(h.powerMargin > 0, 'baseline build has positive power margin (got ' + h.powerMargin.toFixed(1) + ')');
    must(h.validation.indexOf('BROWNOUT') < 0, 'baseline build is not in BROWNOUT');
    console.log('  health', JSON.stringify(h));

    // Tab sweep
    ['hangar','teardown','reactor','systems','forge','combat','dossier','settings'].forEach(tab => {
      MF.setTab(tab);
      const sec = w.document.getElementById('tab-' + tab);
      must(sec && sec.innerHTML.length > 100, 'tab ' + tab + ' renders');
    });
    must(MF.combat.active === true, 'entering COMBAT TEST auto-starts the harness');

    // INTERNAL SYSTEMS: blank-slate authoring
    MF.setTab('systems');
    click('[data-act="sys-new"]');
    must(w.document.getElementById('mf-modal').classList.contains('on'), 'category chooser modal opens');
    click('[data-act="sys-new-cat"][data-cat="ecm_ew"]');
    const nSubs = MF.state.subsystems.length;
    must(nSubs === DATAcount(MF) + 1, 'new blank-slate subsystem created');
    function DATAcount(m) { return m.DATA.subsystems.templates.length; }
    const s = MF.subsystemById(MF.state.selectedSubsystemId);
    must(s && s.custom === true && s.category === 'ecm_ew', 'new subsystem is player-authored ECM/EW');
    const sl = w.document.querySelector('[data-scope="subsystem"][data-param="jammerPower"]');
    must(!!sl, 'authoring slider for jammerPower exists');
    input('[data-scope="subsystem"][data-param="jammerPower"]', 120);
    must(s.params.jammerPower === 120, 'slider updates subsystem params');
    const d6 = MF.sim.derive(s).six;
    must(d6.powerDraw > 0 && d6.selfEmissions === undefined, 'derived six attributes are numeric');
    must(MF.sim.derive(s).derived.selfEmissions > 0, 'ECM self-emissions derived');
    click('[data-act="sys-stress"]');
    must(!!w.document.getElementById('stress-chart'), 'STRESS TEST modal with chart');
    click('#mf-modal-close');
    click('[data-act="sys-lua"]');
    must((w.document.getElementById('lua-snippet') || {}).value.indexOf('powerDraw =') >= 0, 'GENERATE CET LUA produces a snippet');
    click('#mf-modal-close');
    click('[data-act="sys-install"]');
    must(MF.state.installed.indexOf(s.id) >= 0, 'subsystem installed into active design');
    const t = MF.sim.compute(MF.activeDesign());
    must(t.rcsPolar.length === 36, 'RCS polar has 36 aspect samples (0-360deg)');
    must(t.parts.every(p => MF.sixKeys.every(k => Number.isFinite(p.six[k]))), 'every installed part has all six finite attributes');
    must(t.validation.every(v => !!v.code && !!v.severity), 'validation states are structured');
    must(MF.sim.equations(t).every(e => !!e.formula && !!e.live), 'equations expose live substitutions');

    // REACTOR LAB
    MF.setTab('reactor');
    click('[data-act="rx-run"]');
    must(MF.reactorLab.running === true, 'reactor 30s sim starts');
    for (let i = 0; i < 12; i++) MF.reactorLab.tick();
    must(MF.reactorLab.hist.power.length > 20, 'reactor chart accumulates samples');
    const curve = MF.sim.sizeCurve(MF.state.reactor);
    must(curve.length > 20 && curve[curve.length - 1].instability > curve[0].instability, 'bigger crystal = more instability');
    const r1 = MF.sim.reactor(Object.assign({}, MF.state.reactor, {S:1}));
    const r2 = MF.sim.reactor(Object.assign({}, MF.state.reactor, {S:2}));
    must(r2.grossOutput / r1.grossOutput > 1.7 && r2.grossOutput / r1.grossOutput < 1.9,
      'doubling S ~1.8x GROSS power (got ' + (r2.grossOutput/r1.grossOutput).toFixed(2) + ')');
    must(r2.instability / r1.instability > 2.4 && r2.instability / r1.instability < 3.6,
      'doubling S ~3x instability (got ' + (r2.instability/r1.instability).toFixed(2) + ')');
    must(r2.netOutput > r1.netOutput, 'bigger crystal still gives more net power');
    change('#rx-preset', 'corite_corixium');
    must(MF.state.reactorPresetId === 'corite_corixium', 'reactor preset applies');
    click('[data-act="rx-save"]');
    must(MF.state.subsystems.some(x => x.custom && x.category === 'mana_reactor'), 'reactor saved as subsystem');

    // TEARDOWN
    MF.setTab('teardown');
    click('[data-act="td-next"]');
    click('[data-act="td-scan"]');
    click('[data-act="td-part"][data-i="2"]');
    must(w.document.getElementById('td-internals').innerHTML.indexOf('Servo motor') >= 0, 'INTERNALS tree lists sub-components');
    click('[data-act="td-extract"]');
    must(MF.state.blueprints.length > 0 && MF.state.salvage > 0, 'EXTRACT yields blueprints + salvage');
    click('[data-act="td-compare"]');
    must(!!w.document.getElementById('td-compare-body'), 'COMPARE modal renders');
    click('#mf-modal-close');

    // MECH FORGE
    MF.setTab('forge');
    click('[data-act="fg-random"]');
    must(MF.state.shape.torsoW > 0, 'RANDOMIZE keeps a valid shape');
    click('[data-act="fg-preset"][data-k="spider"]');
    must(MF.state.shape.style === 'spider', 'shape preset applies');
    click('[data-act="fg-bake"]');
    must(MF.activeDesign().origin === 'custom' && !!MF.state.bakedShape, 'BAKE SHAPE creates a custom design + baked silhouette');
    click('[data-act="fg-mode"][data-v="assembly"]');
    must(w.document.getElementById('fg-mode-body').innerHTML.indexOf('PREFAB ASSEMBLY') >= 0, 'prefab assembly mode exists');
    click('[data-act="fg-assemble"]');
    must(MF.state.subsystems.some(x => x.name.indexOf('ASSEMBLY PARTS') >= 0), 'assembly parts become a freeform subsystem');
    click('[data-act="fg-mode"][data-v="model"]');
    must(!!w.document.getElementById('fg-orbit'), 'full modeling table + orbit canvas');

    // HANGAR
    MF.setTab('hangar');
    click('[data-act="hangar-filter"][data-v="CUSTOM"]');
    must(MF.state.hangarFilter === 'CUSTOM', 'hangar filter works');
    click('[data-act="hangar-filter"][data-v="ALL"]');
    click('[data-act="hangar-unlock"]');
    must(MF.state.unlockAll === false, 'UNLOCK ALL toggle works');
    click('[data-act="hangar-unlock"]');

    // DOSSIER + SETTINGS
    MF.setTab('dossier');
    must(w.document.getElementById('ds-body').innerHTML.indexOf('ENGINEERING DOSSIER') >= 0, 'dossier renders');
    MF.setTab('settings');
    input('[data-scope="coeff"][data-param="k1"]', 0.5);
    must(MF.coeff('k1') === 0.5, 'coefficient slider is live config');
    input('[data-scope="rcoeff"][data-param="sizeExponent"]', 1.1);
    must(MF.rcoeff('sizeExponent') === 1.1, 'reactor exponent is live config');
    click('[data-act="st-reset-co"]');
    must(MF.coeff('k1') === 0.34, 'reset coefficients restores defaults');

    // COMBAT: direct updates with custom build consequences
    MF.state.reactor = Object.assign({}, MF.DATA.reactors.presets.find(p=>p.id==='vanguard_link_shard').params);
    MF.state.reactorPresetId = 'vanguard_link_shard'; MF.syncReactorSubsystem();
    MF.setTab('combat');
    MF.combat.start();
    const before = MF.combat.enemies.length;
    must(before > 0, 'wave spawns hostiles');
    w.MF.combat.keys.w = true; w.MF.combat.mouse.down = true; w.MF.combat.mouse.moved = true;
    for (let i = 0; i < 40; i++) MF.combat.update(0.05);
    MF.combat.draw();
    must(MF.combat.bullets.length > 0 || MF.combat.kills > 0, 'firing produces bullets/hits');
    MF.combat.player.core = 100;
    MF.combat.ability('q'); MF.combat.ability('e'); MF.combat.ability('r'); MF.combat.ability('v'); MF.combat.ability('3');
    must(MF.combat.companion.order === 2, 'companion orders work');
    must(MF.combat.player.temp < 1.6, 'forced vent keeps temperature bounded');
    MF.combat.stop();
    must(MF.combat.active === false, 'combat stops cleanly');

    // Persistence + self-containment
    must(html.indexOf('<script src=') < 0 && html.indexOf('<link ') < 0, 'no external scripts/styles');
    must(!/<(script|link|img|iframe)[^>]+(src|href)=["']https?:/i.test(html), 'no remote asset loads');
    console.log('\nERRORS CAPTURED:', errors.length);
    errors.slice(0, 20).forEach(e => console.log('  ' + e.slice(0, 600)));
    if (errors.length) process.exit(2);
    console.log('\n*** SMOKE TEST PASSED ***');
  } catch (e) {
    console.error('\n*** SMOKE TEST FAILED ***\n' + (e.stack || e.message));
    console.error('Errors captured:', errors.slice(0, 10));
    process.exit(1);
  }
}, 200);
