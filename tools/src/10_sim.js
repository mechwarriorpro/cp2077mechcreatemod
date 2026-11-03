/* MECHFALL // FORGE 77 — simulation: the six first-class attributes, mana reactor, validation. */

MF.sim = {};

/* Reactor-model exponents are config, not hard-coded: editable in SETTINGS. */
if (!MF.state.reactorCoeffs) {
  MF.state.reactorCoeffs = {};
  Object.keys(DATA.reactors.model).forEach((k) => {
    if (typeof DATA.reactors.model[k] === "number") MF.state.reactorCoeffs[k] = DATA.reactors.model[k];
  });
}
MF.rcoeff = function (k) {
  return Number(MF.state.reactorCoeffs[k] ?? DATA.reactors.model[k]);
};
MF.biomeMultiplier = function (key) {
  const b = DATA.reactors.biomes[key || MF.state.biome];
  return b ? b.multiplier : 1.0;
};

/* ------------------------------------------------------------------ mana reactor */
MF.sim.reactor = function (params, ctx) {
  const c = ctx || {};
  const p = Object.assign({}, params);
  const m = {
    sizeExponent: MF.rcoeff("sizeExponent"), gradeBonus: MF.rcoeff("gradeBonus"),
    S_ref: MF.rcoeff("S_ref"), F_ref: MF.rcoeff("F_ref"),
    iSize: MF.rcoeff("instabilitySizeExponent"), iFlow: MF.rcoeff("instabilityFlowExponent"),
    derate: MF.rcoeff("derateFactor"), heatLoadFactor: MF.rcoeff("heatLoadFactor"),
    signatureFactor: MF.rcoeff("signatureFactor"), resonanceFactor: MF.rcoeff("resonanceFactor")
  };
  const F = clamp(Number(p.F), 0, 40), G = clamp(Number(p.G), 0, 40), A = clamp(Number(p.A), 0, 40);
  const eta = clamp(Number(p.eta), 0.01, 0.99), S = clamp(Number(p.S), 0.05, 8);
  const Q = clamp(Number(p.Q), 1, 8), C = clamp(Number(p.C), 0, 0.99);
  const W = Math.max(0.05, Number(p.W)), L = clamp(Number(p.L), 0, 1);
  const biome = c.biomeMultiplier === undefined ? MF.biomeMultiplier() : c.biomeMultiplier;
  const rawHarvest = A * biome * L;
  const dt = c.dt === undefined ? 1 : c.dt;
  const pool = c.growthPool === undefined
    ? Math.max(0, (G - F) * 5 + rawHarvest)
    : Math.max(0, c.growthPool);
  const throughput = clamp(Math.min(F, pool + rawHarvest), 0, F);
  const grossMana = throughput * eta * Math.pow(S, m.sizeExponent) * (1 + m.gradeBonus * (Q - 1));
  const grossOutput = grossMana * MF.rcoeff("outputScale");   // mana/s -> kW
  // Flow/regulator load is size-independent: larger crystals raise power and resonance,
  // not the coolant-loop duty. Keeps the "doubling S ~3x instability" rule exact.
  const heatLoad = (throughput / W) * eta * (1 - eta) * m.heatLoadFactor *
    (1 + m.gradeBonus * (Q - 1));
  const instability = Math.pow(S / m.S_ref, m.iSize) * Math.pow(F / m.F_ref, m.iFlow) *
    (1 - eta) * (1 - C) * (1 + heatLoad);
  const netOutput = grossOutput * (1 - Math.min(instability, 1) * m.derate);
  const resonance = m.resonanceFactor * Math.pow(S, m.iSize * 0.6) * (F / m.F_ref);
  const crystalSignature = m.signatureFactor * Math.pow(S, m.iSize * 0.75) * (1 - eta * 0.45) + resonance * 0.35;
  const heat = grossOutput * (1 - eta) * 0.12 + heatLoad * 8 + instability * 5.0;
  const parasiticDraw = 3.5 + grossOutput * 0.045 + W * 1.6 + C * 2;
  const manaStarvation = clamp(1 - (pool + rawHarvest) / Math.max(F, 0.01), 0, 1);
  return {
    params: p, biomeMultiplier: biome, rawHarvest, growthPool: pool, throughput, grossMana, grossOutput,
    heatLoad, instability, netOutput, resonance, crystalSignature, heat, parasiticDraw,
    meltdown: instability > 1.0, containmentFailure: instability > 0.95,
    latticeOverflow: clamp((throughput * Math.pow(S, m.sizeExponent)) / (12 * (0.2 + C)), 0, 2),
    manaStarvation, heatLoadSafe: heatLoad,
    mass: 120 + S * 95 + C * 60 + Q * 8,
    nextPool: Math.max(0, pool + (G - F) * dt - throughput * dt + rawHarvest * dt)
  };
};
MF.sim.sizeCurve = function (params) {
  const out = [];
  for (let S = 0.25; S <= 3.2001; S += 0.075) {
    const p = Object.assign({}, params, { S: S });
    const r = MF.sim.reactor(p);
    out.push({ S: S, power: r.netOutput, instability: r.instability, heat: r.heat });
  }
  return out;
};

