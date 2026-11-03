/* DOSSIER + SETTINGS — reports, config exponents, test mode, honest disclaimers. */

MF.tabs.dossier = (function () {
  function html() {
    const d = MF.activeDesign(), t = MF.sim.compute(d);
    const shapeRows = DATA.chassis.shapeKeys.map((k) => "<tr><td>" + esc(k) + '</td><td class="num">' +
      (typeof d.shape[k] === "number" ? fmt(d.shape[k], 2) : esc(d.shape[k])) + "</td></tr>").join("");
    const partRows = t.parts.map((p) => Object.assign({ name: p.name }, p.six));
    const lib = DATA.chassis.signatureParts, sig = d.shape.sig || {};
    const sigRows = ["frame", "head", "shoulders", "back", "arms", "legs"].map((slot) => {
      const entry = lib[slot].find((x) => x.id === sig[slot]);
      return "<tr><td>" + slot.toUpperCase() + "</td><td>" + esc(entry ? entry.label : "—") +
        "</td><td class='mf-dim'>" + esc(entry ? entry.source : "") + "</td></tr>";
    }).join("") + "<tr><td>ACCENTS</td><td colspan='2'>" +
      esc((sig.extras || []).map((id) => { const e = lib.extras.find((x) => x.id === id); return e ? e.label : id; }).join(" · ") || "none") +
      "</td></tr>";
    return '<div class="mf-row between"><h2>' + esc(d.name) + ' · ENGINEERING DOSSIER</h2>' +
      '<span class="mf-pill ' + (d.origin === "custom" ? "green" : "cyan") + '">' +
      (d.origin === "custom" ? "PLAYER-AUTHORED" : "PREFAB / SOURCE MATERIAL") + "</span></div>" +
      '<div class="mf-note">Canonical name: <b>' + esc(d.name) + "</b> · aliases: " +
      esc((d.aliases || []).join(", ") || "none recorded") + ". Spelling variants are recorded, not duplicated. " +
      "Famous frames exist only to be studied, torn apart and mined for parts.</div>" +
      '<div class="mf-grid2"><div>' +
      MF.ui.panel("CHASSIS VECTOR", '<table class="mf-table"><thead><tr><th>PARAM</th><th>VALUE</th></tr></thead><tbody>' +
        shapeRows + "</tbody></table>") +
      MF.ui.panel("SIGNATURE PART COMPOSITION", '<div class="mf-note">Original procedural part ' +
        "TYPES inspired by the characteristic components of the study frames — mixable in MECH FORGE." +
        "</div><table class=\"mf-table\"><thead><tr><th>SLOT</th><th>PART</th><th>STUDY REFERENCE</th></tr></thead><tbody>" +
        sigRows + "</tbody></table>") +
      MF.ui.panel("REACTOR", '<div class="mf-kv">' +
        '<span class="k">PRESET</span><span>' + esc(d.reactorId || "custom") + "</span>" +
        '<span class="k">NET OUTPUT</span><span>' + fmt(t.reactor.netOutput, 1) + " kW</span>" +
        '<span class="k">INSTABILITY</span><span>' + fmt(t.reactor.instability, 3) + "</span>" +
        '<span class="k">HEAT LOAD</span><span>' + fmt(t.reactor.heatLoad, 1) + " kW</span>" +
        '<span class="k">CRYSTAL RCS</span><span>' + fmt(t.crystalSignature, 1) + " m²</span>" +
        '<span class="k">MELTDOWN</span><span>' + (t.reactor.meltdown ? "YES" : "NO") + "</span></div>") +
      "</div><div>" +
      MF.ui.panel("TELEMETRY", '<div class="mf-kv">' +
        '<span class="k">POWER USED / MARGIN</span><span>' + fmt(t.powerUsedEff, 1) + " / " + fmt(t.powerMargin, 1) + " kW</span>" +
        '<span class="k">TOTAL MASS / SPEED</span><span>' + fmt(t.totalMass, 0) + " kg / " + fmt(t.speed, 2) + " m/s</span>" +
        '<span class="k">CoM / INERTIA</span><span>' + fmt(t.comOffset, 3) + " / " + fmt(t.inertia, 0) + "</span>" +
        '<span class="k">HEAT GEN / DISS</span><span>' + fmt(t.heatGen, 1) + " / " + fmt(t.heatDiss, 1) + " kW</span>" +
        '<span class="k">RCS F/S/R</span><span>' + fmt(t.rcsFront, 1) + " / " + fmt(t.rcsSide, 1) + " / " + fmt(t.rcsRear, 1) + " m²</span>" +
        '<span class="k">DETECT / LOCK</span><span>' + fmt(t.detectRange, 0) + " m / " + fmt(t.missileLockTime, 2) + " s</span>" +
        '<span class="k">JAM / SELF-EMISSIONS</span><span>' + fmt(t.jamStrength, 1) + " / " + fmt(t.selfEmissions, 1) + "</span></div>") +
      MF.ui.panel("VALIDATION", MF.ui.validList(t), "red") +
      "</div></div>" +
      MF.ui.panel("INSTALLED INTERNALS · SIX ATTRIBUTES", '<div class="mf-scroll" style="max-height:320px">' +
        MF.ui.sixTable(partRows) + "</div>", "violet") +
      MF.ui.panel("EQUATIONS WITH LIVE VALUES", MF.sim.equations(t).map((e) =>
        '<div class="mf-eq">' + esc(e.formula) + "<br><b>→ " + esc(e.live) + "</b></div>").join("")) +
      MF.ui.panel("TRADE-OFF MATRIX", '<table class="mf-table"><thead><tr><th>LEVER</th><th>EFFECT</th></tr></thead><tbody>' +
        DATA.simulation.tradeoffs.map((x) => "<tr><td>" + esc(x.left) + "</td><td>" + esc(x.effect) + "</td></tr>").join("") +
        "</tbody></table>") +
      '<div class="mf-warnbox"><b>HONEST DISCLAIMER.</b> This is a browser prototype plus a CET-only UI test mod. ' +
      "It is testable: the simulation, authoring tools and combat harness run in your browser, and the ImGui " +
      "overlay runs in Cyberpunk 2077. A full 3D pilotable-mech release would need original meshes, rigs, " +
      "animations, VO, the game itself and private base-mod APIs. No base-mod files are bundled or edited; " +
      "no third-party models, textures or ripped assets are used — all geometry is drawn procedurally. Optional hooks are pcall-wrapped and never required.</div>" +
      '<div class="mf-hr"></div><div class="mf-row">' +
      MF.ui.btn("EXPORT DOSSIER JSON", "ds-json") +
      MF.ui.btn("EXPORT DOSSIER TEXT", "ds-text") +
      MF.ui.btn("GENERATE CET LUA", "ds-lua") + "</div>";
  }
  function text(d, t) {
    const lines = ["MECHFALL // FORGE 77 — ENGINEERING DOSSIER", "Design: " + d.name,
      "Origin: " + d.origin, "Faction: " + d.faction, "Aliases: " + (d.aliases || []).join(", "), "",
      "POWER  used " + fmt(t.powerUsedEff, 1) + " kW / margin " + fmt(t.powerMargin, 1) + " kW",
      "MASS   " + fmt(t.totalMass, 0) + " kg / speed " + fmt(t.speed, 2) + " m/s / CoM " + fmt(t.comOffset, 3),
      "HEAT   gen " + fmt(t.heatGen, 1) + " kW / diss " + fmt(t.heatDiss, 1) + " kW / net " + fmt(t.netHeat, 1) + " kW",
      "RCS    front " + fmt(t.rcsFront, 1) + " / side " + fmt(t.rcsSide, 1) + " / rear " + fmt(t.rcsRear, 1) + " m2",
      "ECM    jam " + fmt(t.jamStrength, 1) + " / lockBreak " + fmt(t.lockBreak, 2) + " / emissions " + fmt(t.selfEmissions, 1),
      "REACTOR instability " + fmt(t.reactor.instability, 3), "", "INTERNALS:"];
    t.parts.forEach((p) => lines.push("  " + p.name + " · " + MF.ui.sixRow(p.six)));
    lines.push("", "VALIDATION: " + (t.validation.map((v) => v.code).join(", ") || "NOMINAL"));
    return lines.join("\n");
  }
  function render(sec) {
    sec.innerHTML = '<div id="ds-body" class="mf-panel cyan"></div>';
    $("ds-body").innerHTML = html();
    sec.onclick = function (e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const d = MF.activeDesign(), t = MF.sim.compute(d);
      if (b.dataset.act === "ds-json") MF.exportJSON("mechfall-dossier-" + d.id + ".json", { design: d, telemetry: {
        powerUsed: t.powerUsedEff, powerMargin: t.powerMargin, totalMass: t.totalMass, speed: t.speed,
        heatGen: t.heatGen, heatDiss: t.heatDiss, rcsPolar: t.rcsPolar, jamStrength: t.jamStrength,
        selfEmissions: t.selfEmissions, validation: t.validation } });
      else if (b.dataset.act === "ds-text") MF.download("mechfall-dossier-" + d.id + ".txt", text(d, t), "text/plain");
      else if (b.dataset.act === "ds-lua") {
        const lua = MF.sim.luaForDesign(d);
        MF.modal("CET LUA · CUSTOM DESIGN",
          '<textarea class="mf-input" style="min-height:260px" readonly>' + esc(lua) + "</textarea>" +
          '<div class="mf-row mf-end"><button class="mf-btn primary" id="ds-copy">COPY</button></div>');
        $("ds-copy").onclick = () => MF.copyText(lua);
      }
    };
  }
  function update(sec) { const el = $("ds-body"); if (el) el.innerHTML = html(); }
  return { render, update };
})();

