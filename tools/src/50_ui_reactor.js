/* REACTOR LAB — mana equations, biome, presets, live 30 s chart, size/power/stability curve. */

MF.reactorLab = {
  hist: { power: [], inst: [], temp: [], heat: [] },
  pool: 0, temp: 0.34, running: false, ticks: 0, surges: 0, vents: 0,
  reset() {
    this.hist = { power: [], inst: [], temp: [], heat: [] };
    this.pool = 0; this.temp = 0.34; this.ticks = 0; this.surges = 0; this.vents = 0;
  },
  preview() {
    const out = { power: [], inst: [], temp: [], heat: [] };
    let pool = 0, temp = 0.34;
    for (let i = 0; i < 30; i++) {
      const r = MF.sim.reactor(MF.state.reactor, { dt: 0.1, growthPool: pool });
      pool = r.nextPool;
      temp = clamp(temp + r.heat * 0.008 - 0.006, 0.1, 1.5);
      if (temp > 1.1) { temp = 0.62; }
      out.power.push(r.netOutput); out.inst.push(r.instability);
      out.temp.push(temp); out.heat.push(r.heat);
    }
    return out;
  },
  tick() {
    if (!this.running) return;
    for (let k = 0; k < 10; k++) {
      const r = MF.sim.reactor(MF.state.reactor, { dt: 0.1, growthPool: this.pool });
      this.pool = r.nextPool;
      this.temp = clamp(this.temp + r.heat * 0.008 - 0.006, 0.1, 1.6);
      if (r.instability > 0.8 && Math.random() < 0.10) {
        this.surges++; this.temp += 0.06;
      }
      if (this.temp > 1.12 || r.meltdown) { this.temp = 0.6; this.vents++; }
      this.hist.power.push(r.netOutput); this.hist.inst.push(r.instability);
      this.hist.temp.push(this.temp); this.hist.heat.push(r.heat);
    }
    this.ticks++;
    if (this.ticks >= 30) {
      this.running = false;
      MF.toast("30 s reactor simulation complete · " + this.surges + " surges / " + this.vents + " forced vents", "ok");
      MF.log("Reactor 30 s sim: " + this.surges + " surges, " + this.vents + " forced vents.");
    }
    if (MF.state.tab === "reactor") MF.refreshLive();
  },
  data() {
    const h = this.hist.power.length > 1 ? this.hist : this.preview();
    return [
      { name: "netOutput kW", color: "#4dd0e1", data: h.power },
      { name: "instability ×20", color: "#ff5f56", data: h.inst.map((v) => v * 20) },
      { name: "temperature ×20", color: "#ffb347", data: h.temp.map((v) => v * 20) },
      { name: "heat kW", color: "#8bd450", data: h.heat }
    ];
  }
};