/* ------------------------------------------------------------------ subsystem derivation */
MF.sim.shapeVolume = function (s) {
  const styleFactor = { angular: 1, rounded: 0.94, knight: 1.18, spider: 1.28, tetrapod: 1.34 }[s.style] || 1;
  return (s.torsoW * s.torsoH * s.torsoD * 0.32 + s.shoulderW * s.shoulderH * 0.7 +
    (s.upperArm + s.foreArm) * 0.28 + (s.upperLeg + s.lowerLeg) * 0.34 +
    s.hipW * 0.4 + s.footL * 0.25 + s.armorFlare * 0.5) * styleFactor;
};

MF.sim.derive = function (s, ctx) {
  const c = ctx || {};
  const p = s.params || {};
  const shape = c.shape || MF.state.shape;
  const six = { powerDraw: 0, mass: 0, heatGen: 0, heatDiss: 0, rcs: 0, ecm: 0 };
  const derived = {};
  const N = (k, d) => Number(p[k] === undefined ? d : p[k]);
  switch (s.category) {
    case "freeform": {
      MF.sixKeys.forEach((k) => { six[k] = N(k, 0); });
      derived.note = "Directly authored values — no derivation.";
      break;
    }
    case "mana_reactor": {
      const r = MF.sim.reactor(p, c);
      six.powerDraw = r.parasiticDraw;
      six.mass = r.mass;
      six.heatGen = r.heat;
      six.heatDiss = 2 + N("W", 1.2) * 6;
      six.rcs = r.crystalSignature;
      six.ecm = 0.4 + (1 - N("C", 0.74)) * 2;
      Object.assign(derived, r);
      break;
    }
    case "power_bus": {
      const cap = N("busCapacity", 180), gauge = N("conduitGauge", 8), volts = N("voltage", 120);
      const red = N("routingRedundancy", 1), fuse = N("fuseLimit", 170), bank = N("capacitorBank", 24);
      const ground = N("grounding", 0.7);
      const loss = clamp(0.15 - gauge * 0.004 - volts / 6000 + (1 - ground) * 0.06, 0.012, 0.34);
      six.powerDraw = 2 + cap * 0.012 + red * 1.4 + bank * 0.03;
      six.mass = 24 + cap * 0.22 + gauge * 2.2 + bank * 0.8 + red * 6;
      six.heatGen = cap * loss * 0.06 + red * 0.4;
      six.heatDiss = 1.5 + gauge * 0.2;
      six.rcs = 0.4 + cap * 0.002;
      six.ecm = ground * 1.5;
      derived.transmissionLoss = loss;
      derived.brownoutThreshold = fuse;
      derived.surgeTolerance = bank * 1.2 + red * 4;
      derived.grounding = ground;
      break;
    }
    case "thermal_loop": {
      const ct = [0.75, 1.0, 1.32, 1.55][clamp(Math.round(N("coolantType", 1)), 0, 3)];
      const pump = N("pumpRate", 48), area = N("radiatorArea", 38), pipes = N("heatPipeCount", 14);
      const phase = N("phaseChangeMass", 18), ins = N("insulation", 0.3), vent = N("ventThreshold", 0.9);
      const flow = pump / 50;
      six.powerDraw = 1 + pump * 0.08 + pipes * 0.05;
      six.mass = 18 + area * 1.6 + pipes * 0.7 + phase * 0.9;
      six.heatGen = pump * 0.05;
      six.heatDiss = (area * 0.58 + pipes * 0.4) * ct * (0.4 + flow) * (1 - ins * 0.35);
      six.rcs = area * 0.062 + (1 - ins) * 0.3;
      six.ecm = 0;
      derived.heatDiss = six.heatDiss;
      derived.thermalMass = 60 + phase * 4 + ins * 30;
      derived.hotspots = clamp(1 - pipes / 30, 0, 1);
      derived.ventThreshold = vent;
      derived.coolantEfficiency = ct;
      break;
    }
    case "mass_structure": {
      const mat = [1.0, 1.28, 0.78, 1.62, 0.7][clamp(Math.round(N("frameMaterial", 1)), 0, 4)];
      const arm = N("armourDensity", 1.1), cw = N("counterweights", 12), hp = N("hardpoints", 4);
      const off = N("comOffset", 0), brace = N("bracing", 0.55);
      const frameMass = MF.sim.shapeVolume(shape) * MF.coeff("shapeMassFactor") * mat * (0.6 + arm * 0.4);
      six.powerDraw = 0;
      six.mass = frameMass * 0.22 + arm * 150 + cw + hp * 12 + brace * 40;
      six.heatGen = arm * 1.2;
      six.heatDiss = -arm * 5.5;
      six.rcs = arm * 1.4 + hp * 0.35 + (1 - brace) * 0.3;
      six.ecm = 0;
      derived.frameMass = frameMass;
      derived.comOffset = clamp(off - cw / 260 + (shape.weaponX - shape.weaponY) * 0.02, -1.2, 1.2);
      derived.structuralStress = clamp((arm * 0.48 + hp / 22 + Math.abs(derived.comOffset) * 0.55) / (0.32 + brace * 1.25), 0, 1.6);
      derived.hardpoints = hp;
      derived.bracing = brace;
      derived.armourDensity = arm;
      break;
    }
    case "signature_rcs": {
      const facet = N("facetAngle", 24), ram = N("ramCoating", 0.4), edge = N("edgeAlignment", 0.5);
      const cav = N("cavityShielding", 0.35), emit = N("emitterPlacement", 0.5), gaps = N("panelGaps", 0.2);
      const mult = clamp(1.35 - facet / 60 * 0.5 - ram * 0.55 - edge * 0.2 - cav * 0.2 - emit * 0.15 + gaps * 0.3, 0.12, 1.6);
      six.powerDraw = 0.5 + ram * 2;
      six.mass = 18 + ram * 140 + cav * 35 + edge * 12;
      six.heatGen = ram * 2.0;
      six.heatDiss = -ram * 7.0;
      six.rcs = -(1 - mult) * 11;
      six.ecm = cav * 1.0;
      derived.rcsMultiplier = mult;
      derived.facetAngle = facet;
      derived.ramCoating = ram;
      derived.edgeAlignment = edge;
      derived.panelGaps = gaps;
      derived.emitterPlacement = emit;
      break;
    }
    case "ecm_ew": {
      const jam = N("jammerPower", 28), gain = N("antennaGain", 5), band = N("bandCoverage", 0.6);
      const decoys = N("decoyCount", 4), lpi = N("lpiMode", 0), eccm = N("eccmResistance", 0.4);
      const chaff = N("chaff", 2), spoof = N("spoofing", 0.3), emcon = N("emcon", 0);
      const jamBase = jam * (0.4 + gain / 8) * (0.4 + band) * (lpi ? 0.55 : 1) * (emcon ? 0.08 : 1);
      const emissions = jam * (lpi ? 0.25 : 1) * (emcon ? 0.05 : 1) + spoof * 8 + chaff * 0.2;
      six.powerDraw = 3 + jam * 0.85 + band * 8 + spoof * 6 - (emcon ? 2 : 0);
      six.mass = 16 + jam * 0.35 + decoys * 3 + chaff * 1.2 + gain * 2;
      six.heatGen = jam * 0.28 + spoof * 3;
      six.heatDiss = 0;
      six.rcs = 0.6 + gain * 0.12;   // antenna hardware only; emissions added once in compute()
      six.ecm = jamBase * 0.35 + decoys * 0.5 + eccm * 8 + chaff * 0.3;
      derived.jamBase = jamBase;
      derived.selfEmissions = emissions;
      derived.decoys = decoys + chaff;
      derived.eccmResistance = eccm;
      derived.bandCoverage = band;
      derived.lpiMode = lpi;
      derived.emcon = emcon;
      derived.quickhackResist = clamp(eccm * 0.65 + (lpi ? 0.1 : 0), 0, 1);
      break;
    }
    case "sensors_os": {
      const ap = N("radarAperture", 2.4), opt = N("opticalGrade", 2), passive = N("passiveMode", 0);
      const solver = N("targetingSolver", 2), ai = N("aiAssist", 0.4);
      six.powerDraw = 2 + ap * 2.2 * (passive ? 0 : 1) + solver * 2 + ai * 4;
      six.mass = 12 + ap * 6 + opt * 3 + solver * 1.5;
      six.heatGen = ap * 0.8 * (passive ? 0 : 1) + solver * 0.7;
      six.heatDiss = 0;
      six.rcs = passive ? 0 : ap * 0.6;
      six.ecm = solver * 1.6 + (passive ? 2 : 0);
      derived.detectionRange = 80 + opt * 55 + ap * 28 + (passive ? 40 : 0);
      derived.lockSpeed = 0.5 + solver * 0.22 + ai * 0.4;
      derived.cooldownMultiplier = clamp(1.25 - ai * 0.45 - solver * 0.05, 0.5, 1.4);
      derived.eccmQuality = 0.2 + solver * 0.18 + (passive ? 0.15 : 0);
      derived.passiveMode = passive;
      break;
    }
    case "actuators": {
      const servos = N("servoCount", 10), myo = N("myomerLayers", 5), gear = N("gearRatio", 1);
      const damp = N("damperStiffness", 0.5), joint = N("jointRange", 0.9);
      six.powerDraw = 3 + servos * 0.9 + myo * 0.6;
      six.mass = 24 + servos * 3.5 + myo * 4 + damp * 20;
      six.heatGen = servos * 0.35 + myo * 0.2;
      six.heatDiss = 1 + damp * 2;
      six.rcs = joint * 0.6;
      six.ecm = 0;
      derived.speed = clamp(0.55 + servos / 28 + myo / 22 - gear * 0.18, 0.2, 2.4);
      derived.dodge = clamp(0.3 + servos / 30 - damp * 0.25 + joint * 0.2, 0.05, 1.6);
      derived.heatPerMove = servos * 0.22 + myo * 0.12;
      derived.movingRcs = joint * 0.35;
      derived.gearRatio = gear;
      break;
    }
    default: {
      MF.sixKeys.forEach((k) => { six[k] = N(k, 0); });
    }
  }
  MF.sixKeys.forEach((k) => { if (!Number.isFinite(six[k])) six[k] = 0; });
  return { id: s.id, name: s.name, category: s.category, custom: !!s.custom, params: p, six, derived };
};