/* ------------------------------------------------------------------ SETTINGS */
MF.tabs.settings = (function () {
  const RCO_RANGE = {
    sizeExponent: [0.3, 1.5, 0.05], instabilitySizeExponent: [0.8, 3.0, 0.05],
    instabilityFlowExponent: [0.5, 2.5, 0.05], gradeBonus: [0, 0.3, 0.01],
    derateFactor: [0, 0.9, 0.01], S_ref: [0.5, 2.5, 0.05], F_ref: [1, 12, 0.1],
    heatLoadFactor: [0.2, 3, 0.05], signatureFactor: [0, 8, 0.1], resonanceFactor: [0, 3, 0.05],
    outputScale: [5, 80, 1]
  };
  function coefHTML() {
    let h = '<div class="mf-slider-grid">';
    Object.keys(DATA.simulation.coefficients).forEach((k) => {
      const c = DATA.simulation.coefficients[k];
      h += MF.ui.slider(k, c.label, c.min, c.max, c.step, MF.coeff(k), "coeff");
    });
    return h + "</div>";
  }
  function rcoHTML() {
    let h = '<div class="mf-slider-grid">';
    Object.keys(RCO_RANGE).forEach((k) => {
      const r = RCO_RANGE[k];
      h += MF.ui.slider(k, k, r[0], r[1], r[2], MF.rcoeff(k), "rcoeff");
    });
    return h + "</div>";
  }
  function render(sec) {
    const biomes = Object.keys(DATA.reactors.biomes);
    sec.innerHTML = '<div class="mf-grid2">' +
      '<div>' +
      MF.ui.panel("SIMULATION COEFFICIENTS · LIVE CONFIG",
        '<div class="mf-note">Every exponent and constant used by the power / mass / thermal / RCS / ECM model ' +
        "is exposed here. Changes apply immediately across all tabs and are saved with your session.</div>" +
        coefHTML() + '<div class="mf-hr"></div><div class="mf-row">' +
        MF.ui.btn("RESET COEFFICIENTS", "st-reset-co") +
        MF.ui.btn("RESET REACTOR EXPONENTS", "st-reset-rco") + "</div>", "amber") +
      MF.ui.panel("REACTOR MODEL EXPONENTS", rcoHTML() +
        '<div class="mf-note">The S and F exponents and the RCS/ECM falloff exponents are config, never hard-coded. ' +
        "Doubling S ≈ 2^sizeExponent power vs 2^instabilitySizeExponent instability.</div>", "cyan") +
      "</div><div>" +
      MF.ui.panel("TEST MODE / ENVIRONMENT",
        '<div class="mf-row">' +
        MF.ui.btn("TEST MODE: " + (MF.state.testMode ? "ON" : "OFF"), "st-test", MF.state.testMode ? "on" : "") +
        MF.ui.btn("UNLOCK ALL: " + (MF.state.unlockAll ? "ON" : "OFF"), "st-unlock", MF.state.unlockAll ? "on" : "") +
        MF.ui.btn("ALLOW INVALID DEPLOY: " + (MF.state.allowInvalidDeploy ? "YES" : "NO"), "st-invalid",
          MF.state.allowInvalidDeploy ? "on" : "") + "</div>" +
        '<div class="mf-hr"></div><label class="mf-field">BIOME (AMBIENT MANA)</label>' +
        MF.ui.select("st-biome", biomes, MF.state.biome, (b) => DATA.reactors.biomes[b].label + " ×" +
          DATA.reactors.biomes[b].multiplier, (b) => b) +
        '<label class="mf-field">DIFFICULTY (HOSTILE SENSOR FACTOR)</label>' +
        MF.ui.select("st-difficulty", [0.6, 0.8, 1, 1.3, 1.7, 2.2], MF.state.difficulty,
          (v) => "×" + v, (v) => v) +
        '<div class="mf-note">TEST MODE allows deployment with BROWNOUT, THERMAL SATURATION, CONTAINMENT ' +
        "FAILURE etc. Penalties still apply in combat. Validation states are always displayed.</div>", "violet") +
      MF.ui.panel("DATA / PERSISTENCE",
        '<div class="mf-kv"><span class="k">STORAGE</span><span>' +
        (MF.store.available() ? "localStorage available" : "in-memory fallback (sandboxed iframe)") + "</span>" +
        '<span class="k">CUSTOM DESIGNS</span><span>' + MF.state.customDesigns.length + "</span>" +
        '<span class="k">PLAYER SUBSYSTEMS</span><span>' + MF.state.subsystems.filter((s) => s.custom).length + "</span>" +
        '<span class="k">BUILD</span><span>' + esc(DATA.meta.build) + " · " + esc(DATA.meta.generator) + "</span></div>" +
        '<div class="mf-hr"></div><div class="mf-row">' +
        MF.ui.btn("EXPORT ALL STATE JSON", "st-export") +
        MF.ui.btn("IMPORT ALL STATE", "st-import") +
        MF.ui.btn("RESET ALL DATA", "st-reset-all", "danger") + "</div>", "cyan") +
      MF.ui.panel("CONTROLS / KEY BINDINGS",
        '<table class="mf-table"><tbody>' + Object.keys(DATA.simulation.keyBindings).map((k) =>
          "<tr><td>" + esc(k) + '</td><td><span class="mf-key">' +
          esc(DATA.simulation.keyBindings[k]) + "</span></td></tr>").join("") + "</tbody></table>" +
        '<div class="mf-note">Base-mod CET hooks (NumPad 9 call, NumPad 0 cycle orders, F embark) belong to the ' +
        "optional companion layer and are never required. See docs/BaseModHooks.md.</div>") +
      '<div class="mf-warnbox"><b>WHAT THIS IS / IS NOT.</b> Playable browser prototype + CET-only ImGui test mod. ' +
      "No redscript, TweakXL or ArchiveXL files are installed: templates live in docs/integration/*.example only. " +
      "A compile error in r6/scripts would break the user's game. This project targets the real BT-7274 mod " +
      "(Nexus 35041) as an optional companion layer and never bundles or edits its files. Permission rules: " +
      "get permission before using or modifying base-mod assets; no re-uploads; no Donation Points on derivative asset use.</div>" +
      "</div></div>";
    sec.onclick = function (e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.dataset.act;
      if (a === "st-test") MF.state.testMode = !MF.state.testMode;
      else if (a === "st-unlock") MF.state.unlockAll = !MF.state.unlockAll;
      else if (a === "st-invalid") MF.state.allowInvalidDeploy = !MF.state.allowInvalidDeploy;
      else if (a === "st-reset-co") {
        Object.keys(DATA.simulation.coefficients).forEach((k) => { MF.state.coefficients[k] = DATA.simulation.coefficients[k].value; });
      } else if (a === "st-reset-rco") {
        Object.keys(RCO_RANGE).forEach((k) => { MF.state.reactorCoeffs[k] = DATA.reactors.model[k]; });
      } else if (a === "st-export") MF.exportJSON("mechfall-forge-state.json", MF.state);
      else if (a === "st-import") importModal();
      else if (a === "st-reset-all") {
        MF.resetState(); MF.setTab("settings"); MF.toast("All session data reset", "ok"); return;
      }
      MF.save(); render(sec);
    };
    sec.onchange = function (e) {
      if (e.target.id === "st-biome") { MF.state.biome = e.target.value; MF.save(); MF.refreshLive(); }
      else if (e.target.id === "st-difficulty") {
        MF.state.difficulty = Number(e.target.value);
        MF.state.coefficients.enemySensorFactor = MF.state.difficulty;
        MF.save(); MF.refreshLive();
      }
    };
  }
  function importModal() {
    MF.modal("IMPORT ALL STATE JSON",
      '<div class="mf-note">Replaces custom designs, subsystems and coefficients. Exported state only.</div>' +
      '<textarea class="mf-input" id="st-import-text" style="min-height:200px"></textarea>' +
      '<div class="mf-row mf-end"><button class="mf-btn primary" id="st-import-go">IMPORT</button></div>');
    $("st-import-go").onclick = function () {
      const o = MF.importJSON($("st-import-text").value, (x) => x && x.version === 1 && Array.isArray(x.subsystems));
      if (!o) return;
      MF.store.set("state", o); MF.closeModal();
      MF.state = loadStateCompat(o);
      MF.save(); MF.refresh(); MF.toast("State imported", "ok");
    };
  }
  function loadStateCompat(o) { MF.store.set("state", o); return Object.assign(defaults(), o); }
  function update() { MF.renderStatus(); }
  return { render, update };
})();
