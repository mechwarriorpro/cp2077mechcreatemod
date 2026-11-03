/* OPTIONAL COMPATIBILITY LAYER — Autodrive + Crystal Coat.
   Browser side: deterministic procedural autopilot and a Crystal-Coat-compatible
   procedural coating (same primary/secondary/light-hue fields and CCP1 share codes).
   CET side: tools/init.lua.template probes the other mods with pcall(GetMod), never
   requires them, never bundles their files. */

MF.compat = {};

MF.compat.defaultCoat = function () { return clone(DATA.compat.crystalCoat.fields); };
MF.compat.coatPreset = function (id) {
  const c = DATA.compat.coatings.find((x) => x.id === id);
  return c ? clone(c) : MF.compat.defaultCoat();
};
MF.compat.clampCoat = function (c) {
  const d = MF.compat.defaultCoat(), out = Object.assign({}, d, c || {});
  const num = (k, lo, hi) => { const v = Number(out[k]); out[k] = isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d[k]; };
  ["metallic", "roughness", "flake", "wear", "emission", "lightsBrightness"].forEach((k) => num(k, 0, 1));
  num("lightHue", 0, 359); num("patternSeed", 0, 999999);
  ["primary", "secondary"].forEach((k) => {
    out[k] = /^#[0-9a-fA-F]{6}$/.test(String(out[k])) ? out[k] : d[k];
  });
  out.aspect = DATA.compat.crystalCoat.aspects.indexOf(out.aspect) >= 0 ? out.aspect : "metallic";
  out.name = String(out.name || "UNTITLED COAT").slice(0, 40);
  return out;
};

/* Crystal Coat Picker one-line share code, e.g.
   CCP1;P=C81E3C;S=202024;L=200;N=Night Runner */
MF.compat.encodeCoat = function (c) {
  const x = MF.compat.clampCoat(c);
  const f = (v, n) => Number(v).toFixed(n === undefined ? 2 : n);
  return "CCP1;P=" + x.primary.slice(1).toUpperCase() + ";S=" + x.secondary.slice(1).toUpperCase() +
    ";L=" + Math.round(x.lightHue) + ";N=" + x.name.replace(/[;=]/g, " ") +
    ";A=" + x.aspect + ";M=" + f(x.metallic) + ";R=" + f(x.roughness) +
    ";F=" + f(x.flake) + ";W=" + f(x.wear) + ";E=" + f(x.emission) +
    ";D=" + Math.round(x.patternSeed) + ";B=" + f(x.lightsBrightness);
};
MF.compat.decodeCoat = function (code) {
  if (!/^CCP1[;]/i.test(String(code || ""))) return null;
  const out = MF.compat.defaultCoat();
  String(code).split(";").slice(1).forEach((pair) => {
    const i = pair.indexOf("="); if (i < 0) return;
    const k = pair.slice(0, i).toUpperCase(), v = pair.slice(i + 1);
    if (k === "P" && /^[0-9a-f]{6}$/i.test(v)) out.primary = "#" + v.toUpperCase();
    else if (k === "S" && /^[0-9a-f]{6}$/i.test(v)) out.secondary = "#" + v.toUpperCase();
    else if (k === "N") out.name = v.slice(0, 40) || "IMPORTED COAT";
    else if (k === "A") out.aspect = v;
    else if (k === "L") out.lightHue = Number(v);
    else if (k === "M") out.metallic = Number(v);
    else if (k === "R") out.roughness = Number(v);
    else if (k === "F") out.flake = Number(v);
    else if (k === "W") out.wear = Number(v);
    else if (k === "E") out.emission = Number(v);
    else if (k === "D") out.patternSeed = Number(v);
    else if (k === "B") out.lightsBrightness = Number(v);
  });
  return MF.compat.clampCoat(out);
};