/* ------------------------------------------------------------------ full design telemetry */
MF.sim.compute = function (design, ctx) {
  const c = ctx || {};
  const d = design || MF.activeDesign();
  const shape = d.shape || MF.state.shape;
  const active = d.id === MF.state.activeId;
  const ids = active ? MF.state.installed : (d.subsystemIds || []);
  const reactorParams = active ? MF.state.reactor : (d.reactor || MF.state.reactor);
  const reactorModel = MF.sim.reactor(reactorParams, c);
  const subCtx = Object.assign({}, c, { shape });
  const parts = [];
  ids.forEach((id) => {
    const s = MF.subsystemById(id);
    if (!s) return;
    if (s.category === "mana_reactor") {
      const r = Object.assign({}, s, { params: reactorParams });
      parts.push(MF.sim.derive(r, subCtx));
    } else parts.push(MF.sim.derive(s, subCtx));
  });
  if (!parts.some((p) => p.category === "mana_reactor")) {
    parts.push(MF.sim.derive({ id: "reactor", name: "Mana reactor", category: "mana_reactor", params: reactorParams }, subCtx));
  }
  const find = (cat) => parts.find((p) => p.category === cat) || { six: {}, derived: {} };
  const bus = find("power_bus"), thermal = find("thermal_loop"), structure = find("mass_structure");
  const sig = find("signature_rcs"), ew = find("ecm_ew"), sensors = find("sensors_os"), act = find("actuators");

  /* POWER */
  let powerUsed = 0;
  parts.forEach((p) => { powerUsed += p.six.powerDraw; });
  const transmissionLoss = bus.derived.transmissionLoss ?? 0.08;
  const powerUsedEff = powerUsed * (1 + transmissionLoss);
  const powerMargin = reactorModel.netOutput - powerUsedEff;
  const brownoutThreshold = bus.derived.brownoutThreshold ?? 0;
  const surgeTolerance = bus.derived.surgeTolerance ?? 0;

  /* MASS / CoM / inertia */
  const frameMass = structure.derived.frameMass ??
    MF.sim.shapeVolume(shape) * MF.coeff("shapeMassFactor");
  let partMass = 0;
  parts.forEach((p) => { if (p.category !== "mass_structure") partMass += p.six.mass; });
  const payload = (d.hardpoints || structure.derived.hardpoints || 4) * 18;
  const totalMass = frameMass + structure.six.mass + partMass + payload;
  const structuralStress = structure.derived.structuralStress ?? 0.3;
  const comOffset = (structure.derived.comOffset ?? 0) + (shape.weaponX - shape.torsoW) * 0.015;
  const inertia = totalMass * (1 + Math.abs(comOffset) * 0.7);
  const speed = Math.max(0.8, MF.coeff("baseSpeed") *
    (1 - MF.coeff("k1") * totalMass / MF.coeff("massRef")) *
    (1 - MF.coeff("k2") * structuralStress) * (act.derived.speed ?? 1));
  const dashCost = 8 + totalMass / 260 + (1 - (act.derived.dodge ?? 0.5)) * 6;

  /* HEAT */
  const movementHeat = c.moving ? (act.derived.heatPerMove ?? 4) : 0;
  const ecmHeat = (ew.six.heatGen || 0) * 0.35;
  let heatGen = reactorModel.heat + movementHeat + ecmHeat;
  let heatDiss = 0;
  parts.forEach((p) => {
    // The reactor's own heat is already the first term; its dissipation is additive.
    if (p.category !== "mana_reactor") heatGen += p.six.heatGen;
    heatDiss += p.six.heatDiss;
  });
  heatDiss = Math.max(0, heatDiss);
  const netHeat = heatGen - heatDiss;
  const thermalMass = 140 + totalMass * MF.coeff("thermalMassFactor") / 12 + (thermal.derived.thermalMass ?? 0);
  const temperature = c.temperature !== undefined ? c.temperature :
    clamp(0.32 + netHeat / Math.max(heatDiss, 6) * 0.42, 0, 1.8);
  const overheatTime = netHeat > 0 ? thermalMass / netHeat : Infinity;
  const ventThreshold = thermal.derived.ventThreshold ?? 0.9;

  /* SIGNATURE / RCS by aspect angle */
  const shapeFactor = Math.pow(
    shape.torsoW * 0.8 + shape.legStance * 0.7 + shape.shoulderW * 0.5 + shape.armorFlare * 0.4 + 1,
    MF.coeff("rcsShapeExponent")) * 0.35 + 1.2;
  const materialFactor = Math.pow(sig.derived.rcsMultiplier ?? 1, MF.coeff("rcsMaterialExponent"));
  let additive = reactorModel.crystalSignature;
  parts.forEach((p) => {
    // Crystal signature is already the first term; the reactor part still displays it in tables.
    if (p.category !== "mana_reactor") additive += p.six.rcs;
  });
  const activeEmissions = (ew.derived.selfEmissions ?? 0) + (c.charging ? 8 : 0);
  additive += activeEmissions * MF.coeff("emissionRcsFactor");
  const rcsBase = clamp(shapeFactor * materialFactor + additive, 0.35, 500);
  const gaps = sig.derived.panelGaps ?? 0.2, edge = sig.derived.edgeAlignment ?? 0.5;
  const rcsPolar = [];
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI / 18;
    const aspect = 0.68 + 0.34 * Math.abs(Math.sin(a)) + 0.2 * Math.abs(Math.sin(2 * a)) +
      gaps * 0.5 * Math.pow(Math.abs(Math.sin(3 * a)), 6) + (1 - edge) * 0.12 * Math.abs(Math.cos(a));
    rcsPolar.push(clamp(rcsBase * aspect, 0.1, 600));
  }
  const rcsFront = rcsPolar[0], rcsSide = rcsPolar[9], rcsRear = rcsPolar[18];
  const detectRange = MF.coeff("detectionK") * Math.pow(rcsFront, MF.coeff("detectionExponent")) *
    MF.coeff("enemySensorFactor");
  const missileLockTime = MF.coeff("lockK") / Math.sqrt(Math.max(rcsFront, 0.5));

  /* ECM */
  const dist = Math.max(0.25, (c.distance || 1));
  const enemyEccm = c.enemyEccm === undefined ? 1 : c.enemyEccm;
  const jamStrength = clamp(MF.coeff("jamK") / 100 * (ew.derived.jamBase ?? 0) /
    (Math.pow(dist, MF.coeff("ecmFalloffExponent")) * (1 + enemyEccm * 0.5)), 0, 120);
  const enemyLockQuality = c.enemyLockQuality === undefined ? 8 : c.enemyLockQuality;
  const lockBreak = clamp((jamStrength - enemyLockQuality) / (enemyLockQuality + 12), 0, 1);
  const selfEmissions = ew.derived.selfEmissions ?? 0;
  const quickhackResist = clamp((ew.derived.quickhackResist ?? 0) + (bus.derived.grounding ?? 0) * 0.25, 0, 1);
  const ecmCoverage = (ew.derived.bandCoverage ?? 0.5) * 360;
  const decoys = ew.derived.decoys ?? 0;

  const t = {
    design: d, shape, parts, reactor: reactorModel,
    powerUsed, powerUsedEff, transmissionLoss, powerMargin, brownoutThreshold, surgeTolerance,
    frameMass, partMass, payload, totalMass, structuralStress, comOffset, inertia, speed, dashCost,
    heatGen, heatDiss, netHeat, thermalMass, temperature, overheatTime, ventThreshold,
    shapeFactor, materialFactor, crystalSignature: reactorModel.crystalSignature,
    activeEmissions, rcsBase, rcsPolar, rcsFront, rcsSide, rcsRear,
    detectRange, missileLockTime, jamStrength, lockBreak, selfEmissions, quickhackResist,
    ecmCoverage, decoys, movementHeat, ecmHeat,
    hotspots: thermal.derived.hotspots ?? 0,
    detectionBonus: sensors.derived.detectionRange ?? 0,
    cooldownMultiplier: sensors.derived.cooldownMultiplier ?? 1,
    validation: []
  };
  t.validation = MF.sim.validate(t);
  return t;
};

