/* MECH FORGE — fully custom chassis + limbs: modeling table, prefab assembly, subsystem hookup, internals. */

MF.forgeView = { yaw: 0.55, pitch: 0.22, zoom: 1 };
const SHAPE_RANGE = {
  torsoW: [0.8, 4.6, 0.05], torsoH: [1.2, 4.6, 0.05], torsoD: [0.7, 3.2, 0.05],
  headScale: [0.2, 1.6, 0.05], shoulderW: [0.8, 4.0, 0.05], shoulderH: [0.25, 1.8, 0.05],
  upperArm: [0.6, 3.2, 0.05], foreArm: [0.6, 3.4, 0.05], upperLeg: [0.8, 3.8, 0.05],
  lowerLeg: [0.8, 4.0, 0.05], hipW: [0.6, 3.4, 0.05], footL: [0.4, 2.8, 0.05],
  weaponX: [0.4, 3.6, 0.05], weaponY: [0.4, 3.8, 0.05], legStance: [0.5, 3.2, 0.05],
  armorFlare: [0, 1.8, 0.05], jetCount: [0, 8, 1],
  thrusterSize: [0.3, 1.8, 0.05], jumpJetCount: [1, 4, 1]
};
MF.SHAPE_RANGE = SHAPE_RANGE;

MF.tabs.forge = (function () {
  function sigHTML() {
    const s = MF.state.shape, g = s.sig || {};
    const slots = ["frame", "head", "shoulders", "back", "arms", "legs"];
    let h = '<h3>SIGNATURE PARTS · MIX COMPONENTS FROM THE ORIGINAL MECHS</h3>' +
      '<div class="mf-note">Pick a characteristic part type for each slot. Cockpit pods, cranial skulls, ' +
      "missile racks, ether wings, reverse-joint legs, hover discs, blade arms, crests and shields — all " +
      "drawn procedurally here as original geometry. Mix any of them; the only limits are balance and " +
      "your imagination. Each prefab ships with its own composition.</div>" +
      '<div class="mf-slider-grid">';
    slots.forEach((k) => {
      const lib = DATA.chassis.signatureParts[k];
      h += '<label class="mf-field">' + k.toUpperCase() + "</label>" +
        MF.ui.select("fg-sig-" + k, lib, g[k] || lib[0].id,
          (x) => x.label + " · " + x.source, (x) => x.id);
    });
    h += "</div>" + '<label class="mf-field">ACCENTS (UP TO 3)</label><div class="mf-chips">' +
      DATA.chassis.signatureParts.extras.map((x) => {
        const on = (g.extras || []).indexOf(x.id) >= 0;
        return '<span class="mf-chip ' + (on ? "on" : "") + '" data-act="fg-sig-extra" data-v="' +
          esc(x.id) + '" title="' + esc(x.note) + '">' + esc(x.label) + "</span>";
      }).join("") + "</div>";
    return h;
  }
  function modelHTML() {
    const s = MF.state.shape;
    const keys = Object.keys(SHAPE_RANGE);
    return '<h3>FULL MODELING TABLE · 20 PARAMETERS</h3>' +
      '<div class="mf-slider-grid">' + keys.map((k) => MF.ui.slider(k, k, SHAPE_RANGE[k][0], SHAPE_RANGE[k][1],
        SHAPE_RANGE[k][2], s[k], "shape", { unit: (k === "jetCount" || k === "jumpJetCount") ? "" : "", help: "Shape parameter " + k })).join("") + "</div>" +
      '<label class="mf-field">STYLE / SILHOUETTE FAMILY</label>' +
      MF.ui.select("fg-style", DATA.chassis.styles, s.style, (x) => x.toUpperCase(), (x) => x) +
      '<h3>SHAPE PRESETS (TEMPLATES, NOT THE HEADLINE)</h3><div class="mf-chips">' +
      Object.keys(DATA.chassis.presets).map((k) => '<span class="mf-chip" data-act="fg-preset" data-k="' + esc(k) + '">' +
        esc({ biped: "BIPED", atlas: "ATLAS", reversejoint: "REVERSE-JOINT", knight: "KNIGHT",
              spider: "SPIDER", tetrapod: "TETRAPOD", corpo: "CORPO" }[k] || k.toUpperCase()) +
        "</span>").join("") + "</div>" +
      '<div class="mf-hr"></div>' + sigHTML() +
      '<div class="mf-hr"></div><div class="mf-row">' +
      MF.ui.btn("RANDOMIZE", "fg-random") + MF.ui.btn("RESET", "fg-reset") +
      MF.ui.btn("BAKE SHAPE → COMBAT", "fg-bake", "primary") +
      MF.ui.btn("SAVE DESIGN", "fg-save") + "</div>";
  }
  function assemblyHTML() {
    const parts = DATA.components.parts;
    const byType = (t) => parts.filter((p) => p.type === t);
    const a = MF.state.assembly;
    let h = '<h3>PREFAB ASSEMBLY MODE · PICK A FRAME / LIMB SET</h3>' +
      '<div class="mf-note">Assembly mode composes a frame from procedural placeholder parts. Six attributes ' +
      "of the chosen parts are summed into an installable freeform subsystem. Use FULL MODELING TABLE for " +
      "true blank-slate chassis authoring.</div>";
    ["frame", "limbs", "cockpit", "mount"].forEach((t) => {
      h += '<label class="mf-field">' + t.toUpperCase() + "</label>" +
        MF.ui.select("fg-part-" + t, byType(t), a[t], (p) => p.name, (p) => p.id);
    });
    const chosen = ["frame", "limbs", "cockpit", "mount"].map((t) => parts.find((p) => p.id === a[t])).filter(Boolean);
    const sum = { name: "ASSEMBLY TOTAL" };
    MF.sixKeys.forEach((k) => { sum[k] = chosen.reduce((x, p) => x + (Number(p[k]) || 0), 0); });
    h += '<h4>CHOSEN PARTS · SIX ATTRIBUTES</h4>' + MF.ui.sixTable(chosen.concat([sum])) +
      '<div class="mf-hr"></div><div class="mf-row">' +
      MF.ui.btn("USE AS ASSEMBLY", "fg-assemble", "primary") +
      MF.ui.btn("SWITCH TO FULL MODELING TABLE", "fg-mode", "", { v: "model" }) + "</div>";
    return h;
  }
  function hookupHTML() {
    const subs = MF.state.subsystems;
    const pres = DATA.reactors.presets;
    let h = '<div class="mf-row"><label class="mf-field" style="margin:0">REACTOR PRESET</label></div>' +
      MF.ui.select("fg-reactor", pres, MF.state.reactorPresetId, (p) => p.name, (p) => p.id) +
      '<h4>INSTALLED PLAYER SUBSYSTEMS (' + MF.state.installed.length + ")</h4><div class=\"mf-list short\">";
    subs.forEach((s) => {
      const on = MF.state.installed.indexOf(s.id) >= 0;
      h += '<div class="mf-item" data-act="fg-install" data-id="' + esc(s.id) + '">' +
        '<div class="mf-item-title"><span>' + (on ? "☑ " : "☐ ") + esc(s.name) + "</span><span class=\"mf-pill " +
        (on ? "green" : "") + '">' + esc(DATA.subsystems.categories[s.category].short) + "</span></div>" +
        '<div class="mf-item-meta">' + esc(MF.ui.sixRow(MF.sim.derive(s).six)) + "</div></div>";
    });
    return h + "</div>";
  }
  function internalsHTML(d) {
    const ps = MF.tdParts(d);
    const rows = ps.map((p) => Object.assign({ name: p.name }, p.six));
    const total = { name: "ALL PARTS (Σ)" };
    MF.sixKeys.forEach((k) => { total[k] = rows.reduce((a, r) => a + Number(r[k] || 0), 0); });
    rows.push(total);
    return '<div class="mf-scroll" style="max-height:260px">' + MF.ui.sixTable(rows) + "</div>" +
      '<div class="mf-note">INTERNALS TREE: ' + ps.length + " parts · " +
      ps.reduce((a, p) => a + p.internals.length, 0) + " sub-components. Open TEARDOWN to step through " +
      "each part and scan its sub-components.</div>";
  }
  function statsHTML(t) {
    const s = MF.state.shape;
    return '<div class="mf-stats">' +
      MF.ui.stat("FRAME VOLUME", fmt(MF.sim.shapeVolume(s), 1), "u³", "cyan") +
      MF.ui.stat("TOTAL MASS", fmt(t.totalMass, 0), "kg") +
      MF.ui.stat("SPEED", fmt(t.speed, 2), "m/s", "green") +
      MF.ui.stat("FRONT RCS", fmt(t.rcsFront, 1), "m²", "violet") +
      MF.ui.stat("POWER MARGIN", fmt(t.powerMargin, 1), "kW", t.powerMargin < 0 ? "red" : "") +
      MF.ui.stat("NET HEAT", fmt(t.netHeat, 1), "kW", t.netHeat > 0 ? "red" : "") +
      "</div>" + '<div class="mf-kv">' +
      '<span class="k">CoM OFFSET</span><span>' + fmt(t.comOffset, 3) + "</span>" +
      '<span class="k">INERTIA</span><span>' + fmt(t.inertia, 0) + "</span>" +
      '<span class="k">STRUCTURAL STRESS</span><span>' + fmt(t.structuralStress, 2) + "</span>" +
      '<span class="k">DETECT RANGE</span><span>' + fmt(t.detectRange, 0) + " m</span>" +
      '<span class="k">JAM STRENGTH</span><span>' + fmt(t.jamStrength, 1) + "</span>" +
      '<span class="k">BAKED SILHOUETTE</span><span>' + (MF.state.bakedShape ? "YES · combat uses this shape" : "NO") + "</span></div>";
  }
  function render(sec) {
    const d = MF.activeDesign();
    const mode = MF.state.forgeMode;
    sec.innerHTML = '<div class="mf-grid" style="grid-template-columns:minmax(340px,.95fr) minmax(520px,1.45fr)">' +
      '<div>' +
      MF.ui.panel("MECH FORGE · CHASSIS & LIMB AUTHORING",
        '<div class="mf-row">' +
        MF.ui.btn("FULL MODELING TABLE", "fg-mode", mode === "model" ? "on" : "", { v: "model" }) +
        MF.ui.btn("PREFAB ASSEMBLY", "fg-mode", mode === "assembly" ? "on" : "", { v: "assembly" }) + "</div>" +
        '<div class="mf-hr"></div><label class="mf-field">DESIGN NAME</label>' +
        '<input class="mf-input" id="fg-name" value="' + esc(MF.state.forgeName) + '">' +
        '<div class="mf-hr"></div><div id="fg-mode-body">' + (mode === "model" ? modelHTML() : assemblyHTML()) + "</div>" +
        '<div class="mf-hr"></div><label class="mf-field">TEARDOWN SOURCE / TEMPLATE</label>' +
        MF.ui.select("fg-prefab", MF.allDesigns(), d.id, (x) => x.name, (x) => x.id) +
        '<div class="mf-row" style="margin-top:6px">' +
        MF.ui.btn("USE AS TEMPLATE", "fg-template") +
        MF.ui.btn("NEW BLANK FRAME", "fg-blank") +
        MF.ui.btn("EXPORT DESIGN JSON", "fg-export") +
        MF.ui.btn("IMPORT DESIGN", "fg-import") +
        MF.ui.btn("DEPLOY TO COMBAT", "fg-deploy", "primary") + "</div>" +
        '<div class="mf-note">Edits are working-copy until SAVE DESIGN or BAKE SHAPE. BAKE SHAPE writes the ' +
        "silhouette into your custom design so the combat sprite is your own shape.</div>", "amber") +
      MF.ui.panel("SUBSYSTEM HOOKUP", '<div id="fg-hookup">' + hookupHTML() + "</div>", "cyan") +
      "</div>" +
      '<div>' +
      MF.ui.panel("SHAPE VIEWS · FRONT / SIDE / DRAG-TO-ORBIT 3D WIREFRAME",
        '<div class="mf-canvas-row">' +
        '<div><div class="mf-canvas-label">FRONT ELEVATION · DIMENSION LABELS</div>' +
        '<canvas id="fg-front" class="mf-canvas med" width="330" height="240"></canvas></div>' +
        '<div><div class="mf-canvas-label">SIDE ELEVATION</div>' +
        '<canvas id="fg-side" class="mf-canvas med" width="330" height="240"></canvas></div></div>' +
        '<div class="mf-canvas-label">3D WIREFRAME · DRAG TO ORBIT · WHEEL TO ZOOM · GRID + DIMENSIONS</div>' +
        '<canvas id="fg-orbit" class="mf-canvas large" width="680" height="360"></canvas>', "cyan") +
      MF.ui.panel("LIVE FORGE TELEMETRY", '<div id="fg-stats"></div>') +
      MF.ui.panel("VALIDATION", '<div id="fg-validate"></div>', "red") +
      MF.ui.panel("INTERNALS TREE · SIX ATTRIBUTES PER PART", '<div id="fg-internals"></div>', "violet") +
      "</div></div>";
    bind(sec);
    update(sec);
  }
  function bind(sec) {
    sec.onclick = function (e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.dataset.act;
      if (a === "fg-mode") { MF.state.forgeMode = b.dataset.v; MF.save(); render(sec); }
      else if (a === "fg-sig-extra") {
        const g = MF.state.shape.sig || (MF.state.shape.sig = { extras: [] });
        g.extras = g.extras || [];
        const v = b.dataset.v, i = g.extras.indexOf(v);
        if (i >= 0) g.extras.splice(i, 1);
        else if (g.extras.length < 3) g.extras.push(v);
        else MF.toast("Maximum 3 accents — remove one first", "err");
        MF.save(); render(sec);
      }
      else if (a === "fg-preset") {
        MF.state.shape = clone(DATA.chassis.presets[b.dataset.k]); MF.save(); render(sec);
        MF.toast("Loaded shape preset " + b.dataset.k, "ok");
      } else if (a === "fg-random") {
        Object.keys(SHAPE_RANGE).forEach((k) => {
          const r = SHAPE_RANGE[k];
          const v = r[0] + Math.random() * (r[1] - r[0]);
          MF.state.shape[k] = (k === "jetCount" || k === "jumpJetCount") ? Math.round(v) : Math.round(v / r[2]) * r[2];
        });
        MF.state.shape.style = DATA.chassis.styles[Math.floor(Math.random() * DATA.chassis.styles.length)];
        const lib = DATA.chassis.signatureParts;
        const ng = {};
        ["frame", "head", "shoulders", "back", "arms", "legs"].forEach((k) => {
          ng[k] = lib[k][Math.floor(Math.random() * lib[k].length)].id;
        });
        ng.extras = lib.extras.filter(() => Math.random() < 0.28).slice(0, 3).map((x) => x.id);
        MF.state.shape.sig = ng;
        MF.save(); render(sec);
      } else if (a === "fg-reset") { MF.state.shape = clone(DATA.chassis.presets.biped); MF.save(); render(sec); }
      else if (a === "fg-bake") {
        const chk = MF.models ? MF.models.isAllowed(MF.state.shape) : { ok: true, reason: "" };
        if (DATA.models.policy.onlyExamplesAllowed && !chk.ok) {
          MF.toast("EXAMPLE-ONLY POLICY: " + chk.reason, "err"); render(sec); return;
        }
        const d = MF.saveWorkingDesign(($("fg-name") || {}).value);
        MF.setActive(d.id);
        MF.toast("BAKED: " + d.name + " silhouette now drives the combat sprite", "ok");
        render(sec); return;
      } else if (a === "fg-save") {
        const d = MF.saveWorkingDesign(($("fg-name") || {}).value);
        MF.toast("Saved custom design " + d.name, "ok"); render(sec);
      } else if (a === "fg-template") { MF.useAsTemplate($("fg-prefab").value); render(sec); }
      else if (a === "fg-blank") {
        MF.state.shape = clone(DATA.chassis.presets.biped);
        MF.state.forgeDesignId = null; MF.state.forgeName = "MY FRAME 01";
        MF.save(); render(sec);
      } else if (a === "fg-export") {
        const d = MF.saveWorkingDesign(($("fg-name") || {}).value);
        MF.exportJSON("mechfall-design-" + d.id + ".json", d);
      } else if (a === "fg-import") importModal(sec);
      else if (a === "fg-deploy") {
        const chk = MF.models ? MF.models.isAllowed(MF.state.shape) : { ok: true, reason: "" };
        if (DATA.models.policy.onlyExamplesAllowed && !chk.ok) {
          MF.toast("EXAMPLE-ONLY POLICY: " + chk.reason, "err"); render(sec); return;
        }
        const d = MF.saveWorkingDesign(($("fg-name") || {}).value);
        MF.setActive(d.id); MF.setTab("combat");
        MF.toast(d.name + " ready in COMBAT TEST", "ok"); return;
      } else if (a === "fg-install") { MF.toggleInstalled(b.dataset.id); render(sec); }
      else if (a === "fg-assemble") assemble(sec);
      MF.save();
    };
    sec.onchange = function (e) {
      if (e.target.id === "fg-style") { MF.state.shape.style = e.target.value; MF.save(); update(sec); }
      else if (e.target.id && e.target.id.indexOf("fg-sig-") === 0) {
        const slot = e.target.id.slice(7);
        const g = MF.state.shape.sig || (MF.state.shape.sig = { extras: [] });
        g[slot] = e.target.value;
        MF.save(); render(sec);
      }
      else if (e.target.id && e.target.id.indexOf("fg-part-") === 0) {
        MF.state.assembly[e.target.id.slice(8)] = e.target.value; MF.save(); render(sec);
      } else if (e.target.id === "fg-reactor") {
        const p = MF.presetById(e.target.value);
        MF.state.reactor = clone(p.params); MF.state.reactorPresetId = p.id;
        MF.syncReactorSubsystem();
        const d = MF.state.customDesigns.find((x) => x.id === MF.state.activeId);
        if (d) { d.reactor = clone(MF.state.reactor); d.reactorId = p.id; }
        MF.save(); render(sec);
      }
    };
    sec.oninput = function (e) {
      if (e.target.id === "fg-name") { MF.state.forgeName = e.target.value.slice(0, 60); MF.save(); }
    };
    const orbit = $("fg-orbit");
    if (orbit) {
      let dragging = false, lx = 0, ly = 0;
      orbit.onmousedown = function (e) { dragging = true; lx = e.clientX; ly = e.clientY; };
      window.addEventListener("mouseup", () => { dragging = false; });
      orbit.onmousemove = function (e) {
        if (!dragging) return;
        MF.forgeView.yaw += (e.clientX - lx) * 0.01;
        MF.forgeView.pitch = clamp(MF.forgeView.pitch + (e.clientY - ly) * 0.006, -0.7, 0.8);
        lx = e.clientX; ly = e.clientY;
        drawOrbit();
      };
      orbit.onwheel = function (e) {
        e.preventDefault();
        MF.forgeView.zoom = clamp(MF.forgeView.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.5, 2.2);
        drawOrbit();
      };
    }
  }
  function drawOrbit() {
    const cv = $("fg-orbit");
    if (cv) {
      const f = MF.fit(cv, true);
      const base = f ? Math.min(f.w / 9, f.h / 12) : 34;
      MF.draw.shapeOn(cv, MF.state.shape, {
        view: "orbit", yaw: MF.forgeView.yaw, pitch: MF.forgeView.pitch,
        scale: base * MF.forgeView.zoom,
        dimensions: true, labels: true, label: "ORBIT · YAW " + fmt(MF.forgeView.yaw, 2),
        filled: true, alpha: 0.16, shellOnly: true, ribs: false, solid: true
      });
    }
  }
  function update(sec) {
    const s = MF.state.shape;
    const f = $("fg-front"), sd = $("fg-side");
    if (f) MF.draw.shapeOn(f, s, { view: "front", dimensions: true, labels: true,
      label: "FRONT ELEVATION", filled: true, alpha: 0.18, shellOnly: true, ribs: false, solid: true });
    if (sd) MF.draw.shapeOn(sd, s, { view: "side", dimensions: true, labels: true,
      label: "SIDE ELEVATION", filled: true, alpha: 0.18, shellOnly: true, ribs: false, solid: true });
    drawOrbit();
    // Use a temporary design view so telemetry reflects the working shape even before saving.
    const d = clone(MF.activeDesign()); d.shape = clone(s);
    const t = MF.sim.compute(d);
    const st = $("fg-stats"); if (st) st.innerHTML = statsHTML(t);
    const va = $("fg-validate"); if (va) va.innerHTML = MF.ui.validList(t) +
      '<div class="mf-note">TEST MODE ' + (MF.state.testMode ? "ON — deployment allowed with penalties." : "OFF") + "</div>";
    const it = $("fg-internals"); if (it) it.innerHTML = internalsHTML(d);
  }
  function assemble(sec) {
    const parts = DATA.components.parts;
    const chosen = ["frame", "limbs", "cockpit", "mount"].map((t) => parts.find((p) => p.id === MF.state.assembly[t])).filter(Boolean);
    const sum = {};
    MF.sixKeys.forEach((k) => { sum[k] = chosen.reduce((x, p) => x + (Number(p[k]) || 0), 0); });
    const s = MF.newSubsystem("freeform");
    s.name = "ASSEMBLY PARTS · " + chosen.length + " COMPONENTS";
    s.note = "Six attributes summed from prefab assembly parts.";
    s.params = sum;
    if (MF.state.installed.indexOf(s.id) < 0) MF.state.installed.push(s.id);
    const arch = /RJ|Reverse/.test(chosen[1] ? chosen[1].name : "") ? "reversejoint" :
      /Spider/.test(chosen[1] ? chosen[1].name : "") ? "spider" :
      /Tetrapod/.test(chosen[1] ? chosen[1].name : "") ? "tetrapod" :
      /Knight/.test(chosen[1] ? chosen[1].name : "") ? "knight" : "biped";
    MF.state.shape = clone(DATA.chassis.presets[arch]);
    MF.state.forgeDesignId = null;
    MF.state.forgeName = "ASSEMBLED FRAME";
    MF.save();
    MF.toast("Assembly composed: " + chosen.length + " parts → freeform subsystem installed", "ok");
    render(sec);
  }
  function importModal(sec) {
    MF.modal("IMPORT CUSTOM DESIGN JSON",
      '<div class="mf-note">Paste a design object (as produced by EXPORT DESIGN JSON). Shape, reactor and subsystem ids are restored.</div>' +
      '<textarea class="mf-input" id="fg-import-text" style="min-height:200px"></textarea>' +
      '<div class="mf-row mf-end"><button class="mf-btn primary" id="fg-import-go">IMPORT</button></div>');
    $("fg-import-go").onclick = function () {
      const o = MF.importJSON($("fg-import-text").value, (x) => x && x.shape && x.shape.torsoW);
      if (!o) return;
      o.id = uid("design"); o.origin = "custom"; o.faction = "CUSTOM";
      o.tags = ["custom", "imported"]; o.internalsProfile = o.archetype || "biped";
      MF.state.customDesigns.push(o);
      MF.closeModal(); MF.setActive(o.id);
      MF.toast("Imported design " + o.name, "ok");
      render(sec);
    };
  }
  return { render, update };
})();
