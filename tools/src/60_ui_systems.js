/* INTERNAL SYSTEMS LAB — TOP EMPHASIS.
   Blank-slate player-authored subsystems with power / mass / heat / RCS / ECM as first-class values. */

MF.tabs.systems = (function () {
  const CATS = DATA.subsystems.categories;
  function current() { return MF.subsystemById(MF.state.selectedSubsystemId) || MF.state.subsystems[0]; }
  function catList() { return Object.keys(CATS); }
  function paramDefaults(cat) {
    const p = {};
    CATS[cat].params.forEach((x) => { p[x.key] = cat === "freeform" ? 0 : x.default; });
    return p;
  }
  function filteredSubs() {
    const f = MF.state.subsystemFilter;
    return MF.state.subsystems.filter((s) => f === "ALL" || (f === "CUSTOM" ? s.custom : s.category === f));
  }
  function libraryHTML() {
    const opts = ["ALL", "CUSTOM"].concat(catList().map((c) => c));
    let h = '<div class="mf-row">' + MF.ui.btn("CREATE NEW SUBSYSTEM", "sys-new", "primary") +
      MF.ui.btn("IMPORT JSON", "sys-import") + "</div>" +
      '<div class="mf-hr"></div>' + MF.ui.chips(opts, MF.state.subsystemFilter, "sys-filter", "v") +
      '<div class="mf-hr"></div><div class="mf-list" id="sys-list">';
    filteredSubs().forEach((s) => {
      const d = MF.sim.derive(s);
      const installed = MF.state.installed.indexOf(s.id) >= 0;
      h += '<div class="mf-item ' + (s.id === MF.state.selectedSubsystemId ? "active" : "") +
        '" data-act="sys-select" data-id="' + esc(s.id) + '">' +
        '<div class="mf-item-title"><span>' + esc(s.name) + '</span><span class="mf-pill ' +
        (installed ? "green" : "") + '">' + (installed ? "INSTALLED" : "STOCK") + "</span></div>" +
        '<div class="mf-item-meta">' + esc(CATS[s.category].short) + (s.custom ? " · PLAYER" : " · TEMPLATE") + "</div>" +
        '<div class="mf-item-meta">P ' + fmt(d.six.powerDraw, 1) + " · M " + fmt(d.six.mass, 0) +
        " · HG " + fmt(d.six.heatGen, 1) + " · HD " + fmt(d.six.heatDiss, 1) +
        " · RCS " + fmt(d.six.rcs, 1) + " · ECM " + fmt(d.six.ecm, 1) + "</div></div>";
    });
    return h + "</div>";
  }
  function authorHTML(s) {
    const cat = CATS[s.category];
    let h = '<label class="mf-field">SUBSYSTEM NAME</label>' +
      '<input class="mf-input" id="sub-name" value="' + esc(s.name) + '">' +
      '<label class="mf-field">CATEGORY (CHANGE = BLANK PARAMETERS FOR THAT CATEGORY)</label>' +
      MF.ui.select("sub-cat", catList(), s.category, (c) => CATS[c].label, (c) => c) +
      '<div class="mf-note">' + esc(cat.description) + "</div>" +
      '<label class="mf-field">NOTES</label><input class="mf-input" id="sub-note" value="' + esc(s.note || "") + '">' +
      '<h3>PLAYER-EDITABLE PARAMETERS</h3><div class="mf-slider-grid" id="sub-sliders">' +
      cat.params.map((p) => MF.ui.paramSlider(s.category, p, s.params[p.key], "subsystem",
        { attrs: 'data-sid="' + esc(s.id) + '"' })).join("") + "</div>" +
      '<h3>DERIVED SIX ATTRIBUTES</h3><div id="sys-derived"></div>' +
      '<div class="mf-hr"></div><div class="mf-row">' +
      MF.ui.btn("SAVE", "sys-save", "primary") +
      MF.ui.btn("EXPORT SUBSYSTEM JSON", "sys-export") +
      MF.ui.btn("GENERATE CET LUA", "sys-lua") +
      MF.ui.btn("SEND TO FORGE", "sys-send") +
      MF.ui.btn("STRESS TEST", "sys-stress") +
      MF.ui.btn("INSTALL / UNINSTALL", "sys-install") +
      MF.ui.btn("DUPLICATE", "sys-dup") +
      MF.ui.btn("RESET PARAMS", "sys-reset") +
      (s.custom ? MF.ui.btn("DELETE", "sys-del", "danger") : "") + "</div>";
    return h;
  }
  function derivedHTML(s) {
    const d = MF.sim.derive(s);
    let h = MF.ui.sixTable([Object.assign({ name: s.name }, d.six)]);
    const keys = Object.keys(d.derived);
    if (keys.length) {
      h += '<h4>DERIVED OUTPUTS</h4><table class="mf-table"><tbody>' + keys.slice(0, 16).map((k) =>
        "<tr><td>" + esc(k) + '</td><td class="num">' +
        (typeof d.derived[k] === "number" ? fmt(d.derived[k], 2) : esc(String(d.derived[k]))) +
        "</td></tr>").join("") + "</tbody></table>";
    }
    return h;
  }
  function summaryHTML(t) {
    return '<div class="mf-grid2"><div>' +
      '<h3>POWER BUDGET</h3>' +
      MF.ui.barRow("REACTOR OUTPUT", t.reactor.netOutput, Math.max(t.reactor.netOutput, t.powerUsedEff, 1), fmt(t.reactor.netOutput, 1) + " kW", "green") +
      MF.ui.barRow("SUBSYSTEM DRAW", t.powerUsedEff, Math.max(t.reactor.netOutput, t.powerUsedEff, 1), fmt(t.powerUsedEff, 1) + " kW", "amber") +
      MF.ui.barRow("POWER MARGIN", Math.abs(t.powerMargin), Math.max(t.reactor.netOutput, 1), fmt(t.powerMargin, 1) + " kW", t.powerMargin < 0 ? "red" : "green") +
      '<div class="mf-note">Transmission loss ' + fmt(t.transmissionLoss * 100, 1) + "% · brownout threshold " +
      fmt(t.brownoutThreshold, 0) + " kW · surge tolerance " + fmt(t.surgeTolerance, 0) + " kJ</div>" +
      '<h3>MASS / CoM / INERTIA</h3><div class="mf-kv">' +
      '<span class="k">FRAME</span><span>' + fmt(t.frameMass, 0) + " kg</span>" +
      '<span class="k">PARTS + PAYLOAD</span><span>' + fmt(t.partMass + t.payload, 0) + " kg</span>" +
      '<span class="k">TOTAL MASS</span><span>' + fmt(t.totalMass, 0) + " kg</span>" +
      '<span class="k">CoM OFFSET</span><span>' + fmt(t.comOffset, 3) + "</span>" +
      '<span class="k">INERTIA</span><span>' + fmt(t.inertia, 0) + " kg·x</span>" +
      '<span class="k">SPEED / DASH COST</span><span>' + fmt(t.speed, 2) + " m/s / " + fmt(t.dashCost, 1) + "</span>" +
      '<span class="k">STRUCTURAL STRESS</span><span>' + fmt(t.structuralStress, 2) + "</span></div></div>" +
      '<div><h3>THERMAL</h3>' +
      MF.ui.barRow("HEAT GENERATED", t.heatGen, Math.max(t.heatGen, t.heatDiss, 1), fmt(t.heatGen, 1) + " kW", "red") +
      MF.ui.barRow("HEAT DISSIPATED", t.heatDiss, Math.max(t.heatGen, t.heatDiss, 1), fmt(t.heatDiss, 1) + " kW", "cyan") +
      MF.ui.barRow("TEMPERATURE", t.temperature, 1.5, fmt(t.temperature, 2) + " / 1.0 derate", t.temperature > 0.72 ? "red" : "green") +
      '<div class="mf-note">netHeat ' + fmt(t.netHeat, 1) + " kW · thermal mass " + fmt(t.thermalMass, 0) +
      " · vent @ " + fmt(t.ventThreshold, 2) + " · hotspots " + fmt(t.hotspots, 2) + "</div>" +
      '<h3>SIGNATURE / ECM</h3><div class="mf-kv">' +
      '<span class="k">RCS FRONT / SIDE / REAR</span><span>' + fmt(t.rcsFront, 1) + " / " + fmt(t.rcsSide, 1) + " / " + fmt(t.rcsRear, 1) + " m²</span>" +
      '<span class="k">CRYSTAL SIGNATURE</span><span>' + fmt(t.crystalSignature, 1) + " m²</span>" +
      '<span class="k">DETECT RANGE / LOCK</span><span>' + fmt(t.detectRange, 0) + " m / " + fmt(t.missileLockTime, 2) + " s</span>" +
      '<span class="k">JAM / LOCK BREAK</span><span>' + fmt(t.jamStrength, 1) + " / " + fmt(t.lockBreak, 2) + "</span>" +
      '<span class="k">SELF EMISSIONS</span><span>' + fmt(t.selfEmissions, 1) + "</span>" +
      '<span class="k">ECM COVERAGE / DECOYS</span><span>' + fmt(t.ecmCoverage, 0) + "° / " + t.decoys + "</span>" +
      '<span class="k">QUICKHACK RESIST</span><span>' + fmt(t.quickhackResist, 2) + "</span></div></div></div>";
  }
  function partsHTML(t) {
    const rows = t.parts.map((p) => Object.assign({ name: p.name + (p.custom ? " *" : "") }, p.six));
    const total = { name: "TOTAL (Σ)" };
    MF.sixKeys.forEach((k) => { total[k] = rows.reduce((a, r) => a + (Number(r[k]) || 0), 0); });
    rows.push(total);
    return '<div class="mf-scroll" style="max-height:300px">' + MF.ui.sixTable(rows) + "</div>" +
      '<div class="mf-note">Every part exposes power use, weight, heat generated, heat dissipated, RCS contribution and ECM ' +
      "contribution. Negative values are reductions. Hover a column heading is not needed — units: kW / kg / kW / kW / m² / str.</div>";
  }
  function eqHTML(t) {
    return MF.sim.equations(t).map((e) => '<div class="mf-eq">' + esc(e.formula) +
      '<br><b>→ ' + esc(e.live) + "</b></div>").join("") +
      '<div class="mf-note">Coefficients are configurable in SETTINGS; nothing is hard-coded in the UI.</div>';
  }
  function tradeoffHTML() {
    return '<table class="mf-table"><thead><tr><th>DESIGN LEVER</th><th>TRADE-OFF</th></tr></thead><tbody>' +
      DATA.simulation.tradeoffs.map((x) => "<tr><td>" + esc(x.left) + "</td><td>" + esc(x.effect) + "</td></tr>").join("") +
      "</tbody></table>";
  }
  function render(sec) {
    const s = current();
    sec.innerHTML = '<div class="mf-grid" style="grid-template-columns:minmax(330px,.92fr) minmax(540px,1.5fr)">' +
      '<div>' +
      MF.ui.panel("SUBSYSTEM LIBRARY · PLAYER COMPONENTS", libraryHTML(), "amber") +
      MF.ui.panel("AUTHORING TABLE · '" + esc(s.name) + "'", '<div id="sys-author">' + authorHTML(s) + "</div>", "cyan") +
      "</div>" +
      '<div>' +
      MF.ui.panel("LIVE TELEMETRY · ACTIVE DESIGN (" + esc(MF.activeDesign().name) + ")", '<div id="sys-summary"></div>', "cyan") +
      '<div class="mf-grid2">' +
      MF.ui.panel("RCS POLAR PLOT · 0–360° ASPECT", '<canvas id="sys-polar" class="mf-canvas med" width="320" height="230"></canvas>') +
      MF.ui.panel("THERMAL MAP", '<canvas id="sys-thermal" class="mf-canvas med" width="320" height="230"></canvas>') +
      MF.ui.panel("ECM COVERAGE RING", '<canvas id="sys-ecm" class="mf-canvas med" width="320" height="230"></canvas>') +
      MF.ui.panel("DEPENDENCY GRAPH", '<canvas id="sys-graph" class="mf-canvas med" width="320" height="230"></canvas>') +
      "</div>" +
      MF.ui.panel("INSTALLED INTERNALS · SIX ATTRIBUTES", '<div id="sys-parts"></div>', "violet") +
      MF.ui.panel("VALIDATION STATES", '<div id="sys-validate"></div>', "red") +
      MF.ui.panel("EQUATIONS · LIVE VALUES", '<div id="sys-eq"></div>') +
      MF.ui.panel("TRADE-OFF MATRIX", '<div id="sys-tradeoffs">' + tradeoffHTML() + "</div>") +
      "</div></div>";
    bind(sec);
    update(sec);
  }
  function bind(sec) {
    sec.onclick = function (e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.dataset.act, s = current();
      if (a === "sys-filter") { MF.state.subsystemFilter = b.dataset.v; MF.save(); render(sec); }
      else if (a === "sys-select") { MF.state.selectedSubsystemId = b.dataset.id; MF.save(); render(sec); }
      else if (a === "sys-new") { categoryModal(sec); return; }
      else if (a === "sys-save") { MF.save(); MF.toast("Subsystem saved: " + s.name, "ok"); }
      else if (a === "sys-export") MF.exportJSON("mechfall-subsystem-" + s.id + ".json", s);
      else if (a === "sys-lua") luaModal(s);
      else if (a === "sys-send") {
        if (MF.state.installed.indexOf(s.id) < 0) MF.state.installed.push(s.id);
        MF.save(); MF.toast(s.name + " installed and sent to MECH FORGE", "ok");
        MF.setTab("forge"); return;
      } else if (a === "sys-stress") stressModal();
      else if (a === "sys-install") { MF.toggleInstalled(s.id); render(sec); }
      else if (a === "sys-dup") { MF.duplicateSubsystem(s.id); render(sec); }
      else if (a === "sys-del") { MF.deleteSubsystem(s.id); render(sec); }
      else if (a === "sys-reset") { s.params = paramDefaults(s.category); MF.save(); render(sec); }
      else if (a === "sys-import") importModal(sec);
      else if (a === "sys-new-cat") { MF.newSubsystem(b.dataset.cat); MF.save(); render(sec); return; }
      MF.save();
    };
    sec.oninput = function (e) {
      const s = current();
      if (e.target.id === "sub-name") { s.name = e.target.value.slice(0, 60); MF.save(); }
      else if (e.target.id === "sub-note") { s.note = e.target.value.slice(0, 200); MF.save(); }
    };
    sec.onchange = function (e) {
      if (e.target.id === "sub-cat") {
        const s = current();
        s.category = e.target.value;
        s.params = paramDefaults(s.category);
        MF.save(); render(sec);
      }
    };
  }
  function update(sec) {
    const s = current();
    const t = MF.sim.compute(MF.activeDesign());
    const dv = $("sys-derived"); if (dv) dv.innerHTML = derivedHTML(s);
    const sm = $("sys-summary"); if (sm) sm.innerHTML = summaryHTML(t);
    const pt = $("sys-parts"); if (pt) pt.innerHTML = partsHTML(t);
    const va = $("sys-validate"); if (va) va.innerHTML = MF.ui.validList(t);
    const eq = $("sys-eq"); if (eq) eq.innerHTML = eqHTML(t);
    const po = $("sys-polar"); if (po) MF.draw.polar(po, t.rcsPolar);
    const th = $("sys-thermal"); if (th) MF.draw.thermal(th, t);
    const ec = $("sys-ecm"); if (ec) MF.draw.ecm(ec, t);
    const gr = $("sys-graph");
    if (gr) {
      const g = DATA.subsystems.dependencyGraph;
      const activeCats = t.parts.map((p) => ({ power_bus: "bus", thermal_loop: "thermal", mass_structure: "structure",
        signature_rcs: "signature", ecm_ew: "ecm", sensors_os: "sensors", actuators: "actuators", mana_reactor: "reactor" }[p.category]));
      MF.draw.graph(gr, g.nodes, g.edges, { activeCats });
    }
  }
  function categoryModal(sec) {
    MF.modal("CREATE NEW SUBSYSTEM · BLANK SLATE",
      '<div class="mf-note">Pick a category to get its parameter set, or choose FREEFORM to author the six attributes ' +
      "directly with zero defaults. Every new component is saved as a reusable, installable subsystem.</div>" +
      '<div class="mf-chips">' + catList().map((c) => '<span class="mf-chip" data-act="sys-new-cat" data-cat="' +
        esc(c) + '">' + esc(CATS[c].short) + "</span>").join("") + "</div>");
    $("mf-modal-body").onclick = function (e) {
      const b = e.target.closest("[data-act]"); if (!b || b.dataset.act !== "sys-new-cat") return;
      const s = MF.newSubsystem(b.dataset.cat);
      MF.closeModal(); MF.save(); render(sec);
      MF.toast("Blank-slate subsystem created: " + CATS[s.category].short, "ok");
    };
  }
  function luaModal(s) {
    const lua = MF.sim.luaForSubsystem(s);
    MF.modal("GENERATE CET LUA · " + s.name,
      '<div class="mf-note">Paste this into <code>MF.customDesigns[...].subsystems</code> in ' +
      "<code>cet_mod/.../mechfall_forge/init.lua</code>. The CET UI reads the derived six attributes.</div>" +
      '<textarea class="mf-input" id="lua-snippet" style="min-height:280px;font-size:11px" readonly>' + esc(lua) + "</textarea>" +
      '<div class="mf-row mf-end"><button class="mf-btn primary" id="copy-snippet">COPY</button>' +
      '<button class="mf-btn" id="dl-snippet">DOWNLOAD .lua</button></div>');
    $("copy-snippet").onclick = () => MF.copyText(lua);
    $("dl-snippet").onclick = () => MF.download("mechfall-subsystem-" + s.id + ".lua", lua, "text/plain");
  }
  function stressModal() {
    const r = MF.sim.stressTest(MF.activeDesign());
    MF.modal("STRESS TEST · 30 s COMBAT CYCLE",
      '<div class="mf-stats">' +
      MF.ui.stat("PEAK TEMP", fmt(r.peak, 2), "/ 1.0 derate", r.peak > 1 ? "red" : "green") +
      MF.ui.stat("BROWNOUT TICKS", r.brownouts, "/ 300", r.brownouts ? "red" : "green") +
      MF.ui.stat("FORCED VENTS", r.vents, "", "violet") +
      MF.ui.stat("DURATION", "30", "s", "cyan") + "</div>" +
      '<canvas id="stress-chart" class="mf-canvas med" width="700" height="230"></canvas>' +
      '<div class="mf-note">Cycle: 26 s movement / 12 s burst-core charging. Temperature integrates netHeat / thermalMass; ' +
      "forced vents dump heat at >1.15. Power margin, net heat and front RCS are recorded every 0.1 s.</div>");
    MF.draw.chart($("stress-chart"), [
      { name: "temperature", color: "#ff5f56", data: r.series.map((x) => x.temp) },
      { name: "powerMargin/100", color: "#4dd0e1", data: r.series.map((x) => x.powerMargin / 100) },
      { name: "netHeat/100", color: "#ffb347", data: r.series.map((x) => x.netHeat / 100) },
      { name: "frontRCS/100", color: "#c792ea", data: r.series.map((x) => x.rcs / 100) }
    ], { title: "30 s stress cycle", xLabel: "t = 0…30 s", max: 1.5 });
  }
  function importModal(sec) {
    MF.modal("IMPORT SUBSYSTEM JSON",
      '<div class="mf-note">Paste a subsystem object (as produced by EXPORT SUBSYSTEM JSON).</div>' +
      '<textarea class="mf-input" id="import-text" style="min-height:200px"></textarea>' +
      '<div class="mf-row mf-end"><button class="mf-btn primary" id="import-go">IMPORT</button></div>');
    $("import-go").onclick = function () {
      const o = MF.importJSON($("import-text").value, (x) => x && typeof x === "object" && x.params && x.category);
      if (!o) return;
      o.id = uid("sub"); o.custom = true;
      if (!CATS[o.category]) o.category = "freeform";
      MF.state.subsystems.push(o);
      MF.state.selectedSubsystemId = o.id;
      MF.closeModal(); MF.save(); render(sec); MF.toast("Imported subsystem " + o.name, "ok");
    };
  }
  return { render, update };
})();