/* ------------------------------------------------------------------ validation */
MF.sim.validate = function (t) {
  const th = DATA.simulation.validationThresholds;
  const rules = [
    ["BROWNOUT", "critical", t.powerMargin < th.brownoutMargin, "powerMargin " + fmt(t.powerMargin, 1) + " kW"],
    ["THERMAL SATURATION", "critical", t.netHeat > 0 && t.temperature > th.thermalSaturation, "temp " + fmt(t.temperature, 2) + ", netHeat " + fmt(t.netHeat, 1) + " kW"],
    ["OVER MASS", "warning", t.totalMass / MF.coeff("massRef") > th.overMassRatio, fmt(t.totalMass, 0) + " kg / ref " + MF.coeff("massRef")],
    ["COM OFFSET", "warning", Math.abs(t.comOffset) > th.comOffsetLimit, "offset " + fmt(t.comOffset, 2)],
    ["STRUCTURAL STRESS", "warning", t.structuralStress > th.stressLimit, "stress " + fmt(t.structuralStress, 2)],
    ["RCS EXPOSURE", "warning", t.rcsFront > th.rcsExposure, "front RCS " + fmt(t.rcsFront, 1) + " m²"],
    ["ECM SELF-DETECTION", "warning", t.selfEmissions > th.selfDetection, "emissions " + fmt(t.selfEmissions, 1)],
    ["MANA STARVATION", "warning", t.reactor.manaStarvation > th.manaStarvation, "harvest " + fmt(t.reactor.rawHarvest, 1) + " mana/s"],
    ["LATTICE OVERFLOW", "critical", t.reactor.latticeOverflow > th.latticeOverflow, "flux " + fmt(t.reactor.latticeOverflow, 2)],
    ["CRYSTAL RESONANCE", "warning", t.reactor.resonance > th.resonance, "resonance " + fmt(t.reactor.resonance, 2)],
    ["CONTAINMENT FAILURE", "critical", t.reactor.instability > th.containmentFailure, "instability " + fmt(t.reactor.instability, 2)],
    ["HARDPOINT OVERFLOW", "warning", (t.parts.find((p) => p.category === "mass_structure") || { derived: {} }).derived.hardpoints > th.hardpointLimit, "hardpoints above brace limit"]
  ];
  const details = {};
  DATA.simulation.validationStates.forEach((v) => { details[v.code] = v; });
  return rules.filter((r) => r[2]).map((r) => ({
    code: r[0], severity: r[1], value: r[3],
    detail: (details[r[0]] || {}).detail || ""
  }));
};

