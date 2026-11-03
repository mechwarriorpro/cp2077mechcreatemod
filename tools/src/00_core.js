"use strict";
/* MECHFALL // FORGE 77 — core: state, persistence, helpers, tab registry. */

const MF = (window.MF = window.MF || {});
const DATA = JSON.parse(document.getElementById("mf-data").textContent);
MF.DATA = DATA;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (v, d = 1) => (Number.isFinite(Number(v)) ? Number(v).toFixed(d) : "—");
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = (p = "mf") => p + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

MF.util = { esc, clamp, lerp, fmt, clone, uid, $ };

/* ---------- storage: localStorage may throw in a sandboxed iframe ---------- */
const memStore = {};
const SKEY = "mechfall.forge.v1";
MF.store = {
  get(k, fallback) {
    try { const v = window.localStorage.getItem(SKEY + "." + k); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : fallback; }
  },
  set(k, v) {
    memStore[k] = v;
    try { window.localStorage.setItem(SKEY + "." + k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  },
  del(k) { delete memStore[k]; try { window.localStorage.removeItem(SKEY + "." + k); } catch (e) {} },
  available() { try { window.localStorage.setItem(SKEY + ".probe", "1"); window.localStorage.removeItem(SKEY + ".probe"); return true; } catch (e) { return false; } }
};

/* ---------- defaults ---------- */
const presetById = (id) => DATA.reactors.presets.find((p) => p.id === id) || DATA.reactors.presets[0];
const chassisById = (id) => DATA.chassis.roster.find((c) => c.id === id);
const templateById = (id) => DATA.subsystems.templates.find((s) => s.id === id);

function defaults() {
  const coeffs = {};
  Object.keys(DATA.simulation.coefficients).forEach((k) => { coeffs[k] = DATA.simulation.coefficients[k].value; });
  const subs = DATA.subsystems.templates.map((s) => clone(s));
  return {
    version: 1,
    tab: "systems",
    activeId: "bt7274",
    customDesigns: [],
    subsystems: subs,
    installed: ["bus_standard", "loop_standard", "structure_standard", "signature_standard",
      "ew_standard", "sensors_standard", "actuators_standard", "reactor_standard"],
    shape: clone(DATA.chassis.presets.biped),
    coat: clone(DATA.compat.crystalCoat.fields),
    pilotSeed: DATA.compat.pilot.terrain.seed,
    pilotCamera: "CHASE",
    pilotAutopilot: false,
    ingameCore: DATA.compat.ingamePilot.coreRecords[0].id,
    ingameParts: Math.min(DATA.compat.ingamePilot.physics.maxParts, DATA.compat.ingamePilot.partRecords.length),
    ingameCamera: "CHASE",
    ingameCockpit: true,
    ingamePatch: DATA.compat.ingamePilot.targetPatch,
    ingameHasPL: DATA.compat.ingamePilot.defaultHasPL,
    modelsSelected: DATA.models.models[0].id,
    modelsView: "front",
    modelsYaw: 0.42,
    customWeapons: [], loadout: [],
    reactor: clone(presetById("vanguard_link_shard").params),
    reactorPresetId: "vanguard_link_shard",
    biome: "badlands",
    forgeMode: "model",
    forgeName: "MY FRAME 01",
    forgeDesignId: null,
    assembly: { frame: "frame_vanguard", limbs: "limbs_biped", cockpit: "cockpit_standard", mount: "mount_xo16" },
    bakedShape: null,
    coefficients: coeffs,
    testMode: true,
    unlockAll: true,
    allowInvalidDeploy: true,
    difficulty: 1,
    hangarFilter: "ALL",
    subsystemFilter: "ALL",
    selectedSubsystemId: "bus_standard",
    teardownId: "bt7274",
    tdLayers: { wireframe: true, internals: true, flows: true },
    tdFit: { bus: 100, coolant: 100, routes: {} },
    xp: 0,
    salvage: 0,
    blueprints: [],
    inventory: [],
    wavesCleared: 0,
    log: ["FORGE 77 online. Blank-slate subsystem authoring enabled."]
  };
}

function loadState() {
  const d = defaults();
  const saved = MF.store.get("state", null);
  if (!saved || saved.version !== 1) return d;
  const out = Object.assign(d, saved);
  // Defensive: data files may have gained new fields since a save.
  out.coefficients = Object.assign({}, d.coefficients, saved.coefficients || {});
  if (!Array.isArray(out.subsystems) || !out.subsystems.length) out.subsystems = d.subsystems;
  if (!Array.isArray(out.installed)) out.installed = d.installed;
  if (!Array.isArray(out.customDesigns)) out.customDesigns = [];
  out.shape = Object.assign({}, d.shape, saved.shape || {});
  if (!out.shape || !out.shape.torsoW) out.shape = d.shape;
  if (!out.coat || !out.coat.primary) out.coat = d.coat;
  if (!Number.isFinite(out.pilotSeed)) out.pilotSeed = d.pilotSeed;
  if (!out.ingameCore) out.ingameCore = d.ingameCore;
  if (!Number.isFinite(out.ingameParts)) out.ingameParts = d.ingameParts;
  if (!out.ingameCamera) out.ingameCamera = d.ingameCamera;
  if (typeof out.ingameCockpit !== "boolean") out.ingameCockpit = d.ingameCockpit;
  if (!out.ingamePatch) out.ingamePatch = d.ingamePatch;
  if (typeof out.ingameHasPL !== "boolean") out.ingameHasPL = d.ingameHasPL;
  if (!out.modelsSelected) out.modelsSelected = d.modelsSelected;
  if (!out.modelsView) out.modelsView = d.modelsView;
  if (!Number.isFinite(out.modelsYaw)) out.modelsYaw = d.modelsYaw;
  if (!Array.isArray(out.customWeapons)) out.customWeapons = [];
  if (!Array.isArray(out.loadout)) out.loadout = [];
  if (!out.tdLayers) out.tdLayers = d.tdLayers;
  if (!out.tdFit) out.tdFit = d.tdFit;
  if (!out.tdFit.routes) out.tdFit.routes = {};
  if (!out.reactor || !Number.isFinite(out.reactor.F)) out.reactor = d.reactor;
  return out;
}
MF.state = loadState();
MF.save = function () { MF.store.set("state", MF.state); MF.renderStatus(); };
MF.resetState = function () { MF.store.del("state"); MF.state = defaults(); MF.save(); MF.refresh(); };

/* ---------- config access ---------- */
MF.coeff = (k) => Number(MF.state.coefficients[k] ?? DATA.simulation.coefficients[k].value);
MF.threshold = (k) => DATA.simulation.validationThresholds[k];
MF.chassisById = chassisById;
MF.presetById = presetById;
MF.templateById = templateById;
MF.sixKeys = DATA.simulation.sixAttributes.map((a) => a.key);
MF.sixLabels = DATA.simulation.sixAttributes;

/* ---------- designs ---------- */
MF.getDesign = function (id) {
  if (!id) return null;
  const custom = MF.state.customDesigns.find((d) => d.id === id);
  if (custom) return custom;
  const c = chassisById(id);
  if (!c) return null;
  return {
    id: c.id, name: c.name, origin: "prefab", faction: c.faction, archetype: c.archetype,
    role: c.role, aliases: c.aliases, shape: c.shape, style: c.shape.style,
    subsystemIds: c.subsystems, reactor: clone(presetById(c.reactorId).params),
    reactorId: c.reactorId, hardpoints: c.hardpoints, note: c.note, tags: c.tags,
    massScale: c.massScale, internalsProfile: c.internalsProfile
  };
};
MF.allDesigns = function () {
  return DATA.chassis.roster.map((c) => MF.getDesign(c.id)).concat(MF.state.customDesigns);
};
MF.activeDesign = function () { return MF.getDesign(MF.state.activeId) || MF.getDesign("bt7274"); };
MF.setActive = function (id) {
  const d = MF.getDesign(id);
  if (!d) return;
  MF.state.activeId = id;
  MF.state.shape = clone(d.shape);
  MF.state.installed = clone(d.subsystemIds);
  MF.state.reactor = clone(d.reactor);
  MF.state.forgeDesignId = d.origin === "custom" ? d.id : null;
  MF.state.forgeName = d.origin === "custom" ? d.name : d.name + " / CUSTOM";
  MF.state.reactorPresetId = d.reactorId || "vanguard_link_shard";
  MF.state.bakedShape = clone(d.shape);
  MF.syncReactorSubsystem();
  MF.save();
  MF.refresh();
};
MF.syncReactorSubsystem = function () {
  MF.state.subsystems.forEach((s) => {
    if (s.category === "mana_reactor") s.params = clone(MF.state.reactor);
  });
};

/* Save / create a custom design from the working modeling table. */
MF.saveWorkingDesign = function (name) {
  const sid = MF.state.forgeDesignId;
  let d = sid ? MF.state.customDesigns.find((x) => x.id === sid) : null;
  if (!d) {
    d = { id: uid("design"), origin: "custom", faction: "CUSTOM", created: DATA.meta.build };
    MF.state.customDesigns.push(d);
  }
  d.name = (name || MF.state.forgeName || "UNNAMED FRAME").trim().slice(0, 60) || "UNNAMED FRAME";
  d.archetype = MF.state.shape.style === "knight" ? "knight" :
    MF.state.shape.style === "spider" ? "spider" :
    MF.state.shape.style === "tetrapod" ? "tetrapod" : "biped";
  d.role = "Player-authored frame";
  d.aliases = [];
  d.shape = clone(MF.state.shape);
  d.style = MF.state.shape.style;
  d.subsystemIds = clone(MF.state.installed);
  d.reactor = clone(MF.state.reactor);
  d.reactorId = MF.state.reactorPresetId;
  d.hardpoints = 6;
  d.note = "Authored in MECH FORGE. All shape parameters and internal subsystems are player-owned.";
  d.tags = ["custom", "player-authored", d.archetype];
  d.internalsProfile = d.archetype;
  d.massScale = 1;
  MF.state.forgeDesignId = d.id;
  MF.state.forgeName = d.name;
  MF.state.bakedShape = clone(d.shape);
  MF.save();
  return d;
};
MF.useAsTemplate = function (id) {
  const d = MF.getDesign(id);
  if (!d) return;
  MF.state.shape = clone(d.shape);
  MF.state.installed = clone(d.subsystemIds);
  MF.state.reactor = clone(d.reactor);
  MF.state.reactorPresetId = d.reactorId || "vanguard_link_shard";
  MF.state.forgeDesignId = null;
  MF.state.forgeName = d.name + " / CUSTOM";
  MF.state.bakedShape = clone(d.shape);
  MF.state.blueprints = Array.from(new Set(MF.state.blueprints.concat(["bp_" + d.id])));
  MF.syncReactorSubsystem();
  MF.save();
  MF.log("Loaded '" + d.name + "' as an editable shape/part template.");
  MF.toast("Template loaded into MECH FORGE: " + d.name, "ok");
  MF.setTab("forge");
};

/* ---------- subsystems ---------- */
MF.subsystemById = function (id) {
  return MF.state.subsystems.find((s) => s.id === id) || templateById(id) || null;
};
MF.newSubsystem = function (category) {
  const cat = category || "freeform";
  const params = {};
  DATA.subsystems.categories[cat].params.forEach((p) => { params[p.key] = cat === "freeform" ? 0 : p.default; });
  const s = { id: uid("sub"), name: "NEW SUBSYSTEM", category: cat, params: params,
    note: "Blank-slate player-authored component.", faction: "custom", custom: true };
  MF.state.subsystems.push(s);
  MF.state.selectedSubsystemId = s.id;
  MF.save();
  return s;
};
MF.deleteSubsystem = function (id) {
  const s = MF.subsystemById(id);
  if (!s || !s.custom) { MF.toast("Built-in templates cannot be deleted; duplicate them instead.", "err"); return; }
  MF.state.subsystems = MF.state.subsystems.filter((x) => x.id !== id);
  MF.state.installed = MF.state.installed.filter((x) => x !== id);
  if (MF.state.selectedSubsystemId === id) MF.state.selectedSubsystemId = "bus_standard";
  MF.save(); MF.refresh();
};
MF.duplicateSubsystem = function (id) {
  const s = MF.subsystemById(id);
  if (!s) return;
  const n = clone(s); n.id = uid("sub"); n.name = s.name + " (COPY)"; n.custom = true;
  MF.state.subsystems.push(n); MF.state.selectedSubsystemId = n.id; MF.save(); MF.refresh();
};
MF.toggleInstalled = function (id) {
  const i = MF.state.installed.indexOf(id);
  if (i >= 0) MF.state.installed.splice(i, 1); else MF.state.installed.push(id);
  // Sync the active custom design so deployments are consistent.
  const d = MF.state.customDesigns.find((x) => x.id === MF.state.activeId);
  if (d) d.subsystemIds = clone(MF.state.installed);
  MF.save(); MF.refreshLive();
};

/* ---------- logging, toasts, modal, export ---------- */
MF.log = function (msg) {
  MF.state.log = MF.state.log || [];
  MF.state.log.unshift("[" + new Date().toISOString().slice(11, 19) + "] " + msg);
  MF.state.log = MF.state.log.slice(0, 80);
  const el = $("combat-log");
  if (el) {
    const div = document.createElement("div");
    div.className = "mf-item"; div.style.cursor = "default";
    div.textContent = MF.state.log[0];
    el.insertBefore(div, el.firstChild);
    while (el.children.length > 22) el.removeChild(el.lastChild);
  }
  MF.save();
};
MF.toast = function (msg, kind) {
  const host = $("mf-toast");
  if (!host) return;
  const d = document.createElement("div");
  d.className = "mf-toast-item" + (kind ? " " + kind : "");
  d.textContent = msg;
  host.appendChild(d);
  setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 4200);
};
MF.modal = function (title, html) {
  $("mf-modal-title").textContent = title;
  $("mf-modal-body").innerHTML = html;
  $("mf-modal").classList.add("on");
};
MF.closeModal = function () { $("mf-modal").classList.remove("on"); };
MF.download = function (name, text, mime) {
  try {
    const blob = new Blob([text], { type: mime || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    MF.toast("Exported " + name, "ok");
  } catch (e) { MF.toast("Export failed: " + e.message, "err"); }
};
MF.copyText = function (text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand && document.execCommand("copy");
    ta.remove();
    MF.toast(ok ? "Copied to clipboard" : "Copy unavailable — use the text box", ok ? "ok" : "err");
  } catch (e) { MF.toast("Copy unavailable — use the text box", "err"); }
};
MF.exportJSON = function (name, obj) { MF.download(name, JSON.stringify(obj, null, 2), "application/json"); };
MF.importJSON = function (text, validate) {
  try {
    const o = JSON.parse(text);
    if (validate && validate(o) === false) throw new Error("unexpected JSON shape");
    return o;
  } catch (e) { MF.toast("Import failed: " + e.message, "err"); return null; }
};

/* ---------- reusable HTML fragments ---------- */
MF.ui = {
  slider(key, label, min, max, step, value, scope, extra) {
    const unit = extra && extra.unit ? extra.unit : "";
    const help = extra && extra.help ? ' title="' + esc(extra.help) + '"' : "";
    const attrs = (extra && extra.attrs) || "";
    return '<div class="mf-slider"><label' + help + '>' + esc(label) + '</label>' +
      '<input type="range" data-scope="' + esc(scope) + '" data-param="' + esc(key) + '" ' + attrs +
      ' min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
      '<output data-out="' + esc(scope) + ":" + esc(key) + '" data-unit="' + esc(unit) + '">' +
      fmt(value, step < 1 ? 2 : 0) + esc(unit) + '</output></div>';
  },
  paramSlider(cat, p, value, scope, extra) {
    return MF.ui.slider(p.key, p.label, p.min, p.max, p.step, Number(value ?? p.default), scope,
      Object.assign({ unit: " " + p.unit, help: p.help }, extra || {}));
  },
  stat(k, v, unit, cls) {
    return '<div class="mf-stat ' + (cls || "") + '"><span class="k">' + esc(k) + '</span>' +
      '<span class="v">' + v + '</span><span class="u">' + esc(unit || "") + '</span></div>';
  },
  barRow(label, v, max, text, cls) {
    const w = clamp(100 * (Number(v) / (Number(max) || 1)), 0, 100);
    return '<div class="mf-bar-row"><span>' + esc(label) + '</span><div class="mf-bar"><i class="' +
      (cls || "") + '" style="width:' + fmt(w, 0) + '%"></i></div><span class="num">' + esc(text) + '</span></div>';
  },
  sixTable(rows, opts) {
    const o = opts || {};
    let h = '<table class="mf-table"><thead><tr><th>' + esc(o.first || "PART") + '</th>' +
      MF.sixLabels.map((a) => '<th style="text-align:right">' + esc(a.label.replace(" contribution", "").replace(" generated", " gen").replace(" dissipated", " diss")) + '</th>').join("") +
      '</tr></thead><tbody>';
    rows.forEach((r) => {
      h += "<tr><td>" + esc(r.name) + (r.qty && r.qty > 1 ? ' <span class="mf-dim">×' + r.qty + "</span>" : "") + "</td>";
      MF.sixKeys.forEach((k) => {
        const v = Number(r[k] || 0) * (o.multiplyQty === false ? 1 : (r.qty || 1));
        h += '<td class="num ' + (v < 0 ? "neg" : "") + '">' + fmt(v, 1) + "</td>";
      });
      h += "</tr>";
    });
    return h + "</tbody></table>";
  },
  panel(title, body, cls) {
    return '<div class="mf-panel ' + (cls || "") + '"><h2>' + esc(title) + "</h2>" + body + "</div>";
  }
};

/* ---------- tab registry ---------- */
MF.tabs = {};
MF.registerTab = function (name, obj) { MF.tabs[name] = obj; };
MF.renderTab = function (name) {
  const t = MF.tabs[name];
  const sec = $("tab-" + name);
  if (!t || !sec) return;
  if (t.render) t.render(sec);
  if (t.update) t.update(sec);
};
MF.refresh = function () {
  document.querySelectorAll(".mf-tabbtn").forEach((b) => b.classList.toggle("active", b.dataset.tab === MF.state.tab));
  document.querySelectorAll(".mf-tab").forEach((s) => s.classList.toggle("active", s.id === "tab-" + MF.state.tab));
  MF.renderTab(MF.state.tab);
  MF.renderStatus();
};
MF.refreshLive = function () {
  const t = MF.tabs[MF.state.tab];
  if (t && t.update) t.update($("tab-" + MF.state.tab));
  MF.renderStatus();
};
MF.setTab = function (name) {
  if (!MF.tabs[name] && name !== "combat") return;
  MF.state.tab = name;
  MF.save();
  MF.refresh();
  if (name === "combat" && MF.combat && MF.combat.onEnter) MF.combat.onEnter();
  if (name === "pilot" && MF.pilot && MF.pilot.onEnter) MF.pilot.onEnter();
  if (name === "models" && MF.models && MF.models.onEnter) MF.models.onEnter();
};
MF.renderStatus = function () {
  const d = MF.activeDesign();
  const t = MF.sim ? MF.sim.compute(d) : null;
  const left = $("mf-status-left");
  if (left) {
    left.innerHTML = "ACTIVE: <b>" + esc(d ? d.name : "—") + "</b> · " +
      (d && d.origin === "custom" ? "CUSTOM FRAME" : "PREFAB / TEARDOWN SOURCE") +
      " · SUBSYSTEMS <b>" + MF.state.installed.length + "</b> · BIOME <b>" +
      esc((DATA.reactors.biomes[MF.state.biome] || {}).label || MF.state.biome) + "</b>";
  }
  const right = $("mf-status-right");
  if (right && t) {
    const bad = t.validation.filter((v) => v.severity === "critical").length;
    right.innerHTML = "POWER <b>" + fmt(t.powerMargin, 1) + " kW</b> · MASS <b>" + fmt(t.totalMass, 0) +
      " kg</b> · HEAT <b>" + fmt(t.netHeat, 1) + " kW</b> · RCS <b>" + fmt(t.rcsFront, 1) +
      " m²</b> · ECM <b>" + fmt(t.jamStrength, 1) + "</b> · <b class='" + (bad ? "mf-blink" : "") + "'>" +
      (bad ? bad + " CRITICAL" : "NOMINAL") + "</b>";
  }
  const stamp = $("mf-build-stamp");
  if (stamp) stamp.textContent = "BUILD " + DATA.meta.build;
};

/* ---------- global input delegation ---------- */
MF.handleRange = function (el) {
  const scope = el.dataset.scope, key = el.dataset.param, v = Number(el.value);
  const out = document.querySelector('[data-out="' + scope + ":" + key + '"]');
  if (out) out.textContent = fmt(v, Number(el.step) < 1 ? 2 : 0) + (out.dataset.unit || "");
  if (scope === "shape") {
    if (key === "jetCount" || key === "jumpJetCount") MF.state.shape[key] = Math.round(v);
    else MF.state.shape[key] = v;
    MF.save();
  } else if (scope === "reactor") {
    MF.state.reactor[key] = v;
    MF.state.reactorPresetId = "custom";
    MF.syncReactorSubsystem(); MF.save();
  } else if (scope === "subsystem") {
    const s = MF.subsystemById(el.dataset.sid);
    if (s) { s.params[key] = v; MF.save(); }
  } else if (scope === "coeff") {
    MF.state.coefficients[key] = v; MF.save();
  } else if (scope === "rcoeff") {
    MF.state.reactorCoeffs[key] = v; MF.save();
  } else if (scope === "weapon") {
    if (MF.weapons) MF.weapons.draftGet().params[key] = v;
  } else if (scope === "teardown") {
    if (MF.teardown) MF.teardown.step = v;
  } else if (scope === "fit") {
    if (MF.state.tdFit) { MF.state.tdFit[key] = v; MF.save(); }
  }
  MF.refreshLive();
};
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el && el.tagName === "INPUT" && el.type === "range" && el.dataset.param) MF.handleRange(el);
});
document.addEventListener("click", (e) => {
  const b = e.target.closest ? e.target.closest("[data-tab]") : null;
  if (b) MF.setTab(b.dataset.tab);
  if (e.target.id === "mf-modal-close" || e.target.id === "mf-modal") MF.closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") MF.closeModal();
});
