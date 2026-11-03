/* TEARDOWN TABLE — sleek mech wireframe, physical internals fit, power/heat transfer balancing. */

MF.teardown = { id: MF.state.teardownId || "bt7274", step: 0, selected: null, scanned: false,
  extracted: false, yaw: 0.55, hit: [] };

function tdParts(d) {
  const key = d.internalsProfile || d.archetype || "biped";
  const set = DATA.teardowns.partSets[key] || DATA.teardowns.partSets.biped;
  return set.map((p) => {
    const cat = DATA.teardowns.internalsCatalog[p.internalsKey] || { internals: [] };
    const six = { powerDraw: 0, mass: 0, heatGen: 0, heatDiss: 0, rcs: 0, ecm: 0 };
    cat.internals.forEach((i) => MF.sixKeys.forEach((k) => { six[k] += Number(i[k] || 0) * (i.qty || 1); }));
    return Object.assign({}, p, { six, internals: cat.internals, label: cat.label });
  });
}
MF.tdParts = tdParts;

MF.tabs.teardown = (function () {
  function design() { return MF.getDesign(MF.teardown.id) || MF.activeDesign(); }
  function parts() { return tdParts(design()); }
  function layers() { return MF.state.tdLayers || { wireframe: true, internals: true, flows: true }; }
  function fit() {
    return MF.sim.fitBalance(design(), parts(), MF.state.tdFit || { bus: 100, coolant: 100, routes: {} });
  }
  function partListHTML(ps) {
    return '<table class="mf-table"><thead><tr><th>#</th><th>MOUNTING BAY</th>' +
      MF.sixLabels.map((a) => '<th style="text-align:right">' + esc(a.label.split(" ")[0]) + "</th>").join("") +
      "</tr></thead><tbody>" + ps.map((p, i) =>
        '<tr data-act="td-part" data-i="' + i + '" style="cursor:pointer"><td>' + (i + 1) + "</td><td>" +
        esc(p.name) + "</td>" + MF.sixKeys.map((k) => '<td class="num ' + (p.six[k] < 0 ? "neg" : "") + '">' +
        fmt(p.six[k], 1) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
  }
  function internalsHTML(ps) {
    const p = ps.find((x) => x.anchor === MF.teardown.selected) || ps[0];
    if (!p) return '<div class="mf-note">No parts in this profile.</div>';
    const scanned = MF.teardown.scanned;
    let h = '<div class="mf-row between"><h3>INTERNALS · ' + esc(p.name) + '</h3><span class="mf-pill ' +
      (scanned ? "green" : "amber") + '">' + (scanned ? "SCANNED" : "UNSCANNED") + "</span></div>" +
      '<div class="mf-note">Assembly: ' + esc(p.label) + " · anchor <code>" + esc(p.anchor) +
      "</code> · salvage " + p.salvage + " · blueprint <code>" + esc(p.blueprint) + "</code></div>";
    if (!scanned) {
      h += '<div class="mf-warnbox">Internals are masked. Run <b>SCAN INTERNALS</b> to reveal ' +
        "power use · weight · heat generated · heat dissipated · RCS contribution · ECM contribution for every sub-component.</div>";
      return h;
    }
    h += '<div class="mf-scroll" style="max-height:300px">' + MF.ui.sixTable(p.internals) + "</div>";
    h += '<h4>PART TOTAL</h4><table class="mf-table"><thead><tr>' +
      MF.sixLabels.map((a) => "<th>" + esc(a.label) + "</th>").join("") + "</tr></thead><tbody><tr>" +
      MF.sixKeys.map((k) => '<td class="num">' + fmt(p.six[k], 1) + "</td>").join("") + "</tr></tbody></table>";
    return h;
  }
  function flagsHTML(f) {
    if (!f.flags.length) return '<div class="mf-note mf-okbox">FIT NOMINAL · all bays routed, bus and coolant within capacity.</div>';
    return '<div class="mf-warnbox"><b>' + f.flags.length + ' FIT FLAG' + (f.flags.length > 1 ? "S" : "") +
      ":</b> " + f.flags.map((x) => "<b>" + esc(x) + "</b>").join(" · ") +
      "<br>Re-route, add radiators/capacitors, or raise bus / coolant capacity. TEST MODE deploys anyway with penalties.</div>";
  }
  function fitHTML(f) {
    const t = f.totals;
    let h = '<div class="mf-stats">' +
      MF.ui.stat("REACTOR NET", fmt(f.reactor.netOutput, 1), "kW", "green") +
      MF.ui.stat("BUS LOAD", fmt(t.totalDelivered, 1), "kW", t.powerMargin < 0 ? "red" : "") +
      MF.ui.stat("HEAT MARGIN", fmt(t.heatMargin, 1), "kW", t.heatMargin < 0 ? "red" : "") +
      MF.ui.stat("TRANSFER LOSS", fmt(t.totalLoss, 1), "kW", t.totalLoss > 8 ? "amber" : "") +
      "</div>" + flagsHTML(f) +
      '<h4>BUS + LOOP CAPACITY</h4>' +
      f.busRows.map((b) => MF.ui.barRow(b.name + " LOAD", b.load, b.capacity,
        fmt(b.load, 0) + " / " + fmt(b.capacity, 0) + " kW", b.load > b.capacity ? "red" : "")).join("") +
      f.loopRows.map((l) => MF.ui.barRow(l.name + " HEAT", l.load, Math.max(1, l.diss),
        fmt(l.margin, 1) + " kW margin", l.margin < 0 ? "red" : "")).join("") +
      '<h4>MOUNTING BAY ROUTING</h4><div class="mf-scroll" style="max-height:290px">' +
      '<table class="mf-table"><thead><tr><th>BAY</th><th>BUS</th><th>LOOP</th>' +
      '<th style="text-align:right">DRAW</th><th style="text-align:right">LOSS</th>' +
      '<th style="text-align:right">HEAT</th><th style="text-align:right">DISS</th>' +
      '<th style="text-align:right">MARGIN</th></tr></thead><tbody>' +
      f.nodes.map((n) => '<tr data-act="td-part-anchor" data-anchor="' + esc(n.anchor) + '" style="cursor:pointer">' +
        "<td>" + esc(n.name.slice(0, 20)) + "</td><td>" + esc(n.bus.replace("BUS ", "")) + "</td><td>" +
        esc(n.loop.replace("LOOP ", "")) + "</td>" + '<td class="num">' + fmt(n.draw, 1) + "</td>" +
        '<td class="num">' + fmt(n.loss, 1) + "</td>" + '<td class="num">' + fmt(n.gen, 1) + "</td>" +
        '<td class="num">' + fmt(n.effDiss, 1) + "</td>" +
        '<td class="num ' + (n.hot ? "neg" : "") + '" style="color:' + (n.hot ? "#ff5f56" : "#8bd450") + '">' +
        fmt(n.margin, 1) + "</td></tr>").join("") + "</tbody></table></div>" +
      '<div class="mf-note">Loss = draw × k × distance from the reactor core. Green margin = local cooling ' +
      "capacity; red = HOT SPOT. Click a routing row to inspect that bay's internals.</div>";
    return h;
  }
  function telemetryHTML(d, ps) {
    const r = MF.sim.reactor(d.reactor || MF.state.reactor);
    const totalSalvage = ps.reduce((a, p) => a + p.salvage, 0);
    return '<div class="mf-stats">' +
      MF.ui.stat("NET OUTPUT", fmt(r.netOutput, 1), "kW", "green") +
      MF.ui.stat("INSTABILITY", fmt(r.instability, 2), "", r.instability > 0.95 ? "red" : "") +
      MF.ui.stat("HEAT LOAD", fmt(r.heatLoad, 1), "kW") +
      MF.ui.stat("CRYSTAL SIG", fmt(r.crystalSignature, 1), "m²", "violet") +
      "</div><h3>REACTOR TELEMETRY</h3>" + '<div class="mf-kv">' +
      '<span class="k">RAW HARVEST</span><span>' + fmt(r.rawHarvest, 2) + " mana/s</span>" +
      '<span class="k">THROUGHPUT</span><span>' + fmt(r.throughput, 2) + " mana/s</span>" +
      '<span class="k">GROSS OUTPUT</span><span>' + fmt(r.grossOutput, 1) + " kW</span>" +
      '<span class="k">RESONANCE</span><span>' + fmt(r.resonance, 2) + "</span>" +
      '<span class="k">BIOME MULT</span><span>' + fmt(r.biomeMultiplier, 2) + "×</span>" +
      '<span class="k">MELTDOWN</span><span>' + (r.meltdown ? "YES" : "NO") + "</span></div>" +
      '<h3>SALVAGE / BLUEPRINTS</h3><div class="mf-kv">' +
      '<span class="k">SALVAGE AVAILABLE</span><span>' + totalSalvage + "</span>" +
      '<span class="k">BLUEPRINTS</span><span>' + ps.length + " part blueprints</span>" +
      '<span class="k">EXTRACTED</span><span>' + (MF.teardown.extracted ? "YES" : "NO") + "</span>" +
      '<span class="k">BANKED</span><span>' + MF.state.salvage + " salvage / " + MF.state.blueprints.length + " bp</span></div>";
  }
  function layerButtons() {
    const L = layers();
    return DATA.teardowns.view.modes.map((m) =>
      MF.ui.btn(m.label, "td-layer", L[m.id] ? "on" : "", { v: m.id })).join("");
  }
  function render(sec) {
    const d = design(), ps = parts(), L = layers(), f = fit();
    const designs = MF.allDesigns();
    sec.innerHTML = '<div class="mf-grid2" style="grid-template-columns:minmax(380px,1.25fr) minmax(360px,1fr)">' +
      '<div>' + MF.ui.panel("TEARDOWN TABLE · SLEEK MECH WIREFRAME + INTERNALS FIT",
        '<div class="mf-row"><label class="mf-field" style="margin:0">CHASSIS</label></div>' +
        MF.ui.select("td-chassis", designs, d.id, (x) => x.name + (x.origin === "custom" ? " [CUSTOM]" : ""), (x) => x.id) +
        '<div class="mf-hr"></div><div class="mf-row">' + layerButtons() + "</div>" +
        '<div class="mf-note">Toggle <b>WIREFRAME</b> (tapered hulls, joints, fins, nozzle bells), ' +
        "<b>INTERNALS FIT</b> (physical mounting bays showing where every sub-component sits) and " +
        "<b>POWER / HEAT FLOW</b> (cyan bus, orange heat, green coolant routing). Fit and balance are " +
        "the only limits — build whatever your imagination allows.</div>" +
        '<div class="mf-hr"></div><div class="mf-row">' +
        MF.ui.btn("TEAR DOWN ▸", "td-next", "primary") +
        MF.ui.btn("SCAN INTERNALS", "td-scan") +
        MF.ui.btn("EXTRACT TO INVENTORY", "td-extract") +
        MF.ui.btn("USE AS TEMPLATE", "td-template") +
        MF.ui.btn("COMPARE", "td-compare") +
        MF.ui.btn("REASSEMBLE", "td-reset") + "</div>" +
        '<div class="mf-row">' +
        MF.ui.btn("AUTO ROUTE", "td-autoroute") +
        MF.ui.btn("STRESS FIT", "td-stress") +
        MF.ui.btn("RESET FIT", "td-fitreset") +
        MF.ui.btn("APPLY FIT → FORGE", "td-apply", "primary") + "</div>" +
        '<div class="mf-hr"></div><div class="mf-slider-grid">' +
        MF.ui.slider("bus", "BUS CAPACITY", 40, 180, 5, MF.state.tdFit.bus, "fit",
          { unit: " %", help: "Reactor output fraction available to the routed buses." }) +
        MF.ui.slider("coolant", "COOLANT FLOW", 30, 180, 5, MF.state.tdFit.coolant, "fit",
          { unit: " %", help: "Pump throughput; scales effective heat dissipation at each bay." }) + "</div>" +
        MF.ui.slider("step", "SEPARATION STEP", 0, ps.length, 1, MF.teardown.step, "teardown",
          { unit: "", help: "Drag to separate parts step by step." }) +
        '<div class="mf-canvas-label">CLICK A PART · DRAG SLIDER TO EXPLODE · INSPECT ROUTING IN THE FIT PANEL</div>' +
        '<canvas id="td-canvas" class="mf-canvas large" width="620" height="380"></canvas>' +
        '<div id="td-status" class="mf-note"></div>', "cyan") + "</div>" +
      '<div>' +
      MF.ui.panel("MOUNTING BAYS · SIX ATTRIBUTES PER PART", '<div class="mf-scroll" id="td-partlist" style="max-height:240px"></div>', "amber") +
      MF.ui.panel("FIT & TRANSFER BALANCE", '<div id="td-fit"></div>', "violet") +
      MF.ui.panel("INTERNALS TREE", '<div id="td-internals"></div>') +
      MF.ui.panel("REACTOR TELEMETRY / YIELD", '<div id="td-telemetry"></div>') +
      "</div></div>";
    sec.onclick = function (e) {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "td-layer") {
        MF.state.tdLayers[b.dataset.v] = !MF.state.tdLayers[b.dataset.v];
        MF.save(); render(sec); return;
      } else if (act === "td-part") { MF.teardown.selected = parts()[Number(b.dataset.i)].anchor; }
      else if (act === "td-part-anchor") { MF.teardown.selected = b.dataset.anchor; }
      else if (act === "td-next") { MF.teardown.step = clamp(MF.teardown.step + 1, 0, parts().length); }
      else if (act === "td-reset") { MF.teardown.step = 0; MF.teardown.selected = null; }
      else if (act === "td-scan") { MF.teardown.scanned = true; MF.toast("Internals scanned: six attributes revealed", "ok"); }
      else if (act === "td-autoroute") {
        MF.state.tdFit.routes = MF.sim.autoRoute(design(), parts());
        MF.toast("Bays routed to the least-loaded bus and coolant loop", "ok");
      } else if (act === "td-stress") {
        MF.state.tdFit.bus = 55; MF.state.tdFit.coolant = 55;
        MF.toast("STRESS FIT: bus and coolant cut to 55% — inspect the flags", "err");
      } else if (act === "td-fitreset") {
        MF.state.tdFit = { bus: 100, coolant: 100, routes: {} };
        MF.toast("Fit reset to nominal capacity", "ok");
      } else if (act === "td-apply") {
        applyFit(design(), fit());
        MF.toast("Physical fit applied as a freeform subsystem in INTERNAL SYSTEMS", "ok");
      } else if (act === "td-extract") {
        const ps2 = parts(), dd = design();
        MF.state.salvage += ps2.reduce((a, p) => a + p.salvage, 0);
        MF.state.xp += 35;
        MF.state.blueprints = Array.from(new Set(MF.state.blueprints.concat(ps2.map((p) => p.blueprint))));
        ps2.forEach((p) => MF.state.inventory.push({ name: p.name, from: dd.name, blueprint: p.blueprint }));
        MF.teardown.extracted = true;
        MF.log("Extracted " + ps2.length + " parts from " + dd.name);
        MF.toast("Extracted " + ps2.length + " parts · blueprints banked", "ok");
      } else if (act === "td-template") { MF.useAsTemplate(design().id); return; }
      else if (act === "td-compare") { compareModal(design()); return; }
      MF.save(); update(sec);
    };
    sec.onchange = function (e) {
      if (e.target.id === "td-chassis") {
        MF.teardown.id = e.target.value; MF.state.teardownId = e.target.value;
        MF.teardown.step = 0; MF.teardown.selected = null; MF.teardown.scanned = false; MF.teardown.extracted = false;
        MF.state.tdFit.routes = {};
        MF.save(); render(sec);
      }
    };
    const cv = $("td-canvas");
    cv.onclick = function (e) {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bestD = 1e9;
      MF.teardown.hit.forEach((h) => {
        const q = h.rect, cx = q.x + q.w / 2, cy = q.y + q.h / 2;
        const dd = Math.hypot(x - cx, y - cy);
        if (x >= q.x - 6 && x <= q.x + q.w + 6 && y >= q.y - 6 && y <= q.y + q.h + 6 && dd < bestD) {
          best = h.anchor; bestD = dd;
        }
      });
      if (best) { MF.teardown.selected = best; MF.toast("Selected part: " + best); update(sec); }
    };
    update(sec);
  }
  function applyFit(d, f) {
    const name = "PHYSICAL FIT · " + d.name;
    let s = MF.state.subsystems.find((x) => x.custom && x.name === name);
    if (!s) s = MF.newSubsystem("freeform");
    const t = f.totals;
    s.name = name; s.faction = "custom";
    s.note = "Generated from the TEARDOWN fit: routed bus draw + transfer losses, integration mass, " +
      "waste heat, signature and ECM of every mounted bay.";
    s.params.powerDraw = clamp(t.totalDelivered * 0.30, -300, 300);
    s.params.mass = clamp(t.mass * 0.02, -500, 1500);
    s.params.heatGen = clamp(t.totalLoss * 0.5 + Math.max(0, -t.heatMargin), 0, 300);
    s.params.heatDiss = clamp(t.totalDiss * 0.08, 0, 300);
    s.params.rcs = clamp(t.rcs * 0.05, -40, 60);
    s.params.ecm = clamp(t.ecm * 0.05, -40, 80);
    if (MF.state.installed.indexOf(s.id) < 0) MF.toggleInstalled(s.id);
    MF.save();
  }
  function update(sec) {
    const d = design(), ps = parts(), f = fit();
    const slider = sec ? sec.querySelector('[data-scope="teardown"]') : null;
    if (slider) { slider.max = ps.length; slider.value = MF.teardown.step; }
    const out = sec ? sec.querySelector('[data-out="teardown:step"]') : null;
    if (out) out.textContent = fmt(MF.teardown.step, 0);
    ["bus", "coolant"].forEach((k) => {
      const el = sec ? sec.querySelector('[data-scope="fit"][data-param="' + k + '"]') : null;
      if (el) el.value = MF.state.tdFit[k];
      const o = sec ? sec.querySelector('[data-out="fit:' + k + '"]') : null;
      if (o) o.textContent = fmt(MF.state.tdFit[k], 0) + " %";
    });
    const cv = $("td-canvas");
    if (cv) MF.teardown.hit = MF.draw.mech(cv, d.shape, ps, MF.teardown.step, MF.teardown.selected,
      { yaw: MF.teardown.yaw, layers: layers(), fit: f }) || [];
    const pl = $("td-partlist"); if (pl) pl.innerHTML = partListHTML(ps);
    const fb = $("td-fit"); if (fb) fb.innerHTML = fitHTML(f);
    const it = $("td-internals"); if (it) it.innerHTML = internalsHTML(ps);
    const tm = $("td-telemetry"); if (tm) tm.innerHTML = telemetryHTML(d, ps);
    const st = $("td-status");
    if (st) st.innerHTML = "CHASSIS <b>" + esc(d.name) + "</b> · PROFILE " + esc(d.internalsProfile || d.archetype) +
      " · " + ps.length + " MOUNTING BAYS · STEP " + MF.teardown.step + " · " +
      (MF.teardown.scanned ? "INTERNALS SCANNED" : "INTERNALS MASKED") +
      " · BUS <b>" + fmt(f.totals.powerMargin, 1) + " kW</b> · HEAT <b>" + fmt(f.totals.heatMargin, 1) +
      " kW</b> · " + (f.flags.length ? "<b style='color:#ff5f56'>" + f.flags.join(" / ") + "</b>" : "FIT NOMINAL");
  }
  function compareModal(d) {
    const others = MF.allDesigns();
    let h = '<div class="mf-row"><label class="mf-field" style="margin:0">COMPARE WITH</label>' +
      MF.ui.select("td-compare-id", others, others[1] ? others[1].id : others[0].id,
        (x) => x.name, (x) => x.id) + "</div><div id='td-compare-body'></div>";
    MF.modal("COMPARE · " + d.name, h);
    const draw = () => {
      const other = MF.getDesign($("td-compare-id").value) || d;
      const a = MF.sim.compute(d), b = MF.sim.compute(other);
      const rows = [
        ["Power margin (kW)", a.powerMargin, b.powerMargin], ["Total mass (kg)", a.totalMass, b.totalMass],
        ["Speed (m/s)", a.speed, b.speed], ["Net heat (kW)", a.netHeat, b.netHeat],
        ["Heat diss (kW)", a.heatDiss, b.heatDiss], ["Front RCS (m²)", a.rcsFront, b.rcsFront],
        ["Side RCS (m²)", a.rcsSide, b.rcsSide], ["Detect range (m)", a.detectRange, b.detectRange],
        ["Jam strength", a.jamStrength, b.jamStrength], ["Self emissions", a.selfEmissions, b.selfEmissions],
        ["Instability", a.reactor.instability, b.reactor.instability],
        ["Validation flags", a.validation.length, b.validation.length]
      ];
      $("td-compare-body").innerHTML = '<div class="mf-hr"></div><table class="mf-table"><thead><tr><th>METRIC</th><th>' +
        esc(d.name) + "</th><th>" + esc(other.name) + "</th></tr></thead><tbody>" +
        rows.map((r) => "<tr><td>" + esc(r[0]) + '</td><td class="num">' + fmt(r[1], 2) +
          '</td><td class="num">' + fmt(r[2], 2) + "</td></tr>").join("") + "</tbody></table>";
    };
    $("td-compare-id").onchange = draw;
    draw();
  }
  return { render, update };
})();