/* ------------------------------------------------------------------ equations with live values */
MF.sim.equations = function (t) {
  const subs = {
    powerUsed: fmt(t.powerUsedEff, 1) + " kW",
    powerMargin: fmt(t.reactor.netOutput, 1) + " - " + fmt(t.powerUsedEff, 1) + " = " + fmt(t.powerMargin, 1) + " kW",
    totalMass: fmt(t.frameMass, 0) + " + " + fmt(t.partMass, 0) + " + " + fmt(t.payload, 0) + " = " + fmt(t.totalMass, 0) + " kg",
    speed: fmt(MF.coeff("baseSpeed"), 1) + " × (1 - " + fmt(MF.coeff("k1"), 2) + "×" + fmt(t.totalMass / MF.coeff("massRef"), 2) + ") × (1 - " + fmt(MF.coeff("k2"), 2) + "×" + fmt(t.structuralStress, 2) + ") = " + fmt(t.speed, 2) + " m/s",
    heatGen: fmt(t.reactor.heat, 1) + " + " + fmt(t.heatGen - t.reactor.heat, 1) + " = " + fmt(t.heatGen, 1) + " kW",
    heatDiss: fmt(t.heatDiss, 1) + " kW",
    netHeat: fmt(t.heatGen, 1) + " - " + fmt(t.heatDiss, 1) + " = " + fmt(t.netHeat, 1) + " kW",
    temperature: fmt(t.temperature, 2) + " (Δ " + fmt(t.netHeat, 1) + " × dt / " + fmt(t.thermalMass, 0) + ")",
    rcs: fmt(t.shapeFactor, 2) + " × " + fmt(t.materialFactor, 2) + " + " + fmt(t.crystalSignature, 2) + " + " + fmt(t.activeEmissions, 2) + " → " + fmt(t.rcsFront, 2) + " m² front",
    detectRange: fmt(MF.coeff("detectionK"), 0) + " × " + fmt(t.rcsFront, 2) + "^" + fmt(MF.coeff("detectionExponent"), 2) + " × " + fmt(MF.coeff("enemySensorFactor"), 2) + " = " + fmt(t.detectRange, 0) + " m",
    jamStrength: fmt(t.jamStrength, 2) + " str at " + fmt(MF.coeff("combatDistanceRef"), 0) + " m",
    lockBreak: fmt(t.lockBreak, 2) + " (jam " + fmt(t.jamStrength, 1) + " vs lock quality 8)",
    selfEmissions: fmt(t.selfEmissions, 1) + " (LPI ×0.25 / EMCON ×0.05)"
  };
  return DATA.simulation.equations.map((e) => ({ id: e.id, label: e.label, formula: e.formula, live: subs[e.id] || "" }));
};

