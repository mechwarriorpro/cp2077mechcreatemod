/* HANGAR — prefab/teardown library, custom designs, unlock-all test mode, progression. */

MF.ui.btn = function (label, act, cls, data) {
  let attrs = "";
  Object.keys(data || {}).forEach((k) => { attrs += " data-" + k + '="' + esc(data[k]) + '"'; });
  return '<button class="mf-btn ' + (cls || "") + '" data-act="' + esc(act) + '"' + attrs + ">" + esc(label) + "</button>";
};
MF.ui.chips = function (items, active, act, dataKey) {
  return '<div class="mf-chips">' + items.map((x) =>
    '<span class="mf-chip ' + (x === active ? "on" : "") + '" data-act="' + esc(act) + '" data-' + esc(dataKey) + '="' +
    esc(x) + '">' + esc(x) + "</span>").join("") + "</div>";
};
MF.ui.validChips = function (t) {
  if (!t.validation.length) return '<span class="mf-pill green">ALL SYSTEMS NOMINAL</span>';
  return t.validation.map((v) => '<span class="mf-pill ' + (v.severity === "critical" ? "red" : "amber") +
    '" title="' + esc(v.detail) + '">' + esc(v.code) + "</span>").join("");
};
MF.ui.validList = function (t) {
  const all = DATA.simulation.validationStates;
  const active = {};
  t.validation.forEach((v) => { active[v.code] = v; });
  return '<ul class="mf-valid">' + all.map((v) => {
    const a = active[v.code];
    return '<li class="' + (a ? (a.severity === "critical" ? "critical" : "warn") : "ok") + '">' +
      '<span class="code">' + (a ? "●" : "○") + " " + esc(v.code) + '</span><span class="detail">' +
      (a ? esc(a.value) + " — " : "") + esc(v.detail) + "</span></li>";
  }).join("") + "</ul>";
};
MF.ui.sixRow = function (six) {
  return MF.sixKeys.map((k) => fmt(six[k], 1)).join(" / ");
};
MF.ui.select = function (id, options, value, labelFn, valFn) {
  return '<select class="mf-input" id="' + esc(id) + '">' + options.map((o) => {
    const v = valFn ? valFn(o) : o, l = labelFn ? labelFn(o) : o;
    return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? " selected" : "") + ">" + esc(l) + "</option>";
  }).join("") + "</select>";
};

