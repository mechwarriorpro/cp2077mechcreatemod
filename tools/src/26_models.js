/* FULL MODEL LIBRARY + TRACES — only the 30 example chassis are allowed.
   models.json is the closed source of truth: every entry carries its own complete
   procedural model (20-param shape vector + signature-part composition) and a
   front / side / top blueprint trace with internal mounting bays. No imported,
   extracted, ripped, traced-from-screenshot or base-mod geometry is used. */

MF.models = {
  bound: false, selected: "bt7274", view: "front", yaw: 0.42, terrain: null,
  policy: DATA.models.policy,
  library: DATA.models.models,

  byId(id) { return this.library.find((m) => m.id === id) || this.library[0]; },
  useShippedMesh: true,

  /* Convert the SHIPPED indexed triangulated mesh in models.json into the mesh
     format consumed by MF.mesh3d.render(). No geometry is generated here. */
  meshFromData(id) {
    const m = this.byId(id), md = m.mesh;
    if (!md || !md.vertices || !md.triangles) return null;
    const V = md.vertices, P = md.parts;
    const groupOf = { torso: "armor", cockpit: "sensor", limb: "actuator",
      system: "vent", weapon: "weapon", shield: "armor" };
    const boneOf = (name) => {
      const n = String(name).toLowerCase();
      if (/head|cockpit|canopy|sensor|antenna/.test(n)) return "head";
      if (/weapon|arm|shoulder/.test(n)) return /\bL\b|_l\b|left/.test(name) ? "armL" : "armR";
      if (/leg|foot|knee|hip/.test(n)) return /\bL\b|_l\b|left/.test(name) ? "legL" : "legR";
      return "body";
    };
    const tris = md.triangles.map((t, i) => {
      const part = P[t[3]] || { section: "torso", name: "PART" };
      return { v: [V[t[0]], V[t[1]], V[t[2]]],
        group: groupOf[part.section] || "frame", anchor: part.name,
        bone: boneOf(part.name),
        var: ((i * 2654435761) % 1000) / 1000 };
    });
    let minY = 0;
    V.forEach((v) => { if (v[1] < minY) minY = v[1]; });
    return { tris, parts: md.partCount, minY, frame: m.bodyPlan,
      shipped: true, triangleCount: tris.length };
  },
  trace(id, view) { return (this.byId(id).trace || {})[view || this.view] || null; },

  /* "they are the only ones allowed": reject generic / untyped hulls and any
     signature part that does not come from the example part library. */
  isAllowed(shape) {
    const lib = DATA.chassis.signatureParts;
    const sig = shape && shape.sig;
    if (!sig) return { ok: false, reason: "NO EXAMPLE SIGNATURE COMPOSITION · generic hull rejected" };
    for (const slot of ["frame", "head", "shoulders", "back", "arms", "legs"]) {
      const ids = (lib[slot] || []).map((x) => x.id);
      if (ids.indexOf(sig[slot]) < 0)
        return { ok: false, reason: "SLOT " + slot.toUpperCase() + " is not an example part" };
    }
    const extraIds = (lib.extras || []).map((x) => x.id);
    for (const e of (sig.extras || [])) {
      if (extraIds.indexOf(e) < 0) return { ok: false, reason: "ACCENT " + e + " is not an example part" };
    }
    return { ok: true, reason: "EXAMPLE-DERIVED FULL MODEL · allowed" };
  },

  /* ---------------------------------------------------------- trace renderer */
  drawTrace(canvas, id, view, opts) {
    const f = MF.fit(canvas); if (!f) return false;
    const { ctx, w, h } = f, o = opts || {}, tr = this.trace(id, view || this.view);
    if (!tr) return false;
    const padX = o.pad === undefined ? 16 : o.pad, padY = o.pad === undefined ? 14 : o.pad;
    const X = (x) => padX + x * (w - padX * 2);
    const Y = (y) => h - padY - y * (h - padY * 2);
    ctx.save();
    ctx.fillStyle = "#07121a"; ctx.fillRect(0, 0, w, h);
    /* blueprint grid */
    ctx.strokeStyle = "rgba(58,169,201,0.10)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(X(i / 10), 0); ctx.lineTo(X(i / 10), h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, Y(i / 10)); ctx.lineTo(w, Y(i / 10)); ctx.stroke();
    }
    /* centre axis */
    if (tr.axes) {
      ctx.strokeStyle = "rgba(255,179,71,0.35)"; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(X(tr.axes[0][0]), Y(tr.axes[0][1]));
      ctx.lineTo(X(tr.axes[1][0]), Y(tr.axes[1][1])); ctx.stroke(); ctx.setLineDash([]);
    }
    const poly = (pts, stroke, fill, lw, close) => {
      if (!pts || !pts.length) return;
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
      if (close) ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.2; ctx.stroke(); }
    };
    /* internal panels first */
    (tr.panels || []).forEach((p) => poly(p.points, "rgba(58,169,201,0.28)", null, 1));
    /* full component polygons */
    (tr.parts || []).forEach((p) => {
      const kind = p.kind || "";
      const stroke = kind === "leg" ? "#4fd2a8" : kind === "back" ? "#c69bf5" :
        kind === "head" ? "#ffd27f" : kind === "thruster" ? "#ff9a5c" : "#8fd8e8";
      poly(p.points, stroke, "rgba(58,169,201,0.10)", 1.1, p.points.length > 2);
    });
    /* main full-model outline */
    poly(tr.outline, "#56d8f2", "rgba(28,86,110,0.20)", 2, true);
    /* internal mounting bays — staggered leader labels so side/top views stay readable */
    (tr.bays || []).forEach((b, i) => {
      ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), Math.max(3, b.r * w * 0.7), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,179,71,0.85)"; ctx.lineWidth = 1; ctx.stroke();
      if (!o.compact) {
        const dx = i % 2 === 0 ? 9 : -9 - 5.4 * b.name.length;
        const dy = -3 - (i % 3) * 11;
        ctx.strokeStyle = "rgba(255,179,71,0.35)";
        ctx.beginPath(); ctx.moveTo(X(b.x), Y(b.y));
        ctx.lineTo(X(b.x) + (i % 2 === 0 ? 7 : -7), Y(b.y) + dy + 3); ctx.stroke();
        ctx.fillStyle = "rgba(255,207,130,0.92)"; ctx.font = "8px monospace";
        ctx.fillText(b.name, X(b.x) + dx, Y(b.y) + dy);
      }
    });
    if (!o.compact) {
      ctx.fillStyle = "#56d8f2"; ctx.font = "10px monospace";
      ctx.fillText((view || this.view).toUpperCase() + " ELEVATION · " + this.byId(id).name, 8, 14);
      ctx.fillStyle = "rgba(200,225,235,0.65)"; ctx.font = "9px monospace";
      ctx.fillText("EXAMPLE-ONLY FULL MODEL TRACE · bays = power / heat / ECM / sensors", 8, h - 6);
    }
    ctx.restore();
    return true;
  },

  /* ------------------------------------------------------- full 3D model */
  drawFull3D(canvas, id, yaw) {
    const f = MF.fit(canvas); if (!f) return 0;
    const { ctx, w, h } = f;
    if (!this.terrain) this.terrain = MF.mesh3d.terrain(7717, DATA.compat.pilot.terrain);
    const m = this.byId(id);
    const fullShape = Object.assign({}, m.shape, { sig: m.sig });
    const mesh = (this.useShippedMesh && MF.models.meshFromData(id)) || MF.mesh3d.fromShape(fullShape);
    const polys = MF.mesh3d.render(ctx, w, h, {
      camera: { pos: [Math.sin(yaw) * 13.5, 6.4, -Math.cos(yaw) * 13.5], target: [0, 3.1, 0],
        fov: 1.02, near: 0.6, far: 460 },
      terrain: this.terrain, center: [0, 0, 0], coat: MF.state.coat || DATA.compat.crystalCoat.fields,
      mechs: [{ mesh, pos: [0, 0, 0], yaw: 0,
        pose: MF.mesh3d.pose(fullShape, { gait: 0 }), coat: MF.state.coat || DATA.compat.crystalCoat.fields }],
      effects: [], light: [-0.45, 0.82, -0.36]
    });
    ctx.save();
    ctx.fillStyle = "rgba(4,10,16,0.74)"; ctx.fillRect(0, 0, w, 22); ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = "#4dd0e1"; ctx.font = "10px monospace";
    ctx.fillText("EXAMPLE-ONLY FULL 3D MODEL · " + m.name + " · " + String(m.bodyPlan).toUpperCase() +
      " · " + polys + " TRIANGLES" + (mesh.shipped ? " (SHIPPED MESH)" : " (PROCEDURAL)"), 7, 14);
    ctx.fillStyle = "#ffb347";
    ctx.fillText("SOURCE " + m.sourceId + " · 30 ALLOWED EXAMPLES · NO IMPORTED GEOMETRY", 7, h - 7);
    ctx.restore();
    return polys;
  },

  /* ------------------------------------------------------------ panels/HTML */
  policyHTML() {
    const p = this.policy;
    return '<div class="mf-kv">' +
      '<span class="k">LIBRARY</span><span><b>' + p.allowedCount + ' example chassis</b> — the ONLY allowed full models / traces</span>' +
      '<span class="k">POLICY</span><span>onlyExamplesAllowed=' + p.onlyExamplesAllowed +
      ' · rejectGenericHulls=' + p.rejectGenericHulls + '</span>' +
      '<span class="k">SOURCE</span><span><code>models.json</code> → 30 entries, each derived only from its own ' +
      '<code>chassis.json</code> roster shape vector + signature-part composition</span>' +
      '<span class="k">CONTENTS</span><span>complete 20-parameter model · three INDEPENDENT front / side / top ' +
      'orthographic traces · component polygons · internal mounting bays · <b>real indexed triangulated 3D mesh</b></span>' +
      '<span class="k">3D MESH</span><span>' + this.library.reduce((a, x) => a + (x.mesh ? x.mesh.triangleCount : 0), 0) +
      ' triangles across ' + this.library.length + ' example-only full models</span>' +
      '<span class="k">CUSTOM BUILDS</span><span>still fully customisable — parts must come from these examples</span>' +
      '<span class="k">ASSETS</span><span>no ripped / imported / extracted / screenshot-traced geometry, textures or base-mod files</span>' +
      '</div>';
  },

  cardHTML(m, i) {
    const a = this.isAllowed(m.shape);
    return '<div class="mf-panel tight models-card' + (m.id === this.selected ? ' sel' : '') +
      '" data-model="' + esc(m.id) + '">' +
      '<canvas class="models-thumb" width="150" height="170" data-model="' + esc(m.id) + '"></canvas>' +
      '<div class="mf-row between"><b>' + esc(m.name) + '</b><span class="mf-pill">' + String(i + 1).padStart(2, "0") + '</span></div>' +
      '<div class="mf-note">' + esc(m.faction) + ' · ' + esc(m.bodyPlan) + ' · ' + esc(m.role) + '</div>' +
      '<div class="mf-note">' + esc(a.reason) + '</div>' +
      '<div class="mf-row"><button class="mf-btn small" data-act="models-load" data-v="' + esc(m.id) + '">FORGE</button>' +
      '<button class="mf-btn small" data-act="models-pilot" data-v="' + esc(m.id) + '">PILOT</button>' +
      '<button class="mf-btn small" data-act="models-select" data-v="' + esc(m.id) + '">VIEW</button></div></div>';
  },

  html() {
    const m = this.byId(this.selected), t = MF.sim.compute(MF.getDesign(this.selected) || MF.activeDesign());
    return MF.ui.panel("FULL MODELS & TRACES · EXAMPLES ONLY",
      '<div class="mf-note">Every full model and every trace below is generated <b>only</b> from the 30 example ' +
      'chassis in <code>chassis.json</code>. Those examples are the only allowed model sources; generic hulls and ' +
      'any outside geometry are rejected. Each model ships a complete 20-parameter shape vector, its signature-part ' +
      'composition, and front / side / top blueprint traces with internal mounting bays. No assets are imported.</div>' +
      this.policyHTML(), "cyan") +
      '<div class="mf-grid2"><div class="mf-panel"><h2>FULL 3D MODEL · <span id="models-name">' + esc(m.name) + '</span></h2>' +
      '<canvas id="models-3d" class="mf-scan" width="520" height="360"></canvas>' +
      '<div class="mf-row"><button class="mf-btn small" data-act="models-rotate">ROTATE MODEL</button>' +
      '<button class="mf-btn small" data-act="models-mesh">' +
      (this.useShippedMesh ? "USE PROCEDURAL MESH" : "USE SHIPPED 3D MESH") + '</button>' +
      '<button class="mf-btn small" data-act="models-load">LOAD INTO FORGE</button>' +
      '<button class="mf-btn small" data-act="models-pilot">DEPLOY IN PILOT</button>' +
      '<button class="mf-btn small" data-act="models-validate">VALIDATE ACTIVE DESIGN</button></div>' +
      '<div class="mf-note"><b>Shipped 3D mesh</b> from <code>models.json</code> (' +
      this.byId(this.selected).mesh.triangleCount + ' triangles, ' +
      this.byId(this.selected).mesh.partCount + ' parts) or the equivalent procedural mesh from ' +
      '<code>MF.mesh3d.fromShape()</code>. Side / top traces are independent depth / plan measurements, ' +
      'not affine copies. ORIGINAL GLB EXPORT: <code>assets/original_meshes/mechfall_' + esc(m.id) +
      '.glb</code> is generated from this same example-only geometry by <code>tools/export_meshes.py</code> ' +
      '(NOT COMPILED / NOT INSTALLED / NOT IN-GAME VERIFIED — no ripped assets). ' +
      'Six-attribute telemetry: power ' + fmt(t.powerMargin, 1) + ' kW · mass ' +
      fmt(t.totalMass, 0) + ' kg · heat ' + fmt(t.netHeat, 1) + ' kW · RCS ' + fmt(t.rcsFront, 1) +
      ' m² · ECM ' + fmt(t.jamStrength, 1) + '.</div></div>' +
      '<div class="mf-panel"><h2>FULL MODEL TRACE · <span id="models-view-label">FRONT</span></h2>' +
      '<canvas id="models-trace" class="mf-scan" width="520" height="360"></canvas>' +
      '<div class="mf-row"><button class="mf-btn small" data-act="models-view" data-v="front">FRONT</button>' +
      '<button class="mf-btn small" data-act="models-view" data-v="side">SIDE</button>' +
      '<button class="mf-btn small" data-act="models-view" data-v="top">TOP</button>' +
      '<span class="mf-pill violet" id="models-part-count"></span></div>' +
      '<div class="mf-note">Blueprint trace: closed full-model outline, every signature component polygon, panel ' +
      'lines and physical internal mounting bays. Traces are generated from the example data — not copied from ' +
      'any external image or model.</div></div></div>' +
      MF.ui.panel("MODEL LIBRARY · " + this.library.length + " ALLOWED EXAMPLES",
        '<div class="mf-note">Click a card to inspect its full model and trace. Only these ' + this.library.length +
        ' example-derived full models are allowed; players may freely mix their signature parts in MECH FORGE.</div>' +
        '<div class="models-grid" id="models-gallery">' + this.library.map((x, i) => this.cardHTML(x, i)).join("") + '</div>');
  },

  /* ------------------------------------------------------------------ tab */
  render(sec) {
    if (!this.bound) {
      this.bound = true;
      sec.addEventListener("click", (e) => this.onClick(e));
    }
    sec.innerHTML = this.html();
    this.drawAll(sec);
  },
  update(sec) { this.drawAll(sec); },
  onEnter() { this.selected = MF.state.modelsSelected || this.selected; },
  drawAll(sec) {
    const big = $("models-3d"), tr = $("models-trace");
    if (big) MF.models.drawFull3D(big, this.selected, this.yaw);
    if (tr) MF.models.drawTrace(tr, this.selected, this.view);
    const n = $("models-name"), vl = $("models-view-label"), pc = $("models-part-count");
    if (n) n.textContent = this.byId(this.selected).name;
    if (vl) vl.textContent = String(this.view).toUpperCase();
    const t = this.trace(this.selected, this.view);
    if (pc && t) pc.textContent = (t.parts || []).length + " COMPONENTS / " + (t.bays || []).length + " BAYS";
    (sec || document).querySelectorAll(".models-thumb").forEach((cv) => {
      MF.models.drawTrace(cv, cv.dataset.model, "front", { compact: true, pad: 8 });
    });
  },
  select(id) {
    this.selected = id; MF.state.modelsSelected = id; MF.save();
    const sec = $("tab-models"); if (sec) { sec.innerHTML = this.html(); this.drawAll(sec); }
  },
  loadIntoForge(id) {
    const m = this.byId(id);
    MF.state.shape = clone(m.shape);
    MF.state.forgeName = m.name + " · TRACE";
    MF.save(); MF.setTab("forge");
    MF.toast("Loaded example full model " + m.name + " into MECH FORGE", "ok");
  },
  deployInPilot(id) {
    const m = this.byId(id);
    MF.state.bakedShape = clone(m.shape);
    MF.setActive(id);
    if (MF.pilot) MF.pilot.active = false;
    MF.setTab("pilot");
    MF.toast("Example full model " + m.name + " deployed in PILOT TEST", "ok");
  },
  validateActive() {
    const d = MF.activeDesign(), a = this.isAllowed(d.shape);
    MF.modal("EXAMPLE-ONLY FULL MODEL POLICY",
      '<div class="mf-note">Active design: <b>' + esc(d.name) + '</b></div>' +
      '<div class="mf-kv"><span class="k">RESULT</span><span>' + (a.ok ? "ALLOWED" : "REJECTED") +
      '</span><span class="k">REASON</span><span>' + esc(a.reason) + '</span>' +
      '<span class="k">ALLOWED SOURCES</span><span>' + this.library.length + ' example chassis only</span></div>' +
      '<div class="mf-note">' + esc(this.policy.note) + '</div>');
  },
  onClick(e) {
    const b = e.target.closest("[data-act]");
    if (!b) {
      const card = e.target.closest("[data-model]");
      if (card) this.select(card.dataset.model);
      return;
    }
    const a = b.dataset.act, v = b.dataset.v || this.selected;
    if (a === "models-select") this.select(v);
    else if (a === "models-load") this.loadIntoForge(v);
    else if (a === "models-pilot") this.deployInPilot(v);
    else if (a === "models-view") { this.view = v; this.update($("tab-models")); }
    else if (a === "models-rotate") { this.yaw += 0.55; this.update($("tab-models")); }
    else if (a === "models-mesh") { this.useShippedMesh = !this.useShippedMesh;
      const sec = $("tab-models"); if (sec) { sec.innerHTML = this.html(); this.drawAll(sec); } }
    else if (a === "models-validate") this.validateActive();
  }
};

MF.registerTab("models", MF.models);