/* ------------------------------------------------------------------ stress test */
MF.sim.stressTest = function (design) {
  const d = design || MF.activeDesign();
  const series = [];
  let temp = 0.34, pool = 0;
  for (let i = 0; i < 300; i++) {
    const moving = i % 40 < 26;
    const charging = i % 70 < 12;
    const t = MF.sim.compute(d, { dt: 0.1, temperature: temp, moving, charging, growthPool: pool });
    temp = clamp(temp + t.netHeat * 0.1 / t.thermalMass, 0, 2.2);
    pool = t.reactor.nextPool;
    if (temp > 1.15) temp = Math.max(0.55, temp - 0.22); // forced vent
    series.push({ t: i / 10, temp, powerMargin: t.powerMargin, netHeat: t.netHeat, rcs: t.rcsFront, instability: t.reactor.instability });
  }
  const peak = Math.max.apply(null, series.map((x) => x.temp));
  const brownouts = series.filter((x) => x.powerMargin < 0).length;
  const vents = series.filter((x, i) => i > 0 && x.temp < series[i - 1].temp - 0.1).length;
  return { series, peak, brownouts, vents, duration: 30 };
};

/* ------------------------------------------------------------------ CET Lua snippet */
MF.sim.luaForSubsystem = function (s) {
  const d = MF.sim.derive(s);
  const lines = [
    "-- MECHFALL // FORGE 77 — generated subsystem snippet",
    "-- Paste into MF.customDesigns[...].subsystems in the CET init.lua",
    "    {",
    "      id = " + JSON.stringify(s.id) + ", name = " + JSON.stringify(s.name) + ",",
    "      category = " + JSON.stringify(s.category) + ", custom = true,",
    "      six = {"
  ];
  MF.sixKeys.forEach((k) => { lines.push("        " + k + " = " + fmt(d.six[k], 3) + ","); });
  lines.push("      },", "      params = {");
  Object.keys(s.params || {}).forEach((k) => { lines.push("        " + k + " = " + fmt(Number(s.params[k]), 3) + ","); });
  lines.push("      }", "    }");
  return lines.join("\n");
};
MF.sim.luaForDesign = function (d) {
  const lines = [
    "-- MECHFALL // FORGE 77 — custom design for CET init.lua (MF.customDesigns)",
    "  {",
    "    id = " + JSON.stringify(d.id) + ", name = " + JSON.stringify(d.name) + ", origin = \"custom\",",
    "    shape = {"
  ];
  Object.keys(d.shape || {}).forEach((k) => {
    const v = d.shape[k];
    lines.push("      " + k + " = " + (typeof v === "number" ? fmt(v, 2) : JSON.stringify(v)) + ",");
  });
  lines.push("    },", "    reactor = " + JSON.stringify(d.reactorId || "vanguard_link_shard") + ",",
    "    subsystemIds = " + JSON.stringify(d.subsystemIds || []) + ",",
    "    hardpoints = " + (d.hardpoints || 6), "  }");
  return lines.join("\n");
};