/* ------------------------------------------------------------------ HANGAR */
MF.tabs.hangar = (function () {
  function selected() { return MF.getDesign(MF.state.hangarSelectedId || MF.state.activeId) || MF.activeDesign(); }
  function filtered() {
    const f = MF.state.hangarFilter;
    return MF.allDesigns().filter((d) => f === "ALL" || d.faction === f || (f === "CUSTOM" && d.origin === "custom"));
  }
  function detailHTML(d) {
    const t = MF.sim.compute(d);
    const reactors = DATA.reactors.presets;
    const rp = reactors.find((p) => p.id === d.reactorId);
    const shapeRows = DATA.chassis.shapeKeys.map((k) =>
      "<tr><td>" + esc(k) + '</td><td class="num">' + (typeof d.shape[k] === "number" ? fmt(d.shape[k], 2) : esc(d.shape[k])) + "</td></tr>").join("");
    return '<div class="mf-row between"><h2>' + esc(d.name) + '</h2><span class="mf-pill ' +
      (d.origin === "custom" ? "green" : "cyan") + '">' + (d.origin === "custom" ? "PLAYER-AUTHORED FRAME" : "PREFAB / TEARDOWN SOURCE") + "</span></div>" +
      '<div class="mf-kv"><span class="k">FACTION</span><span>' + esc(d.faction) + "</span>" +
      '<span class="k">ARCHETYPE</span><span>' + esc(d.archetype) + " / " + esc(d.shape.style) + "</span>" +
      '<span class="k">ROLE</span><span>' + esc(d.role) + "</span>" +
      '<span class="k">ALIASES</span><span>' + esc((d.aliases || []).join(", ") || "—") + "</span>" +
      '<span class="k">REACTOR</span><span>' + esc(rp ? rp.name : (d.reactorId || "custom")) + "</span>" +
      '<span class="k">HARDPOINTS</span><span>' + esc(d.hardpoints || 6) + "</span></div>" +
      '<div class="mf-note">' + esc(d.note || "Procedural placeholder frame; no ripped assets.") + "</div>" +
      '<div class="mf-stats">' +
      MF.ui.stat("POWER MARGIN", fmt(t.powerMargin, 1), "kW", t.powerMargin < 0 ? "red" : "green") +
      MF.ui.stat("MASS", fmt(t.totalMass, 0), "kg", "cyan") +
      MF.ui.stat("NET HEAT", fmt(t.netHeat, 1), "kW", t.netHeat > 0 ? "red" : "") +
      MF.ui.stat("FRONT RCS", fmt(t.rcsFront, 1), "m²", "violet") +
      MF.ui.stat("JAM STR", fmt(t.jamStrength, 1), "str", "violet") +
      MF.ui.stat("INSTABILITY", fmt(t.reactor.instability, 2), "", t.reactor.instability > 0.95 ? "red" : "") +
      "</div>" +
      '<h3>VALIDATION</h3><div class="mf-chips">' + MF.ui.validChips(t) + "</div>" +
      '<div class="mf-grid2"><div><h3>SHAPE VECTOR (20 PARAMS)</h3><div class="mf-scroll" style="max-height:230px">' +
      '<table class="mf-table"><tbody>' + shapeRows + "</tbody></table></div></div>" +
      '<div><h3>INSTALLED INTERNALS (' + (d.subsystemIds || []).length + ")</h3>" +
      MF.ui.sixTable((d.subsystemIds || []).map((id) => {
        const s = MF.subsystemById(id);
        return s ? Object.assign({ name: s.name }, MF.sim.derive(s, { shape: d.shape }).six) : { name: id };
      })) + "</div></div>" +
      '<div class="mf-hr"></div><div class="mf-row">' +
      MF.ui.btn("DEPLOY TO COMBAT", "hangar-deploy", "primary") +
      MF.ui.btn("TEAR DOWN", "hangar-teardown") +
      MF.ui.btn("USE AS TEMPLATE", "hangar-template") +
      MF.ui.btn("EXPORT DESIGN JSON", "hangar-export") +
      MF.ui.btn("NEW CUSTOM FRAME", "hangar-new") +
      (d.origin === "custom" ? MF.ui.btn("DELETE CUSTOM FRAME", "hangar-delete", "danger") : "") +
      "</div>";
  }
  function render(sec) {
    const factions = ["ALL", "CUSTOM"].concat(Object.keys(DATA.chassis.factions));
    const d = selected();
    sec.innerHTML =
      '<div class="mf-grid2" style="grid-template-columns:minmax(260px,.85fr) minmax(420px,1.6fr)">' +
      '<div>' +
      MF.ui.panel("HANGAR · PREFAB / TEARDOWN LIBRARY",
        '<div class="mf-row between"><span class="mf-pill amber">UNLOCK ALL (TEST MODE): <b>' +
        (MF.state.unlockAll ? "ON" : "OFF") + "</b></span>" +
        MF.ui.btn(MF.state.unlockAll ? "DISABLE" : "ENABLE", "hangar-unlock", "small") + "</div>" +
        '<div class="mf-hr"></div>' + MF.ui.chips(factions, MF.state.hangarFilter, "hangar-filter", "v") +
        '<div class="mf-hr"></div><div class="mf-list" id="hangar-list"></div>' +
        '<div class="mf-hr"></div><div class="mf-kv">' +
        '<span class="k">XP</span><span>' + MF.state.xp + "</span>" +
        '<span class="k">SALVAGE</span><span>' + MF.state.salvage + "</span>" +
        '<span class="k">BLUEPRINTS</span><span>' + MF.state.blueprints.length + "</span>" +
        '<span class="k">INVENTORY</span><span>' + MF.state.inventory.length + "</span>" +
        '<span class="k">WAVES CLEARED</span><span>' + MF.state.wavesCleared + "</span></div>" +
        '<div class="mf-note">Hostile mechs, boss waves and salvage/XP progression exist only as the combat test harness. ' +
        "Famous frames are prefabs: tear them down, mine parts, then build your own.</div>" +
        '<div class="mf-note">Every thumbnail is a <b>sleek procedural mech wireframe</b> — tapered hulls, ' +
        "joint rings, swept fins and nozzle bells from the parametric shape table. Player-authored custom " +
        "frames and prefabs use the same original geometry.</div>", "amber") +
      "</div>" +
      '<div id="hangar-detail" class="mf-panel cyan"></div></div>';
    const list = $("hangar-list");
    list.innerHTML = filtered().map((x) => {
      const isActive = x.id === MF.state.activeId;
      return '<div class="mf-item ' + (x.id === d.id ? "active" : "") + '" data-act="hangar-select" data-id="' + esc(x.id) + '">' +
        '<canvas class="thumb" width="44" height="44" data-shape="' + esc(x.id) + '"></canvas>' +
        '<div class="mf-item-title"><span>' + esc(x.name) + "</span>" + (isActive ? '<span class="mf-pill green">ACTIVE</span>' : "") + "</div>" +
        '<div class="mf-item-meta">' + esc(x.faction) + " · " + esc(x.archetype) + " · " +
        esc(x.origin === "custom" ? "CUSTOM" : "PREFAB") + "</div></div>";
    }).join("");
    sec.querySelectorAll("canvas[data-shape]").forEach((cv) => {
      const x = MF.getDesign(cv.dataset.shape);
      if (!x) return;
      MF.draw.shapeOn(cv, x.shape, { view: "front", filled: true, gridStep: 12,
        alpha: 0.20, ribs: false, shellOnly: true, solid: true });
    });
    $("hangar-detail").innerHTML = detailHTML(d);
    sec.onclick = function (e) {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.dataset.act, id = b.dataset.id;
      if (act === "hangar-filter") { MF.state.hangarFilter = b.dataset.v; MF.save(); render(sec); }
      else if (act === "hangar-select") { MF.state.hangarSelectedId = id; MF.save(); render(sec); }
      else if (act === "hangar-unlock") { MF.state.unlockAll = !MF.state.unlockAll; MF.save(); MF.toast("UNLOCK ALL (TEST MODE) " + (MF.state.unlockAll ? "ON" : "OFF")); render(sec); }
      else if (act === "hangar-deploy") {
        MF.setActive(d.id); MF.setTab("combat"); MF.toast("Deployed " + d.name + " to COMBAT TEST", "ok");
      } else if (act === "hangar-teardown") {
        MF.state.teardownId = d.id; MF.teardown.id = d.id; MF.teardown.step = 0; MF.teardown.selected = null;
        MF.save(); MF.setTab("teardown");
      } else if (act === "hangar-template") MF.useAsTemplate(d.id);
      else if (act === "hangar-export") MF.exportJSON("mechfall-design-" + d.id + ".json", d);
      else if (act === "hangar-new") {
        MF.state.shape = clone(DATA.chassis.presets.biped);
        MF.state.forgeDesignId = null; MF.state.forgeName = "MY FRAME 01";
        MF.state.bakedShape = clone(MF.state.shape);
        MF.save(); MF.setTab("forge"); MF.toast("Blank modeling table ready — author everything yourself.", "ok");
      } else if (act === "hangar-delete") {
        MF.state.customDesigns = MF.state.customDesigns.filter((x) => x.id !== d.id);
        if (MF.state.activeId === d.id) MF.setActive("bt7274");
        MF.state.hangarSelectedId = null; MF.save(); render(sec);
      }
    };
  }
  function update(sec) {
    const el = $("hangar-detail");
    if (el) el.innerHTML = detailHTML(selected());
  }
  return { render, update };
})();