MF.tabs.reactor = (function () {
  const P = DATA.reactors.parameters;
  function sliderHTML() {
    return '<div class="mf-slider-grid">' + P.map((p) =>
      MF.ui.paramSlider("mana_reactor", p, MF.state.reactor[p.key], "reactor")).join("") + "</div>";
  }
  function statsHTML(r) {
    const bad = r.instability > 0.95;
    return '<div class="mf-stats">' +
      MF.ui.stat("NET OUTPUT", fmt(r.netOutput, 1), "kW", "green") +
      MF.ui.stat("GROSS OUTPUT", fmt(r.grossOutput, 1), "kW", "cyan") +
      MF.ui.stat("INSTABILITY", fmt(r.instability, 2), "", bad ? "red" : "") +
      MF.ui.stat("HEAT LOAD", fmt(r.heatLoad, 1), "kW", r.heatLoad > 12 ? "red" : "") +
      MF.ui.stat("REACTOR HEAT", fmt(r.heat, 1), "kW") +
      MF.ui.stat("CRYSTAL RCS", fmt(r.crystalSignature, 1), "m²", "violet") +
      MF.ui.stat("RAW HARVEST", fmt(r.rawHarvest, 2), "mana/s") +
      MF.ui.stat("THROUGHPUT", fmt(r.throughput, 2), "mana/s") +
      "</div>" +
      MF.ui.barRow("INSTABILITY", r.instability, 1.5, fmt(r.instability, 2) + " / 1.5", r.instability > 0.95 ? "red" : "amber") +
      MF.ui.barRow("MANA STARVATION", r.manaStarvation, 1, fmt(r.manaStarvation * 100, 0) + "%", "violet") +
      MF.ui.barRow("LATTICE FLUX", r.latticeOverflow, 1.5, fmt(r.latticeOverflow, 2), "amber");
  }
  function eqHTML(r) {
    let h = '<h3>EQUATIONS (LIVE SUBSTITUTION)</h3>';
    DATA.reactors.model.equations.forEach((e) => { h += '<div class="mf-eq">' + esc(e) + "</div>"; });
    h += '<div class="mf-eq"><b>rawHarvest</b> = ' + fmt(Number(MF.state.reactor.A), 2) + " × " +
      fmt(MF.biomeMultiplier(), 2) + " × " + fmt(Number(MF.state.reactor.L), 2) + " = <b>" + fmt(r.rawHarvest, 2) + "</b> mana/s</div>";
    h += '<div class="mf-eq"><b>grossOutput</b> = ' + fmt(r.throughput, 2) + " × " + fmt(Number(MF.state.reactor.eta), 2) +
      " × " + fmt(Number(MF.state.reactor.S), 2) + "^" + fmt(MF.rcoeff("sizeExponent"), 2) + " × (1+" +
      fmt(MF.rcoeff("gradeBonus"), 2) + "×(Q-1)) × " + fmt(MF.rcoeff("outputScale"), 1) +
      " = <b>" + fmt(r.grossOutput, 2) + "</b> kW</div>";
    h += '<div class="mf-eq"><b>instability</b> = (S/S_ref)^' + fmt(MF.rcoeff("instabilitySizeExponent"), 2) +
      " × (F/F_ref)^" + fmt(MF.rcoeff("instabilityFlowExponent"), 2) + " × (1-η) × (1-C) × (1+heatLoad) = <b>" +
      fmt(r.instability, 3) + "</b></div>";
    h += '<div class="mf-note">Exponents are config, not hard-coded: tune them in SETTINGS → REACTOR MODEL EXPONENTS. ' +
      "Nominal rule: doubling S ≈ " + fmt(Math.pow(2, MF.rcoeff("sizeExponent")), 2) +
      "× GROSS power but ≈ " + fmt(Math.pow(2, MF.rcoeff("instabilitySizeExponent")), 2) +
      "× instability; netOutput after the derate is lower. outputScale (" +
      fmt(MF.rcoeff("outputScale"), 0) + ") converts mana throughput to kW.</div>";
    return h;
  }
  function warnHTML(r) {
    const w = [];
    if (r.manaStarvation > 0.22) w.push(["critical", "MANA STARVATION — growth pool + atmospheric harvest cannot sustain F. Lower flow or move biome."]);
    if (r.instability > 0.95) w.push(["critical", "CONTAINMENT FAILURE — surges, misfires, shield flicker, forced vent, meltdown / Protocol 3 eject."]);
    else if (r.instability > 0.55) w.push(["warn", "CRYSTAL RESONANCE — larger crystal adds power, heat and a resonance RCS signature."]);
    if (r.latticeOverflow > 0.72) w.push(["critical", "LATTICE OVERFLOW — containment lattice is driven beyond design flux."]);
    if (r.heatLoad > 18) w.push(["warn", "THERMAL SATURATION — raise coolant flow W or add radiator area in INTERNAL SYSTEMS."]);
    if (MF.biomeMultiplier() < 0.3) w.push(["warn", "LOW AMBIENT MANA — indoors / orbit crushes raw atmospheric input A."]);
    if (!w.length) w.push(["ok", "Reactor stable. Push crystal size S to see the power/stability trade-off."]);
    return w.map((x) => '<div class="mf-' + (x[0] === "critical" ? "critbox" : x[0] === "warn" ? "warnbox" : "okbox") + '">' +
      esc(x[1]) + "</div>").join("") +
      '<div class="mf-note">30 s sim: ' + MF.reactorLab.ticks + " s · " + MF.reactorLab.surges + " surges · " +
      MF.reactorLab.vents + " forced vents · " + (MF.reactorLab.running ? "RUNNING" : "IDLE") + "</div>";
  }
  function render(sec) {
    const presets = DATA.reactors.presets;
    const biomes = Object.keys(DATA.reactors.biomes);
    sec.innerHTML = '<div class="mf-grid2" style="grid-template-columns:minmax(340px,1fr) minmax(420px,1.25fr)">' +
      '<div>' + MF.ui.panel("MANA REACTOR · POWER SOURCE",
        '<label class="mf-field">TEARDOWN TELEMETRY PRESET</label>' +
        MF.ui.select("rx-preset", presets, MF.state.reactorPresetId, (p) => p.name, (p) => p.id) +
        '<div id="rx-preset-note" class="mf-note"></div>' +
        '<label class="mf-field">BIOME (AMBIENT MANA MULTIPLIER)</label>' +
        MF.ui.select("rx-biome", biomes, MF.state.biome, (b) => DATA.reactors.biomes[b].label + " ×" +
          DATA.reactors.biomes[b].multiplier, (b) => b) +
        '<div class="mf-hr"></div><h3>PARAMETERS</h3>' + sliderHTML() +
        '<div class="mf-hr"></div><label class="mf-field">SUBSYSTEM NAME (FOR SAVE)</label>' +
        '<input class="mf-input" id="rx-name" value="MY MANA REACTOR">' +
        '<div class="mf-hr"></div><div class="mf-row">' +
        MF.ui.btn("RUN 30 s SIM", "rx-run", "primary") +
        MF.ui.btn("STOP", "rx-stop") +
        MF.ui.btn("RESET", "rx-reset") +
        MF.ui.btn("SAVE AS SUBSYSTEM", "rx-save") +
        MF.ui.btn("SEND TO FORGE", "rx-send") +
        MF.ui.btn("EXPORT PARAMS", "rx-export") + "</div>" +
        '<div class="mf-note">The reactor is one subsystem among many: its heat, mass, parasitic draw, crystal RCS and ' +
        "ECM damping feed the same six-attribute budget as every player-authored component.</div>", "amber") + "</div>" +
      '<div>' +
      MF.ui.panel("REACTOR TELEMETRY", '<div id="rx-stats"></div><div id="rx-warn"></div>', "cyan") +
      MF.ui.panel("LIVE 30 s CHART", '<canvas id="rx-chart" class="mf-canvas med" width="620" height="230"></canvas>', "violet") +
      MF.ui.panel("CRYSTAL SIZE vs POWER vs STABILITY", '<canvas id="rx-curve" class="mf-canvas med" width="620" height="230"></canvas>' +
        '<div class="mf-note">Doubling crystal size S raises power ≈ ' + fmt(Math.pow(2, MF.rcoeff("sizeExponent")), 2) +
        "× and instability ≈ " + fmt(Math.pow(2, MF.rcoeff("instabilitySizeExponent")), 2) + "×. " +
        "Instability ×20 and temperature ×20 are plotted on the same scale as kW.</div>") +
      MF.ui.panel("MODEL", '<div id="rx-eq"></div>') +
      "</div></div>";
    sec.onclick = function (e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.dataset.act;
      if (a === "rx-run") { MF.reactorLab.reset(); MF.reactorLab.running = true; MF.toast("Running 30 s reactor simulation", "ok"); }
      else if (a === "rx-stop") MF.reactorLab.running = false;
      else if (a === "rx-reset") {
        MF.state.reactor = clone(MF.presetById("vanguard_link_shard").params);
        MF.state.reactorPresetId = "vanguard_link_shard"; MF.syncReactorSubsystem();
        MF.reactorLab.reset(); MF.save(); render(sec); return;
      } else if (a === "rx-save") {
        const name = ($("rx-name") || {}).value || "MY MANA REACTOR";
        const s = MF.newSubsystem("mana_reactor");
        s.name = name.slice(0, 60); s.params = clone(MF.state.reactor);
        s.note = "Authored in REACTOR LAB · biome " + MF.state.biome;
        MF.save(); MF.toast("Saved reactor as reusable subsystem: " + s.name, "ok");
      } else if (a === "rx-send") {
        MF.syncReactorSubsystem();
        const d = MF.state.customDesigns.find((x) => x.id === MF.state.activeId);
        if (d) { d.reactor = clone(MF.state.reactor); d.reactorId = MF.state.reactorPresetId; }
        MF.save(); MF.toast("Reactor sent to MECH FORGE / active design", "ok");
      } else if (a === "rx-export") MF.exportJSON("mechfall-reactor.json", MF.state.reactor);
      MF.save(); update(sec);
    };
    sec.onchange = function (e) {
      if (e.target.id === "rx-preset") {
        const p = MF.presetById(e.target.value);
        MF.state.reactor = clone(p.params); MF.state.reactorPresetId = p.id;
        MF.syncReactorSubsystem(); MF.reactorLab.reset(); MF.save(); render(sec);
      } else if (e.target.id === "rx-biome") {
        MF.state.biome = e.target.value; MF.save(); update(sec);
      }
    };
    update(sec);
  }
  function update(sec) {
    const r = MF.sim.reactor(MF.state.reactor, { growthPool: MF.reactorLab.pool });
    const st = $("rx-stats"); if (st) st.innerHTML = statsHTML(r);
    const wn = $("rx-warn"); if (wn) wn.innerHTML = warnHTML(r);
    const eq = $("rx-eq"); if (eq) eq.innerHTML = eqHTML(r);
    const pn = $("rx-preset-note");
    if (pn) {
      const p = MF.presetById(MF.state.reactorPresetId);
      pn.textContent = p ? p.origin + " — " + p.note : "CUSTOM / hand-tuned parameters.";
    }
    const chart = $("rx-chart");
    if (chart) MF.draw.chart(chart, MF.reactorLab.data(), { title: "30 s · netOutput / instability / temperature / heat", xLabel: "t = 0…30 s" });
    const curve = $("rx-curve");
    if (curve) {
      const c = MF.sim.sizeCurve(MF.state.reactor);
      MF.draw.chart(curve, [
        { name: "power kW", color: "#4dd0e1", data: c.map((x) => x.power) },
        { name: "instability ×20", color: "#ff5f56", data: c.map((x) => x.instability * 20) },
        { name: "heat kW", color: "#ffb347", data: c.map((x) => x.heat) }
      ], { title: "S = 0.25 → 3.2 (x axis) · power ↑ / instability ↑↑", xLabel: "crystal size S" });
    }
  }
  return { render, update };
})();
