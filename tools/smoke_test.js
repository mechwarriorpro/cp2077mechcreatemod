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
    must(h.tabs.length === 12, 'all 12 tabs registered: ' + h.tabs.join(','));
    must(h.data.length === 11, 'data bundle has 11 sections');
    must(Number.isFinite(h.powerMargin) && Number.isFinite(h.totalMass) && Number.isFinite(h.rcsFront), 'simulation produces finite telemetry');
    must(h.powerMargin > 0, 'baseline build has positive power margin (got ' + h.powerMargin.toFixed(1) + ')');
    must(h.validation.indexOf('BROWNOUT') < 0, 'baseline build is not in BROWNOUT');
    console.log('  health', JSON.stringify(h));

    // Tab sweep
    ['hangar','teardown','reactor','systems','forge','combat','pilot','models','weapons','damage','dossier','settings'].forEach(tab => {
      MF.setTab(tab);
      const sec = w.document.getElementById('tab-' + tab);
      must(sec && sec.innerHTML.length > 100, 'tab ' + tab + ' renders');
    });
    must(MF.combat.active === true, 'entering COMBAT TEST auto-starts the harness');

    // PROCEDURAL 3D PILOT + COMPAT
    MF.setTab('pilot');
    must(MF.pilot.active === true, 'entering PILOT TEST auto-starts the generated world');
    must(MF.pilot.mesh && MF.pilot.mesh.tris.length > 300, 'procedural mech mesh has real triangles');
    must(MF.pilot.terrain && MF.pilot.terrain.obstacles.length > 10, 'seeded terrain generated obstacles');
    must(MF.mesh3d.bodyPlan(MF.activeDesign().shape).length > 3, 'body plan derived from signature parts');
    const scenePolys = MF.mesh3d.render(
      w.document.createElement('canvas').getContext('2d'), 640, 360,
      { camera: { pos: [0, 8, -18], target: [0, 2, 0], fov: 1.02, near: 0.6, far: 460 },
        terrain: MF.pilot.terrain, center: [0, 0, 0], coat: MF.state.coat,
        mechs: [{ mesh: MF.pilot.mesh, pos: [0, 0, 0], yaw: 0, pose: MF.mesh3d.pose(MF.activeDesign().shape, { gait: 0 }), coat: MF.state.coat }],
        effects: [] });
    must(scenePolys > 100, 'software 3D rasterizer draws the generated scene (' + scenePolys + ' polys)');
    const code = MF.compat.encodeCoat(MF.state.coat);
    must(/^CCP1;P=[0-9A-F]{6};S=[0-9A-F]{6}/.test(code), 'Crystal Coat share code is CCP1-compatible');
    const round = MF.compat.decodeCoat(code);
    must(round && round.primary === MF.state.coat.primary && round.secondary === MF.state.coat.secondary,
      'Crystal Coat share code round-trips');
    const imported = MF.compat.decodeCoat('CCP1;P=C81E3C;S=202024;L=200;N=Night Runner');
    must(imported && imported.primary === '#C81E3C' && imported.name === 'Night Runner',
      'reads the published Crystal Coat Picker example code');
    const steer = MF.compat.autodrive.steer({ x: 0, z: 0, yaw: 0 }, { x: 40, z: 10 }, MF.pilot.terrain);
    must(isFinite(steer.steer) && isFinite(steer.throttle) && steer.done === false,
      'procedural Autodrive steering is finite and dependency-free');
    click('#pilot-autodrive');
    must(MF.pilot.autopilot === true, 'AUTODRIVE toggles on');
    MF.pilot.update(0.4);
    must(MF.pilot.waypoints.length > 0, 'autopilot has generated waypoints');
    click('#pilot-autodrive');
    click('#pilot-camera');
    must(MF.pilot.cameraMode === 'COCKPIT', 'camera cycles to cockpit');
    click('[data-act="pilot-seed"]');
    must(MF.pilot.active === true && MF.pilot.seed > 0, 'new terrain seed regenerates the world');

    // IN-GAME PILOT (CET) deploy console
    must(!!w.document.getElementById('pilot-ingame'), 'pilot side panel has an IN-GAME CET console');
    const igPanel = w.document.getElementById('pilot-ingame').innerHTML;
    must(/INGAME_PILOT|IN-GAME PILOT/i.test(igPanel) && /exEntitySpawner/.test(igPanel),
      'in-game console names the CET spawner API');
    must(!!w.document.getElementById('ingame-core') && !!w.document.getElementById('ingame-parts'),
      'in-game console exposes core record + signature part selectors');
    const igCfg = MF.ingame.config();
    must(igCfg.core === MF.state.ingameCore && igCfg.parts >= 0 && igCfg.cockpit === true,
      'in-game config reads persisted state');
    change('#ingame-core', MF.DATA.compat.ingamePilot.coreRecords[2].id);
    must(MF.state.ingameCore === MF.DATA.compat.ingamePilot.coreRecords[2].id,
      'core record selector persists its choice');
    input('#ingame-parts', 3);
    must(MF.state.ingameParts === 3, 'signature part count slider persists');
    const igLua = MF.ingame.luaSnippet();
    must(/MF\.ingame\.coreRecord/.test(igLua) && /exEntitySpawner\.SpawnRecord/.test(igLua) &&
      MF.DATA.compat.ingamePilot.coreRecords[2].id.indexOf('q115') > 0,
      'GENERATE IN-GAME CET LUA emits a real config override');
    must(/Character\.q003_militech_mech/.test(MF.ingame.recordsText()),
      'record list includes the vanilla Militech Minotaur');
    click('[data-act="ingame-checklist"]');
    must(/EMERGENCY UNDEPLOY/.test(w.document.getElementById('mf-modal-body').innerHTML),
      'deploy checklist includes emergency undeploy');
    must(/CET 1\.37\.1|1\.37\.1/.test(w.document.getElementById('mf-modal-body').innerHTML),
      'patch 2.31 checklist prescribes CET 1.37.1, not 1.38.x');
    click('#mf-modal-close');

    // PATCH 2.31 + PHANTOM LIBERTY gating
    must(!!w.document.getElementById('ingame-patch'), 'in-game console exposes a game patch selector');
    change('#ingame-patch', '2.31');
    must(MF.state.ingamePatch === '2.31', 'patch selector persists 2.31');
    must(MF.ingame.patchInfo().cet === '1.37.1', 'patch 2.31 maps to CET 1.37.1');
    must(/1\.38/.test(MF.ingame.patchInfo().note), 'patch note warns about CET 1.38.x');
    const plBox = w.document.getElementById('ingame-pl');
    must(!!plBox, 'in-game console exposes Phantom Liberty toggle');
    plBox.checked = true; plBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    must(MF.state.ingameHasPL === true, 'Phantom Liberty toggle persists');
    click('[data-act="ingame-matrix"]');
    must(/PATCH MATRIX|RED4EXT/.test(w.document.getElementById('mf-modal-body').innerHTML) &&
      /1\.37\.1/.test(w.document.getElementById('mf-modal-body').innerHTML),
      'patch matrix modal lists CET versions');
    click('#mf-modal-close');
    must(/setPatch/.test(MF.ingame.luaSnippet()) && /setHasPL/.test(MF.ingame.luaSnippet()),
      'generated CET Lua is patch-aware');

    // FULL MODELS / TRACES — example chassis only
    MF.setTab('models');
    must(MF.state.tab === 'models', 'MODEL LIBRARY tab opens');
    must(MF.DATA.models.models.length === 30 && MF.DATA.models.policy.onlyExamplesAllowed === true,
      'models.json defines exactly 30 allowed example full models');
    const outlines = MF.DATA.models.models.map((m) => JSON.stringify(m.trace.front.outline));
    must(new Set(outlines).size === 30, 'all 30 example full-model traces are distinct');
    must(['front','side','top'].every((v) => MF.DATA.models.models.every((m) =>
      m.trace[v] && m.trace[v].outline.length > 10 && m.trace[v].parts.length > 3)),
      'every example has a complete front / side / top blueprint trace');
    must(MF.DATA.models.models.every((m) => m.shape.torsoW && m.sig && m.sig.frame),
      'every example carries its own full shape vector + signature composition');
    const allowed = MF.models.isAllowed(MF.DATA.models.models[0].shape);
    must(allowed.ok === true, 'example-derived full model is allowed');
    const generic = MF.models.isAllowed({ torsoW: 2.4 });
    must(generic.ok === false, 'generic untyped hull is rejected by the example-only policy');
    must(!!w.document.getElementById('models-3d') && !!w.document.getElementById('models-trace'),
      'MODEL LIBRARY renders a full 3D model and a blueprint trace');
    must(w.document.querySelectorAll('.models-thumb').length === 30,
      'gallery draws all 30 example trace thumbnails');
    click('[data-act="models-view"][data-v="side"]');
    must(MF.models.view === 'side', 'trace view switches to SIDE');
    click('[data-act="models-rotate"]');
    must(MF.models.yaw > 0.42, 'full 3D model rotates');
    MF.setTab('systems');

    // INTERNAL SYSTEMS: blank-slate authoring
    // FULL 3D MESH + INDEPENDENT ORTHOGRAPHIC TRACES (0.1.8-test)
    const mm = MF.DATA.models.models[0].mesh;
    must(mm.triangleCount >= 100 && mm.partCount >= 20 && mm.vertices.length >= 100,
      'every example ships a real indexed triangulated 3D mesh');
    const shipped = MF.models.meshFromData(MF.DATA.models.models[0].id);
    must(shipped && shipped.tris.length === mm.triangleCount && shipped.shipped === true,
      'MODEL LIBRARY renders the shipped 3D mesh');
    must(MF.DATA.models.policy.independentOrthographicViews === true &&
      MF.DATA.models.policy.ships3DMesh === true, 'independent views + shipped mesh policy');
    const sideW = Math.max(...MF.DATA.models.models[0].trace.side.outline.map(q=>q[0])) -
      Math.min(...MF.DATA.models.models[0].trace.side.outline.map(q=>q[0]));
    const topLen = MF.DATA.models.models[0].trace.top.outline.length;
    must(sideW > 0.05 && topLen !== MF.DATA.models.models[0].trace.front.outline.length,
      'side / top traces are independent of the front profile');
    click('[data-act="models-mesh"]');
    must(MF.models.useShippedMesh === false, 'shipped / procedural mesh toggle works');
    click('[data-act="models-mesh"]');

    // FORGIVING ENERGY / REACTOR BALANCE
    const baseTele = MF.sim.compute(MF.activeDesign());
    must(baseTele.powerMargin > 20, 'forgiving reactor gives a large positive power margin (got ' +
      Math.round(baseTele.powerMargin) + ' kW)');
    must(baseTele.moduleScale < 1, 'module bus draw is discounted');
    must(baseTele.powerUsedRaw > baseTele.powerUsed, 'bulk module discount reduces total module cost');
    must(MF.DATA.simulation.validationThresholds.brownoutMargin < 0,
      'brownout threshold forgiving (small deficit allowed)');
    must(MF.DATA.simulation.validationThresholds.hardpointLimit >= 20,
      'max modules / hardpoint limit raised');

    // CUSTOM WEAPON DESIGN (8 categories)
    MF.setTab('weapons');
    must(MF.state.tab === 'weapons', 'WEAPON FORGE tab opens');
    const wcats = Object.keys(MF.DATA.weapons.categories);
    must(wcats.length === 8, 'all 8 custom weapon categories are defined');
    must(['energy_weapon','ballistic_weapon','missile_weapon','melee_weapon','energy_missile',
      'energy_melee','energy_shield','ballistic_shield'].every((k) => wcats.indexOf(k) >= 0),
      'energy / ballistic / missile / melee / energy missile / energy melee / energy shield / ballistic shield');
    must(!!w.document.getElementById('weapon-category') && !!w.document.getElementById('weapon-name'),
      'WEAPON FORGE exposes category + name authoring');
    const preWeapon = MF.sim.compute(MF.activeDesign());
    const cw = MF.weapons.save('TEST PARTICLE LANCE', 'energy_weapon',
      { power: 30, mass: 200, heat: 20, damage: 100, rate: 60, rcs: 1, ecm: 2, capacity: 0, armor: 0, range: 600 });
    MF.weapons.toggle(cw.id);
    const postWeapon = MF.sim.compute(MF.activeDesign());
    must(MF.weapons.loadout().length === 1, 'custom weapon equips into the loadout');
    must(postWeapon.powerUsed > preWeapon.powerUsed, 'equipped weapon feeds the power budget');
    must(postWeapon.totalMass > preWeapon.totalMass, 'equipped weapon feeds total mass');
    must(postWeapon.heatGen > preWeapon.heatGen, 'equipped weapon feeds heat');
    must(MF.weapons.dps(cw) > 0 && MF.weapons.sixTotal().powerDraw > 0,
      'weapon DPS and six-attribute totals compute');

    // DESIGNED WEAPONS ACTUALLY FIRE / SHIELDS ABSORB (0.1.8-test)
    const prof = MF.weapons.combatProfile();
    must(prof.count === 1 && prof.fireDamage > 0 && prof.dps > 0,
      'equipped design produces a live combat profile');
    const shieldTpl = MF.DATA.weapons.templates.find(x => x.category === 'energy_shield');
    MF.weapons.toggle(shieldTpl.id);
    const ds2 = MF.damage.ensure(true);
    const shieldParts = ds2.parts.filter(x => x.section === 'shield');
    must(shieldParts.length >= 1 && MF.damage.shieldPool(ds2) > 0,
      'equipped shielding creates destructible shield parts with an HP pool');
    const ab = MF.damage.absorb(ds2, 40);
    must(ab.absorbed > 0 && ab.remaining < 40, 'shield parts absorb incoming damage');
    MF.damage.tick(ds2, 1.0);
    must(MF.damage.shieldPool(ds2) > ab.absorbed - 40, 'energy shielding regenerates between hits');
    MF.weapons.toggle(shieldTpl.id);
    MF.damage.ensure(true);

    // PER-PART DESTRUCTION + EMERGENCY EJECT
    MF.setTab('damage');
    const ds = MF.damage.ensure(true);
    must(ds.parts.length >= 30, 'every individual chassis part is destructible (' + ds.parts.length + ' parts)');
    must(MF.DATA.damage.thresholds.cockpitDestruction === 0.70 &&
      MF.DATA.damage.thresholds.torsoDestruction === 0.90, '70% cockpit / 90% torso thresholds');
    const ck = ds.parts.filter((x) => x.section === 'cockpit');
    ck.forEach((x) => MF.damage.hitPct(ds, x.id, 0.80));
    must(ds.destroyed === true, '>70% cockpit damage triggers FULL DESTRUCTION');
    must(ds.ejected === true, 'pilot emergency eject on full destruction');
    must(ds.parts.every((x) => x.destroyed), 'full destruction destroys every part');
    must(/COCKPIT/.test(ds.reason), 'destruction reason cites the cockpit threshold');
    MF.damage.repair(ds);
    must(!ds.destroyed && ds.parts.every((x) => !x.destroyed), 'REPAIR ALL restores every part');
    ds.parts.filter((x) => x.section === 'torso').forEach((x) => MF.damage.hitPct(ds, x.id, 0.95));
    must(ds.destroyed === true && /TORSO/.test(ds.reason), '>90% torso damage triggers FULL DESTRUCTION');
    MF.damage.repair(ds);
    MF.damage.eject(ds, true);
    must(ds.ejected === true && !ds.destroyed, 'manual pilot emergency eject');
    MF.damage.repair(ds);

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

    // TEARDOWN — sleek mech wireframe, internals fit, power/heat transfer balance
    MF.setTab('teardown');
    must(MF.state.tdLayers.wireframe && MF.state.tdLayers.internals && MF.state.tdLayers.flows,
      'TEARDOWN defaults to wireframe + internals + flow layers');
    must(typeof MF.draw.mech === 'function' && MF.draw.matrix === undefined,
      'sleek mech renderer replaces the abstract matrix');
    must(MF.teardown.hit.length > 20 && Number.isFinite(MF.teardown.hit[0].rect.w),
      'all mounting bays are hit-testable');
    must(w.document.getElementById('tab-teardown').innerHTML.indexOf('SLEEK MECH WIREFRAME') >= 0,
      'TEARDOWN shows the sleek mech wireframe');
    must(w.document.getElementById('td-fit').innerHTML.indexOf('BUS') >= 0,
      'FIT & TRANSFER BALANCE panel renders');
    must(typeof MF.sim.fitBalance === 'function' && typeof MF.sim.autoRoute === 'function',
      'fit balance and auto-routing simulation exist');
    const fb = MF.sim.fitBalance(MF.activeDesign(), MF.tdParts(MF.activeDesign()), MF.state.tdFit);
    must(fb.nodes.length > 20 && Array.isArray(fb.flags) && Number.isFinite(fb.totals.totalLoss),
      'fit balance produces routed nodes, flags and transfer losses');
    must(fb.nodes.every(n => Number.isFinite(n.draw) && Number.isFinite(n.margin)),
      'every bay has finite power draw and thermal margin');
    click('[data-act="td-layer"][data-v="flows"]');
    must(MF.state.tdLayers.flows === false, 'POWER / HEAT FLOW layer toggles off');
    click('[data-act="td-layer"][data-v="flows"]');
    must(MF.state.tdLayers.flows === true, 'POWER / HEAT FLOW layer toggles on');
    click('[data-act="td-autoroute"]');
    must(Object.keys(MF.state.tdFit.routes).length > 20, 'AUTO ROUTE assigns every bay a bus + loop');
    click('[data-act="td-stress"]');
    must(MF.state.tdFit.bus === 55 && MF.state.tdFit.coolant === 55, 'STRESS FIT cuts bus + coolant');
    click('[data-act="td-fitreset"]');
    must(MF.state.tdFit.bus === 100, 'RESET FIT restores nominal capacity');
    click('[data-act="td-apply"]');
    const fitSub = MF.state.subsystems.find(x => x.custom && x.name.indexOf('PHYSICAL FIT') === 0);
    must(!!fitSub && Number.isFinite(fitSub.params.powerDraw), 'APPLY FIT creates a consequential freeform subsystem');
    MF.state.installed = MF.state.installed.filter(x => x !== fitSub.id);
    click('[data-act="td-next"]');
    click('[data-act="td-scan"]');
    click('[data-act="td-part"][data-i="3"]');
    must(w.document.getElementById('td-internals').innerHTML.indexOf('Servo motor') >= 0, 'INTERNALS tree lists sub-components');
    must(MF.DATA.teardowns.internalsCatalog.thruster && MF.DATA.teardowns.internalsCatalog.jump_jet,
      'thruster and jump jet assemblies are in the internals catalogue');
    must(MF.DATA.components.parts.some(x => x.type === 'jumpjet'), 'jump jets are assembly parts');
    must(MF.shapeParts(MF.state.shape).some(b => b.anchor === 'jumpJet'), 'jump jet geometry exists');
    must(MF.DATA.chassis.shapeKeys.length === 20, 'modeling table has 20 parameters');
    const sigLib = MF.DATA.chassis.signatureParts;
    must(Object.keys(sigLib).length === 7 && sigLib.frame.length >= 10,
      'signature-part library has 7 slots and 10+ body plans');
    const sigs = MF.DATA.chassis.roster.map(c => JSON.stringify(c.shape.sig));
    must(new Set(sigs).size === 30, 'all 30 prefabs have distinct signature-part compositions');
    const plans = new Set(MF.DATA.chassis.roster.map(c => c.shape.sig.frame));
    must(plans.size >= 6 && plans.has('tank') && plans.has('flyer') && plans.has('hover'),
      'roster covers 6+ body plans including tank, flyer and hover');
    const tankParts = MF.shapeParts(MF.getDesign('tricera').shape).map(b => b.anchor);
    const flyerParts = MF.shapeParts(MF.getDesign('northstar').shape).map(b => b.anchor);
    must(!tankParts.includes('footL') && !flyerParts.includes('footL'),
      'tank and flyer body plans remove walking legs');
    must(MF.shapeParts(MF.getDesign('tzendolg').shape).map(b => b.anchor).includes('extraLegL'),
      'four-leg body plan keeps rear leg columns');
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
    const forgeHTML = w.document.getElementById('fg-mode-body').innerHTML;
    must(forgeHTML.indexOf('SIGNATURE PARTS') >= 0, 'MECH FORGE exposes SIGNATURE PARTS selectors');
    const sigSel = w.document.getElementById('fg-sig-frame');
    must(!!sigSel, 'signature frame selector exists');
    const beforeSig = MF.state.shape.sig.frame;
    sigSel.value = 'flyer'; sigSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    must(MF.state.shape.sig.frame === 'flyer' && beforeSig !== 'flyer',
      'changing a signature slot updates the working shape');
    must(MF.shapeParts(MF.state.shape).some(b => b.anchor === 'sigArmL'), 'signature geometry follows the selector');
    click('[data-act="fg-preset"][data-k="biped"]');
    must(!!MF.state.shape.sig && !!MF.state.shape.sig.frame, 'preset restores a signature composition');
    click('[data-act="fg-bake"]');
    must(MF.activeDesign().origin === 'custom' && !!MF.state.bakedShape, 'BAKE SHAPE creates a custom design + baked silhouette');
    click('[data-act="fg-mode"][data-v="assembly"]');
    must(w.document.getElementById('fg-mode-body').innerHTML.indexOf('PREFAB ASSEMBLY') >= 0, 'prefab assembly mode exists');
    click('[data-act="fg-assemble"]');
    must(MF.state.subsystems.some(x => x.name.indexOf('ASSEMBLY PARTS') >= 0), 'assembly parts become a freeform subsystem');
    click('[data-act="fg-mode"][data-v="model"]');
    must(!!w.document.getElementById('fg-orbit'), 'full modeling table + orbit canvas');

    // HANGAR
    MF.setTab('dossier');
    must(w.document.getElementById('tab-dossier').innerHTML.indexOf('SIGNATURE PART COMPOSITION') >= 0,
      'dossier reports the signature-part composition');
    MF.setTab('hangar');
    click('[data-act="hangar-filter"][data-v="CUSTOM"]');
    must(MF.state.hangarFilter === 'CUSTOM', 'hangar filter works');
    click('[data-act="hangar-filter"][data-v="ALL"]');
    must(typeof MF.draw.mech === 'function' && MF.DATA.teardowns.defaultViewMode === 'wireframe',
      'HANGAR thumbnails are sleek mech wireframes');
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