/* ------------------------------------------------------ AUTODRIVE (procedural) */
MF.compat.autodrive = {
  linked: false, simLink: false,
  status() {
    const a = DATA.compat.autodrive;
    return {
      present: !!this.simLink || (typeof window.GetMod === "function"),
      native: "CP2077 2.3 vanilla Auto Drive + optional " + a.modNames[0] + " / " + a.modNames[3],
      key: a.key,
      mode: this.linked ? "LINKED" : "BROWSER FALLBACK",
      note: a.browserFallback
    };
  },
  setLink(on) { this.linked = !!on; this.simLink = !!on; },
  /* steer toward a waypoint with obstacle avoidance; pure math, no dependency */
  steer(me, waypoint, terrain, cfg) {
    cfg = Object.assign({}, DATA.compat.autodrive.params, cfg || {});
    const dx = waypoint.x - me.x, dz = waypoint.z - me.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < cfg.waypointRadius) return { throttle: 0, steer: 0, done: true, dist };
    const wanted = Math.atan2(dx, dz);
    let delta = wanted - me.yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    /* repulsion from obstacles */
    let ax = 0, az = 0;
    (terrain.obstacles || []).forEach((o) => {
      const ox = me.x - o.x, oz = me.z - o.z, od = Math.sqrt(ox * ox + oz * oz);
      const range = o.r + cfg.obstacleMargin;
      if (od < range && od > 0.001) {
        const push = (range - od) / range * cfg.avoidance * 3;
        ax += ox / od * push; az += oz / od * push;
      }
    });
    const avoid = Math.atan2(ax, az) - wanted;
    let steer = delta + (isFinite(avoid) ? Math.max(-0.6, Math.min(0.6, avoid)) * 0.5 : 0);
    steer = Math.max(-cfg.maxSteer, Math.min(cfg.maxSteer, steer));
    return { throttle: cfg.cruiseSpeed * (1 - Math.min(0.5, Math.abs(delta) / Math.PI)),
      steer, done: false, dist };
  },
  waypoints(seed, terrain, count) {
    const out = [];
    for (let i = 0; i < (count || 4); i++) {
      const a = MF.mesh3d.hash(i, 13, seed) * Math.PI * 2;
      const r = 34 + MF.mesh3d.hash(i, 27, seed) * 92;
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, id: i + 1 });
    }
    return out;
  }
};

/* ------------------------------------------------------ CRYSTAL COAT (procedural) */
MF.compat.crystalCoat = {
  syncFromMod: null,
  status() {
    const c = DATA.compat.crystalCoat;
    return {
      present: typeof window.GetMod === "function" || !!this.syncFromMod,
      native: "CP2077 2.2+ CrystalCoat (primary / secondary / light hue / paint aspect)",
      picker: c.modNames[0],
      holdKey: c.holdKey,
      codeFormat: c.codeFormat,
      example: c.codeExample,
      note: c.browserFallback
    };
  },
  /* best-effort sync when a CET bridge has published colours on window */
  readExternal() {
    if (typeof window.MF_CRYSTAL_COAT_SYNC === "object" && window.MF_CRYSTAL_COAT_SYNC) {
      const x = window.MF_CRYSTAL_COAT_SYNC;
      return MF.compat.clampCoat(Object.assign(MF.compat.defaultCoat(), {
        primary: x.primary || x.P, secondary: x.secondary || x.S,
        lightHue: x.lightHue === undefined ? x.L : x.lightHue,
        name: x.name || x.N || "CET SYNC"
      }));
    }
    return null;
  }
};

/* ------------------------------------------------------ CET snippet */
MF.compat.luaSnippet = function (coat, autopilot) {
  const c = MF.compat.clampCoat(coat);
  const q = (s) => JSON.stringify(String(s));
  const lines = [
    "-- MECHFALL // FORGE 77 — optional compat state for CET init.lua (MF.compat)",
    "-- Paste inside onInit after MF.compat is defined. Both mods remain OPTIONAL.",
    "MF.compat.coat = {",
    "  primary = " + q(c.primary) + ", secondary = " + q(c.secondary) + ",",
    "  lightHue = " + Math.round(c.lightHue) + ", lightsBrightness = " + Number(c.lightsBrightness).toFixed(2) + ",",
    "  aspect = " + q(c.aspect) + ", metallic = " + Number(c.metallic).toFixed(2) + ",",
    "  roughness = " + Number(c.roughness).toFixed(2) + ", flake = " + Number(c.flake).toFixed(2) + ",",
    "  wear = " + Number(c.wear).toFixed(2) + ", emission = " + Number(c.emission).toFixed(2) + ",",
    "  patternSeed = " + Math.round(c.patternSeed) + ", name = " + q(c.name) + " }",
    "MF.compat.autopilot = " + (autopilot ? "true" : "false"),
    "MF.compat.code = " + q(MF.compat.encodeCoat(c)),
    "log(\"Crystal Coat procedural parameters + Autodrive link state applied\")"
  ];
  return lines.join("\n");
};
