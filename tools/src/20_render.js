/* MECHFALL // FORGE 77 — all graphics are procedural canvas. No images, no external assets. */

MF.draw = {};
MF.colors = { frame: "#4dd0e1", armor: "#7e9aab", actuator: "#ffb347", reactor: "#ff7b54",
  ew: "#c792ea", vent: "#8bd450", weapon: "#ff5f56", grid: "#162a3a", label: "#7e9aab" };

MF.fit = function (canvas, noClear) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(120, Math.round(canvas.clientWidth || canvas.getAttribute("width") || 320));
  const h = Math.max(90, Math.round(canvas.clientHeight || canvas.getAttribute("height") || 200));
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const changed = canvas.width !== W || canvas.height !== H;
  if (changed) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!noClear || changed) ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  return { ctx, w, h };
};

/* ------------------------------------------------------------------ SLEEK PARAMETRIC MECH GEOMETRY
   Tapered octagonal hulls, chamfered rings, swept fins, joint rings and nozzle bells — all
   original procedural geometry driven by the player's shape parameters. No imported meshes. */
MF.ringPoints = function (c, w, d, axis, bevel) {
  const w2 = w / 2, d2 = d / 2, q = Math.min(w2, d2) * (bevel === undefined ? 0.22 : bevel);
  const o = [[w2 - q, d2], [w2, d2 - q], [w2, -d2 + q], [w2 - q, -d2],
    [-w2 + q, -d2], [-w2, -d2 + q], [-w2, d2 - q], [-w2 + q, d2]];
  return o.map((v) => axis === "y" ? [c[0] + v[0], c[1], c[2] + v[1]] :
    axis === "x" ? [c[0], c[1] + v[0], c[2] + v[1]] :
      [c[0] + v[0], c[1] + v[1], c[2]]);
};
MF.circlePoints = function (c, r, axis, n) {
  const out = [], N = n || 12;
  for (let i = 0; i < N; i++) {
    const t = i * Math.PI * 2 / N, u = Math.cos(t) * r, v = Math.sin(t) * r;
    out.push(axis === "y" ? [c[0] + u, c[1], c[2] + v] :
      axis === "x" ? [c[0], c[1] + u, c[2] + v] : [c[0] + u, c[1] + v, c[2]]);
  }
  return out;
};

MF.shapeParts = function (s) {
  const out = [];
  const push = (b) => { out.push(b); return b; };
  const H = function (anchor, name, group, c, w, h, d, o) {
    o = o || {};
    const axis = o.axis || "y";
    const len = axis === "y" ? h : (axis === "z" ? d : w);
    const ext2 = axis === "y" ? d : (axis === "z" ? h : d);
    const n = o.sections || 4, top = o.top === undefined ? 0.86 : o.top,
      bot = o.bot === undefined ? 0.78 : o.bot;
    const rings = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const k = o.profile === "torso" ? 0.74 + 0.34 * Math.sin(Math.PI * t) : top + (bot - top) * t;
      const cc = [c[0] + (o.dx || 0) * t, c[1] + (o.dy || 0) * t, c[2] + (o.dz || 0) * t];
      if (axis === "y") cc[1] = c[1] + len / 2 - len * t;
      else if (axis === "z") cc[2] = c[2] + len / 2 - len * t;
      else cc[0] = c[0] + len / 2 - len * t;
      rings.push(MF.ringPoints(cc, w * k, ext2 * k, axis, o.bevel === undefined ? 0.24 : o.bevel));
    }
    return push({ anchor, name, x: c[0], y: c[1], z: c[2], w, h, d, group,
      type: "hull", rings, canopy: !!o.canopy, chest: !!o.chest, ribs: o.ribs !== false });
  };
  const N = function (anchor, name, group, c, axis, r, len, o) {
    o = o || {};
    return push({ anchor, name, x: c[0], y: c[1], z: c[2], w: r * 2, h: r * 2, d: len,
      group, type: "nozzle", center: c, axis, radius: r, length: len,
      count: o.count || 1, flare: o.flare || 1.45, thrust: !!o.thrust });
  };
  const F = function (anchor, name, group, quad, o) {
    o = o || {};
    const cx = quad.reduce((a, q) => a + q[0], 0) / quad.length;
    const cy = quad.reduce((a, q) => a + q[1], 0) / quad.length;
    const cz = quad.reduce((a, q) => a + q[2], 0) / quad.length;
    return push({ anchor, name, x: cx, y: cy, z: cz, w: 0.6, h: 0.9, d: 0.2,
      group, type: "fin", quad, slats: o.slats || 6 });
  };
  const J = function (anchor, name, group, c, r) {
    return push({ anchor, name, x: c[0], y: c[1], z: c[2], w: r * 2, h: r * 2, d: r * 2,
      group, type: "joint", center: c, radius: r });
  };

  const th = s.torsoH, tw = s.torsoW, td = s.torsoD;
  const bevel = 0.26;
  /* ---- central hull: waisted chest, angular shoulders, sloped canopy ---- */
  H("torso", "TORSO", "armor", [0, 0, 0], tw, th, td,
    { profile: "torso", sections: 5, bevel, chest: true });
  H("head", "COCKPIT", "frame", [0, th / 2 + s.headScale * 0.34, 0],
    s.headScale * 0.9, s.headScale * 0.72, s.headScale * 0.9,
    { sections: 3, top: 0.7, bot: 1.05, canopy: true, bevel: 0.34 });
  H("sensor", "SENSOR SUITE", "ew", [0, th / 2 + s.headScale * 0.30, s.headScale * 0.52],
    s.headScale * 0.44, s.headScale * 0.30, s.headScale * 0.30, { sections: 3, top: 0.72, bot: 1 });
  H("backpack", "EW PACK", "vent", [0, th * 0.08, -td / 2 - 0.3], tw * 0.6, th * 0.5, 0.55,
    { sections: 3, top: 0.9, bot: 0.8 });
  H("reactor", "REACTOR CORE", "reactor", [0, -th * 0.1, td / 2 + 0.22],
    tw * 0.42, th * 0.32, 0.42, { sections: 4, top: 0.86, bot: 0.86, bevel: 0.4 });
  H("bus", "POWER BUS SPINE", "frame", [0, -th * 0.02, 0.05], tw * 0.24, th * 0.55, td * 0.4,
    { sections: 4, top: 0.8, bot: 0.8, bevel: 0.3 });
  H("capacitor", "CAPACITOR BANK", "reactor", [0, -th * 0.30, td * 0.26],
    tw * 0.30, th * 0.20, td * 0.30, { sections: 3, top: 0.92, bot: 0.92 });
  H("coolant", "COOLANT MANIFOLD", "vent", [0, -th * 0.30, -td * 0.26],
    tw * 0.30, th * 0.20, td * 0.30, { sections: 3, top: 0.92, bot: 0.92 });

  /* ---- shoulders, arms, weapons ---- */
  const sx = tw / 2 + s.shoulderW * 0.26, sy = th * 0.28;
  H("shoulderL", "SHOULDER L", "armor", [-sx, sy, 0], s.shoulderW * 0.55, s.shoulderH, td * 0.85,
    { sections: 4, top: 1.08, bot: 0.72, bevel: 0.3 });
  H("shoulderR", "SHOULDER R", "armor", [sx, sy, 0], s.shoulderW * 0.55, s.shoulderH, td * 0.85,
    { sections: 4, top: 1.08, bot: 0.72, bevel: 0.3 });
  const armY = sy - s.shoulderH / 2 - s.upperArm / 2;
  H("upperArmL", "UPPER ARM L", "actuator", [-sx, armY, 0], 0.42, s.upperArm, 0.42,
    { sections: 3, top: 1, bot: 0.78 });
  H("upperArmR", "UPPER ARM R", "actuator", [sx, armY, 0], 0.42, s.upperArm, 0.42,
    { sections: 3, top: 1, bot: 0.78 });
  const foreY = armY - s.upperArm / 2 - s.foreArm / 2;
  H("foreArmL", "FOREARM L", "actuator", [-sx, foreY, 0.05], 0.5, s.foreArm, 0.5,
    { sections: 3, top: 0.9, bot: 0.72, dx: -0.05 });
  H("foreArmR", "FOREARM R", "actuator", [sx, foreY, 0.05], 0.5, s.foreArm, 0.5,
    { sections: 3, top: 0.9, bot: 0.72, dx: 0.05 });
  J("jointL", "ELBOW L", "actuator", [-sx, armY - s.upperArm / 2, 0], 0.28);
  J("jointR", "ELBOW R", "actuator", [sx, armY - s.upperArm / 2, 0], 0.28);
  const wz = td / 2 + 0.35;
  N("weaponL", "WEAPON L", "weapon", [-s.weaponX, s.weaponY - th / 2, wz], "z", 0.24, 1.35,
    { flare: 1.15, count: 1 });
  N("weaponR", "WEAPON R", "weapon", [s.weaponX, s.weaponY - th / 2, wz], "z", 0.24, 1.35,
    { flare: 1.15, count: 1 });

  /* ---- hip and legs (reverse-joint bends are real hull offsets) ---- */
  H("hip", "HIP YOKE", "frame", [0, -th / 2 - 0.22, 0], s.hipW, 0.38, td * 0.8,
    { sections: 3, top: 1.06, bot: 0.86 });
  const lx = s.legStance * 0.55, hipY = -th / 2 - 0.4;
  const ulY = hipY - s.upperLeg / 2, llY = ulY - s.upperLeg / 2 - s.lowerLeg / 2;
  const rj = s.style === "reversejoint" || s.style === "spider" || s.style === "tetrapod";
  const bend = rj ? 0.55 : -0.12;
  H("upperLegL", "UPPER LEG L", "actuator", [-lx, ulY, 0], 0.55, s.upperLeg, 0.55,
    { sections: 4, top: 1.05, bot: 0.8, dz: bend * 0.4 });
  H("upperLegR", "UPPER LEG R", "actuator", [lx, ulY, 0], 0.55, s.upperLeg, 0.55,
    { sections: 4, top: 1.05, bot: 0.8, dz: bend * 0.4 });
  H("lowerLegL", "LOWER LEG L", "actuator", [-lx, llY, bend * 0.35], 0.6, s.lowerLeg, 0.6,
    { sections: 4, top: 0.95, bot: 0.7, dz: -bend * 0.5 });
  H("lowerLegR", "LOWER LEG R", "actuator", [lx, llY, bend * 0.35], 0.6, s.lowerLeg, 0.6,
    { sections: 4, top: 0.95, bot: 0.7, dz: -bend * 0.5 });
  J("kneeL", "KNEE L", "actuator", [-lx, ulY - s.upperLeg / 2, bend * 0.2], 0.30);
  J("kneeR", "KNEE R", "actuator", [lx, ulY - s.upperLeg / 2, bend * 0.2], 0.30);
  const footY = llY - s.lowerLeg / 2 - 0.14;
  H("footL", "FOOT L", "armor", [-lx, footY, s.footL * 0.18], 0.75, 0.28, s.footL,
    { sections: 3, top: 1.1, bot: 0.86 });
  H("footR", "FOOT R", "armor", [lx, footY, s.footL * 0.18], 0.75, 0.28, s.footL,
    { sections: 3, top: 1.1, bot: 0.86 });

  /* ---- thrusters, jump jets, radiators, vents ---- */
  const tsz = Math.max(0.35, Number(s.thrusterSize) || 0.8);
  const jn = Math.max(1, Math.round(Number(s.jumpJetCount) || 1));
  const jetN = Math.max(1, Math.ceil((Number(s.jetCount) || 2) / 2));
  N("thrusterL", "VECTOR THRUSTER L", "reactor", [-tw * 0.42, th * 0.05, -td / 2 - 0.55], "z",
    0.26 * tsz, 0.62 * tsz, { count: 2, flare: 1.6, thrust: true });
  N("thrusterR", "VECTOR THRUSTER R", "reactor", [tw * 0.42, th * 0.05, -td / 2 - 0.55], "z",
    0.26 * tsz, 0.62 * tsz, { count: 2, flare: 1.6, thrust: true });
  N("jumpJet", "JUMP JET POD", "vent", [0, th * 0.34, -td / 2 - 0.75], "z",
    0.30 * tsz, 0.72 * tsz, { count: jn, flare: 1.7, thrust: true });
  if (s.jetCount > 0) {
    N("jetL", "JET PACK L", "vent", [-tw * 0.3, th * 0.18, -td / 2 - 0.55], "z",
      0.19, 0.45, { count: jetN, flare: 1.5, thrust: true });
    N("jetR", "JET PACK R", "vent", [tw * 0.3, th * 0.18, -td / 2 - 0.55], "z",
      0.19, 0.45, { count: jetN, flare: 1.5, thrust: true });
  }
  const radY = th * 0.22, rz = -td * 0.35;
  F("radiatorL", "RADIATOR L", "vent", [
    [-tw * 0.62, radY + th * 0.30, rz], [-tw * 1.05, radY + th * 0.22, rz - 0.25],
    [-tw * 1.05, radY - th * 0.22, rz - 0.25], [-tw * 0.62, radY - th * 0.30, rz]], { slats: 7 });
  F("radiatorR", "RADIATOR R", "vent", [
    [tw * 0.62, radY + th * 0.30, rz], [tw * 1.05, radY + th * 0.22, rz - 0.25],
    [tw * 1.05, radY - th * 0.22, rz - 0.25], [tw * 0.62, radY - th * 0.30, rz]], { slats: 7 });
  F("ventL", "VENT / RAM PANEL L", "vent", [
    [-tw * 0.45, th * 0.12, td * 0.48], [-tw * 0.72, th * 0.26, td * 0.52],
    [-tw * 0.72, -th * 0.16, td * 0.52], [-tw * 0.45, -th * 0.10, td * 0.48]], { slats: 6 });
  F("ventR", "VENT / RAM PANEL R", "vent", [
    [tw * 0.45, th * 0.12, td * 0.48], [tw * 0.72, th * 0.26, td * 0.52],
    [tw * 0.72, -th * 0.16, td * 0.52], [tw * 0.45, -th * 0.10, td * 0.48]], { slats: 6 });

  /* ---- style flourishes: swept armour, shield, crest, quad legs ---- */
  if (s.armorFlare > 0.4) {
    F("flareL", "ARMOUR FLARE L", "armor", [
      [-tw * 0.55, th * 0.42, td * 0.22], [-tw * (0.72 + s.armorFlare * 0.18), th * 0.30, td * 0.3],
      [-tw * (0.72 + s.armorFlare * 0.18), -th * 0.18, td * 0.3], [-tw * 0.55, -th * 0.30, td * 0.22]], { slats: 4 });
    F("flareR", "ARMOUR FLARE R", "armor", [
      [tw * 0.55, th * 0.42, td * 0.22], [tw * (0.72 + s.armorFlare * 0.18), th * 0.30, td * 0.3],
      [tw * (0.72 + s.armorFlare * 0.18), -th * 0.18, td * 0.3], [tw * 0.55, -th * 0.30, td * 0.22]], { slats: 4 });
  }
  if (s.style === "knight") {
    F("crest", "CREST / COMMS FIN", "armor", [
      [0, th / 2 + s.headScale * 1.25, -0.1], [0, th / 2 + s.headScale * 0.42, 0.25],
      [0, th / 2 + s.headScale * 0.42, -0.25], [0, th / 2 + s.headScale * 0.75, -0.1]], { slats: 3 });
    F("shield", "SHIELD PLATE", "armor", [
      [-tw * 0.70, th * 0.55, td * 0.42], [-tw * 1.05, th * 0.45, td * 0.55],
      [-tw * 1.05, -th * 0.45, td * 0.55], [-tw * 0.70, -th * 0.55, td * 0.42]], { slats: 5 });
  } else {
    F("crest", "COMMS FIN", "frame", [
      [0, th / 2 + s.headScale * 0.95, -0.1], [0, th / 2 + s.headScale * 0.45, 0.12],
      [0, th / 2 + s.headScale * 0.45, -0.12], [0, th / 2 + s.headScale * 0.70, -0.1]], { slats: 2 });
    F("shield", "AUX PLATE", "armor", [
      [-tw * 0.70, th * 0.35, td * 0.42], [-tw * 0.92, th * 0.28, td * 0.5],
      [-tw * 0.92, -th * 0.28, td * 0.5], [-tw * 0.70, -th * 0.35, td * 0.42]], { slats: 3 });
  }
  if (s.style === "spider" || s.style === "tetrapod") {
    const ex = s.legStance * 0.95;
    H("extraLegL", "REAR LEG L", "actuator", [-ex, ulY, -td * 0.6], 0.52, s.upperLeg + s.lowerLeg, 0.52,
      { sections: 5, top: 1.05, bot: 0.6, dz: -0.6 });
    H("extraLegR", "REAR LEG R", "actuator", [ex, ulY, -td * 0.6], 0.52, s.upperLeg + s.lowerLeg, 0.52,
      { sections: 5, top: 1.05, bot: 0.6, dz: -0.6 });
  }
  /* Compose signature parts: overrides replace the generic base part with the same anchor,
     new anchors add distinctive silhouette pieces. */
  const ov = MF.sigGeometry ? MF.sigGeometry(s, s.sig) : [];
  if (!ov.length) return out;
  const removes = {}, byAnchor = {}, baseAnchors = {};
  out.forEach((b) => { baseAnchors[b.anchor] = true; });
  ov.forEach((d) => {
    if (d.remove) removes[d.anchor] = true;
    else byAnchor[d.anchor] = d;
  });
  const merged = out.filter((b) => !removes[b.anchor]).map((b) => byAnchor[b.anchor] || b);
  const have = {}; merged.forEach((b) => { have[b.anchor] = true; });
  ov.forEach((d) => { if (!d.remove && !have[d.anchor]) { merged.push(d); have[d.anchor] = true; } });
  const internalAnchors = { bus: 1, capacitor: 1, coolant: 1, reactor: 1, sensor: 1,
    jointL: 1, jointR: 1, kneeL: 1, kneeR: 1, sigShoulderL: 1, sigShoulderR: 1,
    sigLegL: 1, sigLegR: 1 };
  merged.forEach((b) => { if (internalAnchors[b.anchor]) b.internal = true; });
  return merged;
};

MF.projector = function (view, yaw, pitch, scale, cx, cy) {
  const a = yaw || 0, e = pitch || 0;
  const ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
  return function (x, y, z) {
    if (view === "front") return { x: cx + x * scale, y: cy - y * scale, depth: z };
    if (view === "side") return { x: cx + z * scale, y: cy - y * scale, depth: x };
    const X = x * ca + z * sa, Z = -x * sa + z * ca;
    const Y = y * ce - Z * se;
    return { x: cx + X * scale, y: cy - Y * scale, depth: Z * ce + y * se };
  };
};

MF.boxCorners = function (b) {
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2;
  const y0 = b.y - b.h / 2, y1 = b.y + b.h / 2;
  const z0 = b.z - b.d / 2, z1 = b.z + b.d / 2;
  return [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
};
const EDGES = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const FACES = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[3,2,6,7],[1,2,6,5],[0,3,7,4]];

MF.draw.box = function (ctx, b, P, opts) {
  const o = opts || {};
  const pts = MF.boxCorners(b).map((c) => P(c[0], c[1], c[2]));
  const color = o.color || MF.colors[b.group] || MF.colors.frame;
  if (o.filled) {
    ctx.globalAlpha = o.alpha === undefined ? 0.28 : o.alpha;
    ctx.fillStyle = color;
    FACES.forEach((f) => {
      ctx.beginPath(); ctx.moveTo(pts[f[0]].x, pts[f[0]].y);
      for (let i = 1; i < f.length; i++) ctx.lineTo(pts[f[i]].x, pts[f[i]].y);
      ctx.closePath(); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = o.selected ? 2 : (o.lineWidth || 1);
  if (o.selected) { ctx.shadowColor = color; ctx.shadowBlur = 9; }
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.92 : o.strokeAlpha;
  ctx.beginPath();
  EDGES.forEach((e) => { ctx.moveTo(pts[e[0]].x, pts[e[0]].y); ctx.lineTo(pts[e[1]].x, pts[e[1]].y); });
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x: Math.min.apply(null, xs), y: Math.min.apply(null, ys),
    w: Math.max.apply(null, xs) - Math.min.apply(null, xs),
    h: Math.max.apply(null, ys) - Math.min.apply(null, ys) };
};

/* ------------------------------------------------------------------ sleek primitives */
MF.draw.rectOf = function (pts) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min.apply(null, xs), y0 = Math.min.apply(null, ys);
  return { x: x0, y: y0, w: Math.max.apply(null, xs) - x0, h: Math.max.apply(null, ys) - y0 };
};
MF.draw.strokePts = function (ctx, pts, close) {
  ctx.beginPath();
  pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  if (close) ctx.closePath();
  ctx.stroke();
};
MF.draw.hull = function (ctx, b, P, opts) {
  const o = opts || {};
  if (!b.rings || !b.rings.length) return MF.draw.box(ctx, b, P, o);
  const color = o.color || MF.colors[b.group] || MF.colors.frame;
  const pr = b.rings.map((r) => r.map((v) => P(v[0], v[1], v[2])));
  const n = pr[0].length, all = [].concat.apply([], pr);
  if (o.filled) {
    ctx.globalAlpha = o.solid ? 0.92 : (o.alpha === undefined ? 0.22 : o.alpha);
    ctx.fillStyle = o.solid ? "#08131c" : color;
    for (let k = 0; k < pr.length - 1; k++) for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      ctx.beginPath();
      ctx.moveTo(pr[k][i].x, pr[k][i].y); ctx.lineTo(pr[k][j].x, pr[k][j].y);
      ctx.lineTo(pr[k + 1][j].x, pr[k + 1][j].y); ctx.lineTo(pr[k + 1][i].x, pr[k + 1][i].y);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = o.selected ? 2.2 : (o.lineWidth || 1);
  if (o.selected) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.95 : o.strokeAlpha;
  ctx.beginPath();
  pr.forEach((r) => { for (let i = 0; i < n; i++) { const j = (i + 1) % n;
    ctx.moveTo(r[i].x, r[i].y); ctx.lineTo(r[j].x, r[j].y); } });
  for (let k = 0; k < pr.length - 1; k++) for (let i = 0; i < n; i++) {
    ctx.moveTo(pr[k][i].x, pr[k][i].y); ctx.lineTo(pr[k + 1][i].x, pr[k + 1][i].y);
  }
  if (b.ribs !== false && o.ribs !== false) {
    for (let k = 0; k < pr.length - 1; k++) for (let i = 0; i < n; i += 2) {
      const j = (i + 1) % n;
      ctx.moveTo(pr[k][i].x, pr[k][i].y); ctx.lineTo(pr[k + 1][j].x, pr[k + 1][j].y);
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  /* chest V-plate and sloped canopy glazing give the hull a designed, non-box silhouette */
  if (b.chest) {
    const t = pr[1], bot = pr[pr.length - 2];
    ctx.strokeStyle = "#ffd166"; ctx.globalAlpha = 0.75; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(t[0].x, t[0].y); ctx.lineTo(bot[4].x, bot[4].y);
    ctx.moveTo(t[3].x, t[3].y); ctx.lineTo(bot[7].x, bot[7].y); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (b.canopy) {
    const t = pr[0], m = pr[1];
    ctx.strokeStyle = "#8bd450"; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(t[0].x, t[0].y); ctx.lineTo(m[1].x, m[1].y);
    ctx.moveTo(t[4].x, t[4].y); ctx.lineTo(m[5].x, m[5].y); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  return MF.draw.rectOf(all);
};
MF.draw.nozzle = function (ctx, b, P, opts) {
  const o = opts || {};
  const color = o.color || MF.colors[b.group] || MF.colors.reactor;
  const c = b.center, ax = b.axis, r = b.radius, L = b.length, cnt = b.count || 1;
  const shift = (t) => {
    const cc = [c[0], c[1], c[2]];
    if (ax === "z") cc[2] = c[2] + L / 2 - L * t;
    else if (ax === "y") cc[1] = c[1] + L / 2 - L * t;
    else cc[0] = c[0] + L / 2 - L * t;
    return cc;
  };
  const all = [];
  for (let q = 0; q < cnt; q++) {
    const spread = cnt > 1 ? (q - (cnt - 1) / 2) * r * 2.3 : 0;
    const off = ax === "z" ? [spread, 0, 0] : ax === "y" ? [0, 0, spread] : [0, spread, 0];
    const rings = [0, 0.5, 1].map((t) => {
      const cc = shift(t);
      const cc2 = [cc[0] + off[0], cc[1] + off[1], cc[2] + off[2]];
      return MF.circlePoints(cc2, r * (1 + (b.flare - 1) * t), ax, 10);
    });
    const pr = rings.map((rr) => rr.map((v) => P(v[0], v[1], v[2])));
    pr.forEach((x) => all.push.apply(all, x));
    ctx.strokeStyle = color; ctx.lineWidth = o.selected ? 2.2 : 1;
    if (o.selected) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    ctx.globalAlpha = o.strokeAlpha === undefined ? 0.95 : o.strokeAlpha;
    ctx.beginPath();
    pr.forEach((rr) => { for (let i = 0; i < rr.length; i++) { const j = (i + 1) % rr.length;
      ctx.moveTo(rr[i].x, rr[i].y); ctx.lineTo(rr[j].x, rr[j].y); } });
    for (let k = 0; k < pr.length - 1; k++) for (let i = 0; i < pr[k].length; i += 2) {
      ctx.moveTo(pr[k][i].x, pr[k][i].y); ctx.lineTo(pr[k + 1][i].x, pr[k + 1][i].y);
    }
    /* inner throat + exhaust cone */
    const inner = MF.circlePoints([shift(1)[0] + off[0], shift(1)[1] + off[1], shift(1)[2] + off[2]],
      r * 0.5, ax, 10).map((v) => P(v[0], v[1], v[2]));
    for (let i = 0; i < inner.length; i++) { const j = (i + 1) % inner.length;
      ctx.moveTo(inner[i].x, inner[i].y); ctx.lineTo(inner[j].x, inner[j].y); }
    if (b.thrust) {
      const tip = P(c[0] + off[0] - (ax === "z" ? 0 : 0), c[1] + off[1], c[2] + off[2] - L * 0.9);
      pr[2].forEach((v, i) => { if (i % 2 === 0) { ctx.moveTo(v.x, v.y); ctx.lineTo(tip.x, tip.y); } });
    }
    ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  return MF.draw.rectOf(all);
};
MF.draw.fin = function (ctx, b, P, opts) {
  const o = opts || {};
  const color = o.color || MF.colors[b.group] || MF.colors.armor;
  const q = b.quad.map((v) => P(v[0], v[1], v[2]));
  if (o.filled) { ctx.globalAlpha = o.solid ? 0.86 : (o.alpha === undefined ? 0.18 : o.alpha);
    ctx.fillStyle = o.solid ? "#08131c" : color;
    ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); q.slice(1).forEach((v) => ctx.lineTo(v.x, v.y));
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = color; ctx.lineWidth = o.selected ? 2.2 : 1;
  if (o.selected) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.9 : o.strokeAlpha;
  MF.draw.strokePts(ctx, q, true);
  const N = b.slats || 5;
  ctx.beginPath();
  for (let i = 1; i < N; i++) {
    const t = i / N;
    const a = { x: q[0].x + (q[3].x - q[0].x) * t, y: q[0].y + (q[3].y - q[0].y) * t };
    const bb = { x: q[1].x + (q[2].x - q[1].x) * t, y: q[1].y + (q[2].y - q[1].y) * t };
    ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y);
  }
  ctx.moveTo(q[0].x, q[0].y); ctx.lineTo(q[2].x, q[2].y);
  ctx.moveTo(q[1].x, q[1].y); ctx.lineTo(q[3].x, q[3].y);
  ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  return MF.draw.rectOf(q);
};
MF.draw.joint = function (ctx, b, P, opts) {
  const o = opts || {};
  const color = o.color || MF.colors[b.group] || MF.colors.actuator;
  const c = b.center, r = b.radius, all = [];
  ctx.strokeStyle = color; ctx.lineWidth = o.selected ? 2 : 1;
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.85 : o.strokeAlpha;
  ctx.beginPath();
  ["y", "x", "z"].forEach((ax) => {
    const pts = MF.circlePoints(c, r, ax, 10).map((v) => P(v[0], v[1], v[2]));
    pts.forEach((v) => all.push(v));
    for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length;
      ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); }
  });
  ctx.stroke(); ctx.globalAlpha = 1;
  return MF.draw.rectOf(all);
};
MF.draw.part = function (ctx, b, P, opts) {
  if (b.type === "hull") return MF.draw.hull(ctx, b, P, opts);
  if (b.type === "nozzle") return MF.draw.nozzle(ctx, b, P, opts);
  if (b.type === "fin") return MF.draw.fin(ctx, b, P, opts);
  if (b.type === "joint") return MF.draw.joint(ctx, b, P, opts);
  return MF.draw.box(ctx, b, P, opts);
};
MF.draw.shiftPart = function (b, dx, dy, dz) {
  const n = Object.assign({}, b);
  n.x += dx; n.y += dy; n.z += dz;
  if (b.rings) n.rings = b.rings.map((r) => r.map((v) => [v[0] + dx, v[1] + dy, v[2] + dz]));
  if (b.quad) n.quad = b.quad.map((v) => [v[0] + dx, v[1] + dy, v[2] + dz]);
  if (b.center) n.center = [b.center[0] + dx, b.center[1] + dy, b.center[2] + dz];
  return n;
};

MF.draw.grid2D = function (ctx, w, h, step) {
  ctx.save(); ctx.strokeStyle = MF.colors.grid; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.6;
  const s = step || 24;
  for (let x = 0; x < w; x += s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.strokeStyle = "#244054"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  ctx.restore();
};

MF.draw.shapeOn = function (canvas, shape, opts) {
  const o = opts || {};
  const f = MF.fit(canvas);
  if (!f) return [];
  const { ctx, w, h } = f;
  MF.draw.grid2D(ctx, w, h, o.gridStep || 26);
  let boxes = MF.shapeParts(shape);
  if (o.shellOnly) boxes = boxes.filter((b) => !b.internal);
  const scale = o.scale || Math.min(w / (shape.torsoW * 3.4 + shape.legStance * 1.6),
    h / (shape.torsoH + shape.upperLeg + shape.lowerLeg + 2.4));
  const cx = o.cx === undefined ? w / 2 : o.cx;
  const cy = o.cy === undefined ? h / 2 + (shape.upperLeg + shape.lowerLeg) * scale * 0.22 : o.cy;
  const P = MF.projector(o.view || "front", o.yaw || 0, o.pitch || 0, scale, cx, cy);
  const sorted = boxes.slice().sort((a, b) => {
    const da = P(a.x, a.y, a.z).depth, db = P(b.x, b.y, b.z).depth;
    return (o.view === "orbit" ? 1 : -1) * (da - db);
  });
  const hit = [];
  sorted.forEach((b) => {
    const bb = Object.assign({}, b);
    if (o.explode) {
      const v = (o.directions || {})[b.anchor] || [0, 0, 0];
      bb.x += v[0] * o.explode; bb.y += v[1] * o.explode; bb.z += v[2] * o.explode;
    }
    const r = MF.draw.part(ctx, bb, P, { filled: !!o.filled, alpha: o.alpha,
      selected: o.highlight === b.anchor, color: o.color, strokeAlpha: o.strokeAlpha,
      solid: !!o.solid, ribs: o.ribs === undefined ? !o.shellOnly : o.ribs });
    hit.push({ anchor: b.anchor, name: b.name, rect: r });
    if (o.labels && b.anchor === "torso") {
      ctx.fillStyle = MF.colors.label; ctx.font = "9px monospace";
      ctx.fillText(o.label || "FRONT ELEVATION", 7, 13);
    }
  });
  if (o.dimensions) MF.draw.dimensions(ctx, shape, P, scale, w, h);
  return hit;
};

MF.draw.dimensions = function (ctx, s, P, scale, w, h) {
  ctx.save(); ctx.strokeStyle = "#ffb347"; ctx.fillStyle = "#ffb347";
  ctx.lineWidth = 1; ctx.font = "9px monospace"; ctx.globalAlpha = 0.85;
  const txt = (x, y, t) => { ctx.fillText(t, x, y); };
  const yTop = s.torsoH / 2, yBot = -s.torsoH / 2 - s.upperLeg - s.lowerLeg;
  // torso width
  const a = P(-s.torsoW / 2, yTop, s.torsoD / 2), b = P(s.torsoW / 2, yTop, s.torsoD / 2);
  ctx.beginPath(); ctx.moveTo(a.x, a.y - 8); ctx.lineTo(b.x, b.y - 8); ctx.stroke();
  txt((a.x + b.x) / 2 - 20, (a.y + b.y) / 2 - 12, "W " + fmt(s.torsoW, 1));
  // height
  const c = P(s.torsoW / 2 + 0.35, yTop, 0), d = P(s.torsoW / 2 + 0.35, yBot, 0);
  ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
  txt(c.x + 5, (c.y + d.y) / 2, "H " + fmt(s.torsoH, 1));
  // stance
  const e = P(-s.legStance * 0.55, yBot, 0), f = P(s.legStance * 0.55, yBot, 0);
  ctx.beginPath(); ctx.moveTo(e.x, e.y + 12); ctx.lineTo(f.x, f.y + 12); ctx.stroke();
  txt((e.x + f.x) / 2 - 24, e.y + 24, "STANCE " + fmt(s.legStance, 1));
  ctx.globalAlpha = 1; ctx.restore();
};

/* ------------------------------------------------------------------ polar RCS plot */
MF.draw.polar = function (canvas, polar, opts) {
  const o = opts || {};
  const f = MF.fit(canvas); if (!f) return;
  const { ctx, w, h } = f;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.40;
  const max = o.max || Math.max.apply(null, polar) * 1.15 || 1;
  ctx.strokeStyle = "#1c3346"; ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach((k) => {
    ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.font = "9px monospace"; ctx.fillStyle = "#7e9aab";
  for (let a = 0; a < 360; a += 30) {
    const r = a * Math.PI / 180;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.sin(r), cy - R * Math.cos(r)); ctx.stroke();
  }
  [["0° FRONT", 0, -R - 7], ["90° SIDE", R + 8, 0], ["180° REAR", 0, R + 13], ["270° SIDE", -R - 42, 0]].forEach((l) => {
    ctx.fillStyle = "#4dd0e1"; ctx.fillText(l[0], cx + l[1] - (l[0].length * 2.6), cy + l[2]);
  });
  ctx.beginPath();
  polar.forEach((v, i) => {
    const a = i * Math.PI / 18, r = R * clamp(v / max, 0.02, 1);
    const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(199,146,234,0.22)"; ctx.fill();
  ctx.strokeStyle = "#c792ea"; ctx.lineWidth = 1.8; ctx.stroke();
  polar.forEach((v, i) => {
    const a = i * Math.PI / 18, r = R * clamp(v / max, 0.02, 1);
    ctx.fillStyle = "#ffb347";
    ctx.fillRect(cx + r * Math.sin(a) - 1.2, cy - r * Math.cos(a) - 1.2, 2.4, 2.4);
  });
  ctx.fillStyle = "#7e9aab"; ctx.fillText("RCS max " + fmt(max, 1) + " m²", 7, 13);
};

/* ------------------------------------------------------------------ thermal map */
MF.draw.thermal = function (canvas, t) {
  const f = MF.fit(canvas); if (!f) return;
  const { ctx, w, h } = f;
  MF.draw.grid2D(ctx, w, h, 22);
  const parts = t.parts.slice(0, 12);
  const cols = 3, rows = Math.ceil(parts.length / cols);
  const cw = (w - 20) / cols, ch = Math.min(52, (h - 26) / rows);
  parts.forEach((p, i) => {
    const x = 8 + (i % cols) * cw, y = 8 + Math.floor(i / cols) * (ch + 4);
    const heat = Math.max(0, p.six.heatGen - p.six.heatDiss * 0.35);
    const ratio = clamp(heat / 35, 0, 1);
    const col = ratio > 0.66 ? "#ff5f56" : ratio > 0.33 ? "#ffb347" : "#4dd0e1";
    ctx.fillStyle = "#0d1a24"; ctx.fillRect(x, y, cw - 6, ch - 4);
    ctx.fillStyle = col; ctx.globalAlpha = 0.30 + ratio * 0.45;
    ctx.fillRect(x, y, (cw - 6) * (0.25 + ratio * 0.75), ch - 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#cfe3ee"; ctx.font = "9px monospace";
    ctx.fillText(p.name.slice(0, 18), x + 4, y + 12);
    ctx.fillStyle = col; ctx.fillText(fmt(heat, 1) + " kW", x + 4, y + 24);
  });
  ctx.fillStyle = "#7e9aab"; ctx.font = "9px monospace";
  ctx.fillText("NET " + fmt(t.netHeat, 1) + " kW · TEMP " + fmt(t.temperature, 2) + " · THERMAL MASS " + fmt(t.thermalMass, 0), 8, h - 6);
};

/* ------------------------------------------------------------------ ECM coverage ring */
MF.draw.ecm = function (canvas, t) {
  const f = MF.fit(canvas); if (!f) return;
  const { ctx, w, h } = f;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
  ctx.strokeStyle = "#1c3346"; ctx.lineWidth = 1;
  [0.35, 0.65, 1].forEach((k) => { ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, Math.PI * 2); ctx.stroke(); });
  const coverage = clamp(t.ecmCoverage / 360, 0.05, 1);
  ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R * (0.55 + t.jamStrength / 160), -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * coverage);
  ctx.closePath(); ctx.fillStyle = "rgba(199,146,234,0.20)"; ctx.fill();
  ctx.strokeStyle = "#c792ea"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * (0.35 + t.selfEmissions / 200), 0, Math.PI * 2);
  ctx.strokeStyle = "#ff5f56"; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7e9aab"; ctx.font = "9px monospace";
  ctx.fillText("JAM " + fmt(t.jamStrength, 1) + " · LOCK BREAK " + fmt(t.lockBreak, 2) + " · DEC " + t.decoys, 7, 13);
  ctx.fillText("SELF-EMISSIONS " + fmt(t.selfEmissions, 1) + " (red dashed)", 7, h - 7);
  for (let i = 0; i < Math.min(12, t.decoys); i++) {
    const a = i * 2.4;
    ctx.fillStyle = "#8bd450";
    ctx.fillRect(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82, 3, 3);
  }
};

/* ------------------------------------------------------------------ dependency graph */
MF.draw.graph = function (canvas, nodes, edges, opts) {
  const o = opts || {};
  const f = MF.fit(canvas); if (!f) return;
  const { ctx, w, h } = f;
  const n = nodes.length, cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.36;
  const pos = {};
  nodes.forEach((nd, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / n;
    pos[nd.id] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * (h / Math.max(w, 1) + 0.55) };
  });
  ctx.strokeStyle = "#2c4a60"; ctx.lineWidth = 1;
  edges.forEach((e) => {
    const a = pos[e[0]], b = pos[e[1]];
    if (!a || !b) return;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  });
  nodes.forEach((nd) => {
    const p = pos[nd.id];
    const active = !o.activeCats || o.activeCats.indexOf(nd.id) >= 0;
    ctx.fillStyle = active ? "#1b3346" : "#101b26";
    ctx.strokeStyle = active ? "#4dd0e1" : "#2c4a60";
    const tw = Math.min(96, nd.label.length * 6.2 + 12);
    ctx.fillRect(p.x - tw / 2, p.y - 9, tw, 18);
    ctx.strokeRect(p.x - tw / 2, p.y - 9, tw, 18);
    ctx.fillStyle = active ? "#cfe3ee" : "#5a7385"; ctx.font = "9px monospace";
    ctx.fillText(nd.label, p.x - tw / 2 + 5, p.y + 3);
  });
};

/* ------------------------------------------------------------------ line chart */
MF.draw.chart = function (canvas, series, opts) {
  const o = opts || {};
  const f = MF.fit(canvas); if (!f) return;
  const { ctx, w, h } = f;
  const padL = 34, padR = 8, padT = 16, padB = 18;
  const W = w - padL - padR, H = h - padT - padB;
  ctx.strokeStyle = "#1c3346"; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + H * i / 4;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
  }
  ctx.fillStyle = "#7e9aab"; ctx.font = "9px monospace";
  ctx.fillText(o.title || "", 6, 11);
  const allMax = Math.max(1e-6, ...series.flatMap((s) => s.data.map((v) => Math.abs(v))));
  const max = o.max || allMax * 1.1;
  ctx.fillText(fmt(max, 1), 3, padT + 8);
  ctx.fillText("0", 3, padT + H);
  series.forEach((s) => {
    if (!s.data.length) return;
    ctx.strokeStyle = s.color || "#4dd0e1"; ctx.lineWidth = s.width || 1.6;
    ctx.beginPath();
    s.data.forEach((v, i) => {
      const x = padL + W * (i / Math.max(1, s.data.length - 1));
      const y = padT + H - H * clamp(v / max, -0.1, 1);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  let lx = padL + 4;
  series.forEach((s) => {
    ctx.fillStyle = s.color || "#4dd0e1"; ctx.fillRect(lx, h - 12, 8, 3);
    ctx.fillText(s.name || "", lx + 11, h - 8);
    lx += 22 + (s.name || "").length * 6;
  });
  if (o.xLabel) ctx.fillText(o.xLabel, w - 76, padT + 8);
};

/* ------------------------------------------------------------------ TEARDOWN: sleek mech wireframe,
   physical internals bays, and power / heat transfer routing. */
MF.draw.mech = function (canvas, shape, parts, step, selectedAnchor, opts) {
  const o = opts || {};
  const f = MF.fit(canvas); if (!f) return [];
  const { ctx, w, h } = f;
  const compact = !!o.compact;
  MF.draw.grid2D(ctx, w, h, compact ? 11 : (o.gridStep || 26));
  const layers = o.layers || { wireframe: true, internals: true, flows: true };
  const dirs = DATA.teardowns.explode.directions || {};
  const ex = step * (DATA.teardowns.explode.stepScale || 0.30);
  const geo = {};
  MF.shapeParts(shape).forEach((b) => { geo[b.anchor] = b; });
  const shown = parts.filter((p) => geo[p.anchor]);
  const reactor = geo.reactor || { x: 0, y: 0, z: 0 };
  const centers = {};
  shown.forEach((p) => {
    const b = geo[p.anchor];
    const v = dirs[p.anchor] || [0, 0, 0];
    centers[p.anchor] = { x: b.x + v[0] * ex, y: b.y + v[1] * ex, z: b.z + v[2] * ex, src: b };
  });
  const envW = shape.torsoW * 3.2 + shape.shoulderW * 0.8 + (shape.legStance || 1.3) * 0.8;
  const envH = shape.torsoH + shape.upperLeg + shape.lowerLeg + 2.0;
  const scale = o.scale || Math.min(w / envW, h / envH) * (compact ? 0.82 : 0.94);
  const P = MF.projector("orbit", o.yaw === undefined ? 0.55 : o.yaw,
    o.pitch === undefined ? 0.20 : o.pitch, scale, w / 2, h / 2 + (shape.upperLeg + shape.lowerLeg) * scale * 0.12);

  const hit = [];
  const proj = {};
  shown.forEach((p) => {
    const c = centers[p.anchor];
    const q = P(c.x, c.y, c.z);
    proj[p.anchor] = q;
    const rw = Math.max(28, Math.max(c.src.w, c.src.d) * scale * 0.85);
    const rh = Math.max(24, Math.max(c.src.h, c.src.d) * scale * 0.85);
    hit.push({ anchor: p.anchor, name: p.name, rect: { x: q.x - rw / 2, y: q.y - rh / 2, w: rw, h: rh } });
  });
  const rq = P(reactor.x + (dirs.reactor ? dirs.reactor[0] * ex : 0),
    reactor.y + (dirs.reactor ? dirs.reactor[1] * ex : 0),
    reactor.z + (dirs.reactor ? dirs.reactor[2] * ex : 0));

  /* ---- 1. shell: sleek tapered hulls, sorted back-to-front ---- */
  if (layers.wireframe) {
    const shell = Object.keys(geo).map((k) => {
      const b = geo[k], v = dirs[k] || [0, 0, 0];
      return { b: MF.draw.shiftPart(b, v[0] * ex, v[1] * ex, v[2] * ex), depth: P(b.x, b.y, b.z).depth };
    }).sort((a, b) => a.depth - b.depth);
    const manifest = {}; parts.forEach((p) => { manifest[p.anchor] = true; });
    shell.forEach((x) => {
      const part = shown.find((pp) => pp.anchor === x.b.anchor);
      const inManifest = !!manifest[x.b.anchor];
      MF.draw.part(ctx, x.b, P, {
        filled: !compact && layers.internals && inManifest && !x.b.internal, alpha: 0.07,
        selected: !compact && x.b.anchor === selectedAnchor,
        strokeAlpha: compact ? 0.85 : (x.b.internal ? 0.26 : (inManifest ? 0.88 : 0.34)),
        ribs: false, lineWidth: inManifest ? 1 : 0.7
      });
      if (part && x.b.anchor === selectedAnchor && !compact) {
        const q = proj[x.b.anchor];
        ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(q.x, q.y, 18, 0, Math.PI * 2); ctx.stroke();
      }
    });
  }

  /* ---- 2. internals: physical mounting bays showing where components sit ---- */
  if (layers.internals && !compact) {
    shown.forEach((p, i) => {
      const q = proj[p.anchor];
      if (!q) return;
      const six = p.six || {};
      const dom = Math.max(Math.abs(six.powerDraw || 0), Math.abs(six.heatGen || 0), Math.abs(six.heatDiss || 0));
      const col = (six.heatDiss || 0) > (six.heatGen || 0) * 1.4 ? "#8bd450" :
        (six.heatGen || 0) > (six.powerDraw || 0) ? "#ff7b54" : "#4dd0e1";
      const sel = p.anchor === selectedAnchor;
      ctx.strokeStyle = sel ? "#ffb347" : col;
      ctx.fillStyle = sel ? "rgba(255,179,71,0.28)" : "rgba(8,18,26,0.72)";
      ctx.lineWidth = sel ? 1.8 : 1;
      ctx.beginPath(); ctx.arc(q.x, q.y, sel ? 7 : 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = sel ? "9px monospace" : "7px monospace";
      ctx.fillStyle = sel ? "#ffb347" : "#7e9aab";
      ctx.fillText(String(i + 1), q.x + 6, q.y - 5);
      if (sel) {
        const label = String(i + 1) + " " + String(p.name).slice(0, 22);
        ctx.font = "9px monospace"; ctx.fillStyle = "#ffb347";
        ctx.fillText(label, q.x + 9, q.y + 4);
      }
      void dom;
    });
  }

  /* ---- 3. flows: routed bus trunks, heat runs to radiators, coolant return loop ---- */
  if (layers.flows && !compact) {
    const fit = o.fit || null;
    const nodes = fit ? fit.nodes : [];
    const byAnchor = {}; nodes.forEach((n) => { byAnchor[n.anchor] = n; });
    const rads = parts.filter((p) => /radiator|vent|coolant/i.test(p.anchor));
    const busNames = fit ? fit.busRows.map((b) => b.name) : ["BUS A", "BUS B", "BUS C"];
    /* One trunk per power bus from the reactor to a distribution hub, then short branches. */
    busNames.forEach((bn) => {
      const group = parts.filter((p) => (byAnchor[p.anchor] || {}).bus === bn);
      if (!group.length) return;
      const pts = group.map((p) => proj[p.anchor]).filter(Boolean);
      if (!pts.length) return;
      const gx = pts.reduce((a, q) => a + q.x, 0) / pts.length;
      const gy = pts.reduce((a, q) => a + q.y, 0) / pts.length;
      const hub = { x: rq.x + (gx - rq.x) * 0.42, y: rq.y + (gy - rq.y) * 0.42 };
      ctx.strokeStyle = "rgba(77,208,225,0.55)"; ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(rq.x, rq.y); ctx.lineTo(hub.x, hub.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(77,208,225,0.24)"; ctx.lineWidth = 0.8;
      ctx.beginPath();
      group.forEach((p) => {
        const q = proj[p.anchor], n = byAnchor[p.anchor];
        if (q && n && (n.draw > 10 || p.anchor === selectedAnchor)) {
          ctx.moveTo(hub.x, hub.y); ctx.lineTo(q.x, q.y);
        }
      });
      ctx.stroke();
      ctx.fillStyle = "#4dd0e1";
      ctx.beginPath(); ctx.arc(hub.x, hub.y, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.font = "7px monospace"; ctx.fillText(bn.replace("BUS ", "B"), hub.x + 5, hub.y - 4);
    });
    /* Heat runs only for hot / heavy nodes; coolant is one green return loop. */
    shown.forEach((p) => {
      const q = proj[p.anchor]; if (!q) return;
      const n = byAnchor[p.anchor] || { gen: Math.max(0, (p.six || {}).heatGen || 0), hot: false };
      const sel = p.anchor === selectedAnchor;
      if ((sel || n.hot || n.gen > 28) && rads.length) {
        let best = null;
        rads.forEach((r) => {
          const qq = proj[r.anchor]; if (!qq) return;
          const d = Math.hypot(qq.x - q.x, qq.y - q.y);
          if (!best || d < best.d) best = { q: qq, d };
        });
        if (best) {
          ctx.strokeStyle = n.hot ? "#ff5f56" : "rgba(255,123,84,0.45)";
          ctx.lineWidth = sel ? 2.2 : clamp(0.6 + n.gen / 24, 0.6, 1.8);
          ctx.setLineDash([3, 5]);
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(best.q.x, best.q.y); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      if (sel) {
        ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2.4; ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(rq.x, rq.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    if (rads.length) {
      ctx.strokeStyle = "rgba(139,212,80,0.42)"; ctx.lineWidth = 1.1; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(rq.x, rq.y);
      rads.forEach((r) => { const q = proj[r.anchor]; if (q) ctx.lineTo(q.x, q.y); });
      ctx.lineTo(rq.x, rq.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  /* ---- captions ---- */
  ctx.fillStyle = "rgba(5,10,15,0.84)";
  ctx.fillRect(0, 0, w, compact ? 10 : 19);
  if (!compact) ctx.fillRect(0, h - 19, w, 19);
  if (!compact) {
    ctx.fillStyle = "#4dd0e1"; ctx.font = "9px monospace";
    ctx.fillText("SIGNATURE MECH WIREFRAME · FIT / POWER / HEAT TRANSFER · " +
      String(shape.style).toUpperCase() + " · " + shown.length + " MOUNTING BAYS", 7, 13);
    ctx.fillStyle = "#ffb347"; ctx.font = "9px monospace";
    ctx.fillText("STEP " + step + " / " + shown.length +
      " · CLICK A PART TO INSPECT INTERNALS · CYAN=BUS  ORANGE=HEAT  GREEN=COOLANT", 7, h - 7);
  } else {
    ctx.fillStyle = "#4dd0e1"; ctx.font = "7px monospace"; ctx.fillText("MECH", 3, 8);
  }
  return hit;
};


/* ------------------------------------------------------------------ SIGNATURE PART GEOMETRY
   A library of original procedural parts inspired by characteristic component TYPES from the
   study mechs. Each of the 30 prefabs composes a different set, so no two look alike. Players
   can mix any of them in MECH FORGE. No third-party model, mesh or traced silhouette is used. */
MF.gHull = function (anchor, name, group, c, w, h, d, o) {
  o = o || {};
  const axis = o.axis || "y";
  const len = axis === "y" ? h : (axis === "z" ? d : w);
  const ext2 = axis === "y" ? d : (axis === "z" ? h : d);
  const n = o.sections || 4, top = o.top === undefined ? 0.86 : o.top,
    bot = o.bot === undefined ? 0.78 : o.bot;
  const rings = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const k = o.profile === "torso" ? 0.74 + 0.34 * Math.sin(Math.PI * t) : top + (bot - top) * t;
    const cc = [c[0] + (o.dx || 0) * t, c[1] + (o.dy || 0) * t, c[2] + (o.dz || 0) * t];
    if (axis === "y") cc[1] = c[1] + len / 2 - len * t;
    else if (axis === "z") cc[2] = c[2] + len / 2 - len * t;
    else cc[0] = c[0] + len / 2 - len * t;
    rings.push(MF.ringPoints(cc, w * k, ext2 * k, axis, o.bevel === undefined ? 0.24 : o.bevel));
  }
  return { anchor, name, x: c[0], y: c[1], z: c[2], w, h, d, group,
    type: "hull", rings, chest: !!o.chest, canopy: !!o.canopy, ribs: o.ribs !== false };
};
MF.gWedge = function (anchor, name, group, c, w, h, d, taper, sweepX, sweepZ) {
  const bottom = MF.ringPoints([c[0], c[1] - h / 2, c[2]], w, d, "y", 0.16);
  const top = MF.ringPoints([c[0] + (sweepX || 0), c[1] + h / 2, c[2] + (sweepZ || 0)],
    w * (taper || 0.7), d * (taper || 0.7), "y", 0.16);
  return { anchor, name, x: c[0], y: c[1], z: c[2], w, h, d, group,
    type: "hull", rings: [top, bottom], ribs: false };
};
MF.gPod = function (anchor, name, group, c, axis, r, len, o) {
  o = o || {};
  const rings = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const cc = [c[0], c[1], c[2]];
    if (axis === "y") cc[1] = c[1] + len / 2 - len * t;
    else if (axis === "z") cc[2] = c[2] + len / 2 - len * t;
    else cc[0] = c[0] + len / 2 - len * t;
    const k = 0.30 + 0.70 * Math.pow(Math.sin(Math.PI * t), 0.55);
    rings.push(MF.circlePoints(cc, r * k, axis, 10));
  }
  return { anchor, name, x: c[0], y: c[1], z: c[2], w: r * 2, h: axis === "y" ? len : r * 2,
    d: axis === "z" ? len : r * 2, group, type: "hull", rings, ribs: false };
};
MF.gDome = function (anchor, name, group, c, w, h, d) {
  return { anchor, name, x: c[0], y: c[1], z: c[2], w, h, d, group,
    type: "dome", center: c };
};
MF.gBlade = function (anchor, name, group, root, tip, width, curve) {
  const cx = (root[0] + tip[0]) / 2, cy = (root[1] + tip[1]) / 2, cz = (root[2] + tip[2]) / 2;
  return { anchor, name, x: cx, y: cy, z: cz, w: width * 2, h: Math.abs(tip[1] - root[1]) || 1,
    d: width * 2, group, type: "blade", root, tip, width: width || 0.14, curve: curve || 0 };
};
MF.gRing = function (anchor, name, group, c, radius, inner, axis, spokes) {
  return { anchor, name, x: c[0], y: c[1], z: c[2], w: radius * 2, h: radius * 2, d: radius * 2,
    group, type: "ring", center: c, radius, inner: inner || radius * 0.58,
    axis: axis || "z", spokes: spokes || 8 };
};
MF.gRack = function (anchor, name, group, c, w, h, d, cols, rows) {
  return { anchor, name, x: c[0], y: c[1], z: c[2], w, h, d, group,
    type: "rack", center: c, cols: cols || 3, rows: rows || 2 };
};
MF.gJoint = function (anchor, name, group, c, r) {
  return { anchor, name, x: c[0], y: c[1], z: c[2], w: r * 2, h: r * 2, d: r * 2,
    group, type: "joint", center: c, radius: r };
};
MF.gNozzle = function (anchor, name, group, c, axis, r, len, o) {
  o = o || {};
  return { anchor, name, x: c[0], y: c[1], z: c[2], w: r * 2, h: r * 2, d: len, group,
    type: "nozzle", center: c, axis, radius: r, length: len,
    count: o.count || 1, flare: o.flare || 1.45, thrust: !!o.thrust };
};

/* ---- new primitive renderers ---- */
MF.draw.dome = function (ctx, b, P, opts) {
  const o = opts || {}, c = b.center, rx = b.w / 2, ry = b.h / 2, rz = b.d / 2;
  const color = o.color || MF.colors[b.group] || MF.colors.frame;
  const lat = 6, lon = 12, all = [];
  const pt = (a, t) => {
    const r = Math.sqrt(Math.max(0, 1 - t * t));
    return P(c[0] + Math.cos(a) * rx * r, c[1] + t * ry, c[2] + Math.sin(a) * rz * r);
  };
  if (o.filled && o.solid) {
    ctx.globalAlpha = 0.9; ctx.fillStyle = "#08131c";
    for (let i = 0; i < lat; i++) {
      const t1 = -1 + 2 * i / lat, t2 = -1 + 2 * (i + 1) / lat;
      for (let j = 0; j < lon; j++) {
        const a = j * Math.PI * 2 / lon, a2 = (j + 1) * Math.PI * 2 / lon;
        const p1 = pt(a, t1), p2 = pt(a2, t1), p3 = pt(a2, t2), p4 = pt(a, t2);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = color; ctx.lineWidth = o.selected ? 2.2 : 1;
  if (o.selected) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.9 : o.strokeAlpha;
  ctx.beginPath();
  for (let i = 1; i < lat; i++) {
    const t = -1 + 2 * i / lat;
    for (let j = 0; j < lon; j++) {
      const p1 = pt(j * Math.PI * 2 / lon, t), p2 = pt((j + 1) * Math.PI * 2 / lon, t);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); all.push(p1);
    }
  }
  for (let j = 0; j < lon; j++) {
    const a = j * Math.PI * 2 / lon;
    for (let i = 0; i < lat; i++) {
      const t = -1 + 2 * i / lat, t2 = -1 + 2 * (i + 1) / lat;
      const p1 = pt(a, t), p2 = pt(a, t2);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); all.push(p1);
    }
  }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  return MF.draw.rectOf(all.length ? all : [P(c[0], c[1], c[2])]);
};
MF.draw.blade = function (ctx, b, P, opts) {
  const o = opts || {}, root = b.root, tip = b.tip, w = b.width, cv = b.curve || 0;
  const color = o.color || MF.colors[b.group] || MF.colors.weapon;
  let dx = tip[0] - root[0], dy = tip[1] - root[1], dz = tip[2] - root[2];
  const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
  let px = -dy, py = dx, pz = 0;
  const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl;
  const up = [], lo = [], all = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, bulge = Math.sin(Math.PI * t) * w;
    const bx = root[0] + dx * L * t + px * cv * Math.sin(Math.PI * t);
    const by = root[1] + dy * L * t + py * cv * Math.sin(Math.PI * t);
    const bz = root[2] + dz * L * t;
    const a = [bx + px * bulge, by + py * bulge, bz + Math.sin(Math.PI * t) * w * 0.18];
    const bb = [bx - px * bulge, by - py * bulge, bz - Math.sin(Math.PI * t) * w * 0.18];
    up.push(P(a[0], a[1], a[2])); lo.push(P(bb[0], bb[1], bb[2]));
    all.push(up[i], lo[i]);
  }
  if (o.filled) {
    ctx.globalAlpha = o.solid ? 0.88 : (o.alpha === undefined ? 0.16 : o.alpha);
    ctx.fillStyle = o.solid ? "#08131c" : color;
    ctx.beginPath(); up.forEach((p, i) => { if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    for (let i = lo.length - 1; i >= 0; i--) ctx.lineTo(lo[i].x, lo[i].y);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = color; ctx.lineWidth = o.selected ? 2.4 : 1.1;
  if (o.selected) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.95 : o.strokeAlpha;
  MF.draw.strokePts(ctx, up, false);
  MF.draw.strokePts(ctx, lo, false);
  ctx.beginPath();
  ctx.moveTo(up[0].x, up[0].y); ctx.lineTo(lo[0].x, lo[0].y);
  ctx.moveTo(up[10].x, up[10].y); ctx.lineTo(lo[10].x, lo[10].y);
  for (let i = 1; i < 10; i += 2) { ctx.moveTo(up[i].x, up[i].y); ctx.lineTo(lo[i].x, lo[i].y); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  return MF.draw.rectOf(all);
};
MF.draw.ring = function (ctx, b, P, opts) {
  const o = opts || {}, c = b.center, ax = b.axis, R = b.radius, r = b.inner, N = 16;
  const color = o.color || MF.colors[b.group] || MF.colors.reactor;
  const outer = MF.circlePoints(c, R, ax, N).map((v) => P(v[0], v[1], v[2]));
  const inner = MF.circlePoints(c, r, ax, N).map((v) => P(v[0], v[1], v[2]));
  if (o.filled && o.solid) {
    ctx.globalAlpha = 0.86; ctx.fillStyle = "#08131c";
    ctx.beginPath();
    outer.forEach((p, i) => { if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = color; ctx.lineWidth = o.selected ? 2.2 : 1;
  if (o.selected) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.9 : o.strokeAlpha;
  ctx.beginPath();
  [outer, inner].forEach((rr) => { for (let i = 0; i < rr.length; i++) {
    const j = (i + 1) % rr.length; ctx.moveTo(rr[i].x, rr[i].y); ctx.lineTo(rr[j].x, rr[j].y); } });
  for (let i = 0; i < N; i += 2) {
    ctx.moveTo(outer[i].x, outer[i].y); ctx.lineTo(inner[i].x, inner[i].y);
    ctx.moveTo(inner[i].x, inner[i].y); ctx.lineTo(outer[(i + 4) % N].x, outer[(i + 4) % N].y);
  }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  return MF.draw.rectOf(outer.concat(inner));
};
MF.draw.rack = function (ctx, b, P, opts) {
  const o = opts || {}, c = b.center, w = b.w, h = b.h, d = b.d;
  const color = o.color || MF.colors[b.group] || MF.colors.weapon;
  const bottom = MF.ringPoints([c[0], c[1] - h / 2, c[2]], w, d, "y", 0.14);
  const top = MF.ringPoints([c[0], c[1] + h / 2, c[2]], w, d, "y", 0.14);
  const fake = { anchor: b.anchor, name: b.name, x: c[0], y: c[1], z: c[2], w, h, d,
    group: b.group, type: "hull", rings: [top, bottom], ribs: false };
  const rect = MF.draw.hull(ctx, fake, P, Object.assign({}, o, { selected: false, solid: o.solid }));
  ctx.strokeStyle = color; ctx.lineWidth = o.selected ? 2 : 0.8;
  ctx.globalAlpha = o.strokeAlpha === undefined ? 0.85 : o.strokeAlpha;
  ctx.beginPath();
  for (let ri = 0; ri < b.rows; ri++) for (let ci = 0; ci < b.cols; ci++) {
    const x = c[0] - w / 2 + w * (ci + 0.5) / b.cols;
    const y = c[1] - h / 2 + h * (ri + 0.5) / b.rows;
    const z = c[2] + d / 2 + 0.02;
    const cell = MF.circlePoints([x, y, z], Math.min(w / b.cols, h / b.rows) * 0.32, "z", 8)
      .map((v) => P(v[0], v[1], v[2]));
    for (let i = 0; i < cell.length; i++) {
      const j = (i + 1) % cell.length;
      ctx.moveTo(cell[i].x, cell[i].y); ctx.lineTo(cell[j].x, cell[j].y);
    }
    const a = P(x - w / (b.cols * 2.6), y - h / (b.rows * 2.6), z);
    const bb = P(x + w / (b.cols * 2.6), y + h / (b.rows * 2.6), z);
    ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y);
  }
  ctx.stroke(); ctx.globalAlpha = 1;
  return rect;
};
const _mfPart = MF.draw.part;
MF.draw.part = function (ctx, b, P, opts) {
  if (b.type === "dome") return MF.draw.dome(ctx, b, P, opts);
  if (b.type === "blade") return MF.draw.blade(ctx, b, P, opts);
  if (b.type === "ring") return MF.draw.ring(ctx, b, P, opts);
  if (b.type === "rack") return MF.draw.rack(ctx, b, P, opts);
  return _mfPart(ctx, b, P, opts);
};

/* ---- per-mech signature composition ---- */
MF.sigGeometry = function (s, sig) {
  const g = sig || {};
  const out = [];
  const add = (d) => { out.push(d); };
  const rm = (a) => { out.push({ anchor: a, remove: true }); };
  const tw = s.torsoW, th = s.torsoH, td = s.torsoD, hs = s.headScale;
  const sx = tw / 2 + s.shoulderW * 0.26, sy = th * 0.28;
  const armY = sy - s.shoulderH / 2 - s.upperArm / 2;
  const foreY = armY - s.upperArm / 2 - s.foreArm / 2;
  const hipY = -th / 2 - 0.4, lx = s.legStance * 0.55;
  const ulY = hipY - s.upperLeg / 2, llY = ulY - s.upperLeg / 2 - s.lowerLeg / 2;
  const footY = llY - s.lowerLeg / 2 - 0.14;
  const F = g.frame || "vanguard", H = g.head || "pod", SH = g.shoulders || "pauldron",
    B = g.back || "boosterPack", A = g.arms || "standard", L = g.legs || "braced";
  const E = g.extras || [];

  /* ---------------- frame / torso ---------------- */
  if (F === "atlas" || F === "hunchback") {
    add(MF.gWedge("torso", "HUNCHBACK TORSO", "armor", [0, 0, 0], tw * 1.48, th * 0.88, td * 1.12, 0.78, 0, -td * 0.18));
    add(MF.gWedge("backpack", "DORSAL HUNCH", "reactor", [0, th * 0.42, -td / 2 - 0.28],
      tw * 1.08, th * 0.72, 0.70, 0.84, 0, -0.20));
  } else if (F === "wedge") {
    add(MF.gWedge("torso", "WEDGE TORSO", "armor", [0, 0, 0], tw * 1.18, th * 0.84, td * 1.12, 0.52, 0, td * 0.24));
  } else if (F === "hover") {
    add(MF.gDome("torso", "HOVER HULL", "armor", [0, 0, 0], tw * 1.5, th * 0.82, td * 1.5));
  } else if (F === "flyer") {
    add(MF.gWedge("torso", "FLIGHT FUSELAGE", "armor", [0, 0, 0], tw * 0.68, th * 1.15, td * 1.9, 0.42, 0, td * 0.42));
  } else if (F === "tank") {
    add(MF.gWedge("torso", "SIEGE HULL", "armor", [0, -th * 0.12, 0], tw * 1.62, th * 0.66, td * 1.34, 0.86, 0, 0));
    add(MF.gRack("backpack", "DORSAL TURRET", "weapon", [0, th * 0.42, -td * 0.18],
      tw * 0.86, th * 0.4, td * 0.72, 3, 2));
  } else if (F === "spider") {
    add(MF.gWedge("torso", "LOW SPIDER HULL", "armor", [0, th * 0.12, 0], tw * 1.42, th * 0.68, td * 1.3, 0.74, 0, 0));
  } else if (F === "tetrapod") {
    add(MF.gWedge("torso", "TETRAPOD HULL", "armor", [0, 0, 0], tw * 1.26, th * 0.9, td * 1.16, 0.78, 0, 0));
  } else if (F === "corpo") {
    add(MF.gPod("torso", "ROUNDED CORPO HULL", "armor", [0, 0, 0], "y", tw * 0.62, th));
  } else if (F === "knight") {
    add(MF.gWedge("torso", "KNIGHT TORSO", "armor", [0, 0, 0], tw, th * 1.10, td, 0.80, 0, 0));
  } else if (F === "slim") {
    add(MF.gWedge("torso", "SLIM STRIKER TORSO", "armor", [0, 0, 0], tw * 0.84, th * 1.06, td * 0.86, 0.76, 0, 0));
  } else {
    add(MF.gHull("torso", "VANGUARD TORSO", "armor", [0, 0, 0], tw, th, td,
      { profile: "torso", sections: 5, bevel: 0.26, chest: true }));
  }

  /* ---------------- head ---------------- */
  const hy = th / 2 + hs * 0.34;
  if (H === "none") {
    rm("head");
    add(MF.gDome("sigHead", "INTEGRATED COCKPIT", "frame", [0, th * 0.30, td * 0.5], tw * 0.42, th * 0.20, td * 0.34));
  } else {
    if (H === "pod") add(MF.gWedge("head", "VANGUARD COCKPIT POD", "frame", [0, hy, 0], hs * 1.0, hs * 0.7, hs * 0.9, 0.68, 0, hs * 0.22));
    else if (H === "skull") add(MF.gWedge("head", "ATLAS CRANIAL SKULL", "armor", [0, hy, 0], hs * 1.18, hs * 0.82, hs * 1.0, 0.92, 0, 0));
    else if (H === "dome") add(MF.gDome("head", "SENSOR DOME", "frame", [0, hy, 0], hs * 1.1, hs * 0.86, hs * 1.1));
    else if (H === "visor") add(MF.gWedge("head", "WIDE VISOR HEAD", "armor", [0, hy, 0], hs * 1.45, hs * 0.38, hs * 0.82, 0.9, 0, 0));
    else if (H === "crestHelm") add(MF.gWedge("head", "CRESTED HELM", "armor", [0, hy, 0], hs * 0.9, hs * 0.8, hs * 0.9, 0.72, 0, 0));
    else if (H === "sensorPod") add(MF.gDome("head", "SMALL SENSOR POD", "frame", [0, hy, 0], hs * 0.7, hs * 0.6, hs * 0.7));
    else if (H === "hood") add(MF.gWedge("head", "SLOPED HOOD", "armor", [0, hy, 0], hs * 1.14, hs * 0.6, hs * 1.0, 0.48, 0, hs * 0.3));
    if (H === "crestHelm") add(MF.gBlade("sigHead", "ETHER CREST", "armor",
      [0, hy + hs * 0.3, 0], [0, hy + hs * 1.45, -0.18], hs * 0.13, hs * 0.12));
    else add(MF.gNozzle("sigHead", "HEAD SENSOR / ANTENNA", "ew", [0, hy + hs * 0.48, hs * 0.28],
      "y", hs * 0.11, hs * 0.55, { flare: 1.1 }));
  }

  /* ---------------- shoulders ---------------- */
  const shoulder = (side, tag) => {
    const x = side * sx;
    if (SH === "pauldron") return MF.gWedge("shoulder" + tag, "ANGLED PAULDRON " + tag, "armor",
      [x, sy, 0], s.shoulderW * 0.62, s.shoulderH * 1.15, td * 0.9, 0.72, side * 0.1, 0);
    if (SH === "missileRack") return MF.gRack("shoulder" + tag, "SHOULDER MISSILE RACK " + tag, "weapon",
      [x, sy, 0], s.shoulderW * 0.6, s.shoulderH, td * 0.9, 3, 2);
    if (SH === "cannonPod") return MF.gPod("shoulder" + tag, "SHOULDER CANNON POD " + tag, "weapon",
      [x, sy, 0], "x", s.shoulderH * 0.52, s.shoulderW * 0.8);
    if (SH === "etherWing") return MF.gBlade("shoulder" + tag, "ETHER WING " + tag, "reactor",
      [x, sy, 0], [x + side * s.shoulderW * 0.9, sy + s.shoulderH * 1.5, -td * 0.5], s.shoulderW * 0.22, side * 0.3);
    if (SH === "spike") return MF.gBlade("shoulder" + tag, "SPIKED PAULDRON " + tag, "armor",
      [x, sy, 0], [x + side * s.shoulderW * 0.7, sy + s.shoulderH * 1.4, td * 0.2], s.shoulderW * 0.18, 0);
    if (SH === "smooth") return MF.gDome("shoulder" + tag, "SMOOTH SHOULDER CAP " + tag, "armor",
      [x, sy, 0], s.shoulderW * 0.55, s.shoulderH * 0.8, td * 0.86);
    rm("shoulder" + tag);
    return null;
  };
  [-1, 1].forEach((side, i) => {
    const d = shoulder(side, i === 0 ? "L" : "R"); if (d) add(d);
    add(MF.gRing("sigShoulder" + (i === 0 ? "L" : "R"), "SHOULDER HARDPOINT " + (i === 0 ? "L" : "R"),
      "actuator", [side * sx, sy - s.shoulderH * 0.52, 0], Math.min(0.34, s.shoulderH * 0.42),
      Math.min(0.18, s.shoulderH * 0.24), "x", 6));
  });

  /* ---------------- back / dorsal assembly ---------------- */
  const bz = -td / 2 - 0.34;
  if (B === "etherWings" || B === "jetWing") {
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R";
      add(MF.gBlade("sigBack" + tag, (B === "etherWings" ? "ETHER WING " : "JET WING ") + tag,
        "vent", [side * tw * 0.28, th * 0.22, bz],
        [side * tw * 1.28, th * (B === "etherWings" ? 0.86 : 0.58), bz - td * 0.7],
        tw * 0.26, side * tw * 0.16));
    });
    add(MF.gPod("backpack", "DORSAL REACTOR CORE", "reactor", [0, th * 0.18, bz], "z", tw * 0.24, td * 0.6));
  } else if (B === "boosterPack") {
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R";
      add(MF.gNozzle("sigBack" + tag, "VECTOR BOOSTER " + tag, "reactor",
        [side * tw * 0.32, th * 0.24, bz - 0.2], "z", 0.24, 0.66, { flare: 1.7, thrust: true }));
    });
    add(MF.gWedge("backpack", "BOOSTER PACK", "vent", [0, th * 0.12, bz], tw * 0.7, th * 0.5, 0.56, 0.82, 0, -0.12));
  } else if (B === "fusionBackpack") {
    [-1, 1].forEach((side, i) => {
      add(MF.gBlade("sigBack" + (i === 0 ? "L" : "R"), "HEAT FIN " + (i === 0 ? "L" : "R"), "vent",
        [side * tw * 0.36, th * 0.44, bz], [side * tw * 0.62, -th * 0.34, bz - 0.28], tw * 0.12, 0));
    });
    add(MF.gWedge("backpack", "FUSION BACKPACK", "reactor", [0, th * 0.12, bz], tw * 0.88, th * 0.72, 0.7, 0.86, 0, -0.1));
  } else if (B === "radiatorFins") {
    [-1, 1].forEach((side, i) => {
      add(MF.gBlade("sigBack" + (i === 0 ? "L" : "R"), "RADIATOR FIN " + (i === 0 ? "L" : "R"), "vent",
        [side * tw * 0.34, th * 0.62, bz], [side * tw * 0.78, -th * 0.28, bz - 0.36], tw * 0.18, side * 0.1));
    });
    add(MF.gRack("backpack", "VENT LOUVRE BANK", "vent", [0, th * 0.1, bz], tw * 0.66, th * 0.52, 0.42, 4, 3));
  } else if (B === "missileBox") {
    [-1, 1].forEach((side, i) => {
      add(MF.gRack("sigBack" + (i === 0 ? "L" : "R"), "DORSAL MISSILE CELLS " + (i === 0 ? "L" : "R"),
        "weapon", [side * tw * 0.3, th * 0.42, bz - 0.12], tw * 0.44, th * 0.36, 0.44, 3, 2));
    });
    add(MF.gWedge("backpack", "LRM LAUNCHER BOX", "weapon", [0, th * 0.3, bz], tw * 0.86, th * 0.62, 0.72, 0.9, 0, -0.12));
  } else if (B === "hoverDisc") {
    add(MF.gRing("backpack", "HOVER LIFT DISC", "reactor", [0, th * 0.06, bz - 0.1],
      tw * 0.72, tw * 0.46, "y", 10));
    [-1, 1].forEach((side, i) => {
      add(MF.gNozzle("sigBack" + (i === 0 ? "L" : "R"), "LIFT THRUSTER " + (i === 0 ? "L" : "R"),
        "vent", [side * tw * 0.4, -th * 0.1, bz - 0.1], "y", 0.2, 0.5, { flare: 1.5, thrust: true }));
    });
  } else {
    rm("backpack");
    [-1, 1].forEach((side, i) => {
      add(MF.gNozzle("sigBack" + (i === 0 ? "L" : "R"), "CLEAN BACK VENT " + (i === 0 ? "L" : "R"),
        "vent", [side * tw * 0.26, th * 0.18, bz], "z", 0.13, 0.34, { flare: 1.3 }));
    });
  }

  /* ---------------- arms / weapons ---------------- */
  const wz = td / 2 + 0.35;
  if (F === "hover" || F === "flyer" || F === "tank") {
    ["upperArmL", "upperArmR", "foreArmL", "foreArmR", "jointL", "jointR"].forEach(rm);
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R";
      if (F === "flyer") {
        add(MF.gBlade("sigArm" + tag, "MAIN WING " + tag, "vent",
          [side * tw * 0.3, th * 0.2, 0],
          [side * tw * 2.05, th * 0.52, -td * 1.15], tw * 0.34, side * tw * 0.28));
        add(MF.gNozzle("weapon" + tag, "WINGTIP POD " + tag, "weapon",
          [side * tw * 2.0, th * 0.5, -td * 1.1], "z", 0.18, 0.9, { flare: 1.2 }));
      } else if (F === "tank") {
        add(MF.gPod("sigArm" + tag, "SIDE SPONSON " + tag, "armor",
          [side * tw * 0.92, -th * 0.05, 0], "z", th * 0.30, td * 1.1));
        add(MF.gNozzle("weapon" + tag, "TURRET BARREL " + tag, "weapon",
          [side * tw * 0.42, th * 0.44, td * 0.55], "z", 0.22, 1.5, { flare: 0.9 }));
      } else {
        add(MF.gBlade("sigArm" + tag, "HOVER WING POD " + tag, "vent",
          [side * tw * 0.45, th * 0.1, 0], [side * tw * 1.3, th * 0.34, -td * 0.7],
          tw * 0.24, side * 0.22));
        add(MF.gNozzle("weapon" + tag, "POD MOUNT " + tag, "weapon",
          [side * tw * 0.9, 0, td * 0.4], "z", 0.16, 0.7, { flare: 1.2 }));
      }
    });
  } else {
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R", wx = side * s.weaponX, wy = s.weaponY - th / 2;
      const ax = side * sx;
      /* the limb itself changes with the arm part, not just the weapon */
      if (A === "blade" || A === "slim") {
        add(MF.gHull("upperArm" + tag, "SLIM UPPER ARM " + tag, "actuator",
          [ax, armY, 0], 0.28, s.upperArm, 0.28, { sections: 3, top: 0.9, bot: 0.72 }));
        add(MF.gWedge("foreArm" + tag, "LONG FOREARM " + tag, "actuator",
          [ax, foreY, 0.05], 0.30, s.foreArm * 1.12, 0.30, 0.62, side * 0.08, 0));
      } else if (A === "cannon") {
        add(MF.gHull("upperArm" + tag, "HEAVY UPPER ARM " + tag, "actuator",
          [ax, armY, 0], 0.62, s.upperArm * 0.82, 0.62, { sections: 3, top: 1.1, bot: 0.9 }));
        add(MF.gPod("foreArm" + tag, "RECOIL FOREARM " + tag, "weapon",
          [ax, foreY, 0.05], "y", 0.34, s.foreArm * 0.8));
      } else if (A === "shieldDisc") {
        add(MF.gHull("upperArm" + tag, "BRACED UPPER ARM " + tag, "actuator",
          [ax, armY, 0], 0.5, s.upperArm, 0.5, { sections: 3, top: 1, bot: 0.85 }));
        if (i === 0) add(MF.gBlade("foreArmL", "SHIELD FOREARM PLATE L", "armor",
          [ax, foreY + s.foreArm * 0.35, td * 0.25],
          [ax - 0.18, foreY - s.foreArm * 0.6, td * 0.5], s.shoulderW * 0.26, -0.1));
        else add(MF.gWedge("foreArmR", "FOREARM R", "actuator",
          [ax, foreY, 0.05], 0.42, s.foreArm, 0.42, 0.8, side * 0.05, 0));
      } else if (A === "twinPod") {
        add(MF.gRack("foreArm" + tag, "POD FOREARM " + tag, "weapon",
          [ax, foreY, 0.05], 0.54, s.foreArm * 0.78, 0.54, 2, 3));
        add(MF.gHull("upperArm" + tag, "UPPER ARM " + tag, "actuator",
          [ax, armY, 0], 0.44, s.upperArm, 0.44, { sections: 3, top: 1, bot: 0.8 }));
      } else if (A === "claw") {
        add(MF.gPod("foreArm" + tag, "CLAW FOREARM " + tag, "weapon",
          [ax, foreY, 0.05], "y", 0.30, s.foreArm * 0.75));
      }
      if (A === "blade") {
        add(MF.gBlade("weapon" + tag, "ENERGY BLADE " + tag, "weapon",
          [wx, foreY, wz], [wx + side * 0.35, foreY - s.foreArm * 0.9, wz + 0.5], 0.16, side * 0.22));
        add(MF.gBlade("sigArm" + tag, "BLADE EDGE " + tag, "weapon",
          [wx + side * 0.1, foreY - 0.1, wz], [wx + side * 0.3, foreY - s.foreArm * 0.8, wz + 0.42], 0.07, 0));
      } else if (A === "shieldDisc") {
        add(MF.gRing("weapon" + tag, "VORTEX SHIELD DISC " + tag, "armor",
          [wx + side * 0.22, wy, wz + 0.3], 0.62, 0.18, "z", 12));
        add(MF.gBlade("sigArm" + tag, "SHIELD RIB " + tag, "armor",
          [wx, foreY, wz], [wx + side * 0.1, foreY - s.foreArm * 0.55, wz + 0.25], 0.1, 0));
      } else if (A === "cannon") {
        add(MF.gNozzle("weapon" + tag, "HEAVY CANNON " + tag, "weapon",
          [wx, wy, wz], "z", 0.32, 1.5, { flare: 0.9 }));
        add(MF.gPod("sigArm" + tag, "CANNON BREECH " + tag, "weapon",
          [wx, foreY, wz], "z", 0.34, s.foreArm * 0.7));
      } else if (A === "claw") {
        [0, 1, 2].forEach((k) => {
          const anchor = "sigArm" + tag + (k === 0 ? "" : (k + 1));
          add(MF.gBlade(anchor, "CLAW DIGIT " + tag + k, "weapon",
            [wx, foreY, wz], [wx + side * (0.18 + k * 0.14), foreY - s.foreArm * 0.7, wz + 0.28 + k * 0.16], 0.07, side * 0.08));
        });
        add(MF.gPod("weapon" + tag, "CLAW BASE " + tag, "weapon", [wx, foreY, wz], "z", 0.26, s.foreArm * 0.5));
      } else if (A === "twinPod") {
        add(MF.gRack("weapon" + tag, "TWIN MISSILE POD " + tag, "weapon",
          [wx, wy, wz], 0.62, 0.62, 0.9, 2, 2));
        add(MF.gRack("sigArm" + tag, "POD CELLS " + tag, "weapon",
          [wx, foreY, wz + 0.1], 0.5, 0.46, 0.5, 2, 2));
      } else if (A === "slim") {
        add(MF.gNozzle("weapon" + tag, "STRIKER MOUNT " + tag, "weapon",
          [wx, wy, wz], "z", 0.15, 0.9, { flare: 1.05 }));
        add(MF.gBlade("sigArm" + tag, "FOREARM SPAR " + tag, "actuator",
          [wx, foreY, wz], [wx, foreY - s.foreArm * 0.7, wz], 0.07, 0));
      } else {
        add(MF.gNozzle("weapon" + tag, "WEAPON MOUNT " + tag, "weapon",
          [wx, wy, wz], "z", 0.24, 1.35, { flare: 1.15 }));
        add(MF.gPod("sigArm" + tag, "FOREARM ACTUATOR " + tag, "actuator",
          [wx, foreY, wz], "z", 0.22, s.foreArm * 0.6));
      }
    });
  }

  /* ---------------- legs / body plan ---------------- */
  const legPlan = (F === "hover" || L === "hoverSkirt") ? "hover" :
    (F === "spider" || L === "spiderLegs") ? "spider" :
    (F === "tetrapod" || L === "tetrapodLegs") ? "tetrapod" : L;
  if (F === "flyer") {
    rm("upperLegL"); rm("upperLegR"); rm("lowerLegL"); rm("lowerLegR");
    rm("footL"); rm("footR"); rm("extraLegL"); rm("extraLegR");
    add(MF.gBlade("hip", "VENTRAL KEEL", "frame",
      [0, hipY + 0.1, 0], [0, footY + 0.25, -td * 0.7], tw * 0.22, -0.2));
    add(MF.gBlade("sigLegL", "VENTRAL FIN L", "vent",
      [-tw * 0.28, hipY, -td * 0.2], [-tw * 0.8, footY + 0.15, -td * 0.9], tw * 0.16, -0.12));
    add(MF.gBlade("sigLegR", "VENTRAL FIN R", "vent",
      [tw * 0.28, hipY, -td * 0.2], [tw * 0.8, footY + 0.15, -td * 0.9], tw * 0.16, 0.12));
  } else if (F === "tank") {
    rm("upperLegL"); rm("upperLegR"); rm("lowerLegL"); rm("lowerLegR");
    rm("footL"); rm("footR"); rm("extraLegL"); rm("extraLegR");
    add(MF.gWedge("hip", "HULL BASE", "armor",
      [0, hipY + 0.16, 0], tw * 1.72, th * 0.36, td * 1.4, 0.94, 0, 0));
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R";
      add(MF.gPod("sigLeg" + tag, "TREAD POD " + tag, "armor",
        [side * tw * 0.86, footY + 0.36, 0], "z", th * 0.32, td * 1.7));
      add(MF.gRing("sigLeg" + tag + "2", "DRIVE SPROCKET " + tag, "actuator",
        [side * tw * 0.86, footY + 0.36, td * 0.85], th * 0.30, th * 0.14, "z", 10));
    });
  } else if (legPlan === "hover") {
    rm("upperLegL"); rm("upperLegR"); rm("lowerLegL"); rm("lowerLegR");
    rm("footL"); rm("footR"); rm("extraLegL"); rm("extraLegR");
    add(MF.gPod("hip", "LIFT CORE", "reactor", [0, hipY + 0.2, 0], "y", tw * 0.40, s.upperLeg * 0.9));
    add(MF.gRing("sigLegL", "HOVER SKIRT OUTER", "vent",
      [0, footY + 0.52, 0], tw * 1.02, tw * 0.48, "y", 14));
    add(MF.gRing("sigLegR", "HOVER SKIRT INNER", "reactor",
      [0, footY + 0.26, 0], tw * 0.68, tw * 0.30, "y", 12));
  } else if (legPlan === "spider" || legPlan === "tetrapod") {
    const wide = legPlan === "spider" ? 1.55 : 1.30;
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R";
      /* forward pair (narrow) */
      add(MF.gHull("upperLeg" + tag, "FRONT UPPER LEG " + tag, "actuator",
        [side * lx * 0.82, ulY + s.upperLeg * 0.10, td * 0.12], 0.58, s.upperLeg * 0.86, 0.58,
        { sections: 4, top: 1.08, bot: 0.76, dx: side * 0.22, dz: 0.25 }));
      add(MF.gHull("lowerLeg" + tag, "FRONT LOWER LEG " + tag, "actuator",
        [side * lx * 1.02, llY, td * 0.28], 0.56, s.lowerLeg * 1.02, 0.56,
        { sections: 4, top: 0.96, bot: 0.62, dz: 0.35, dx: side * 0.18 }));
      add(MF.gWedge("foot" + tag, "FRONT CLAW FOOT " + tag, "armor",
        [side * lx * 1.08, footY, td * 0.42], 0.86, 0.24, s.footL * 0.9, 0.5, side * 0.16, 0));
      /* rear pair (wide) — two extra leg columns visible in front elevation */
      add(MF.gHull("extraLeg" + tag, "REAR LEG " + tag, "actuator",
        [side * lx * wide * 1.85, ulY, -td * 0.88], 0.54, s.upperLeg + s.lowerLeg, 0.54,
        { sections: 5, top: 1.06, bot: 0.48, dz: -0.68, dx: side * 0.6 }));
      add(MF.gBlade("sigLeg" + tag, "REAR STABILISER " + tag, "actuator",
        [side * lx * wide * 1.3, ulY, -td * 0.95],
        [side * lx * wide * 2.15, footY - 0.25, -td * 1.3], 0.18, side * 0.24));
    });
  } else if (legPlan === "heavy") {
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R";
      add(MF.gHull("upperLeg" + tag, "HEAVY UPPER LEG " + tag, "actuator",
        [side * lx * 1.1, ulY + s.upperLeg * 0.2, 0], 0.82, s.upperLeg * 0.72, 0.82,
        { sections: 3, top: 1.12, bot: 0.92 }));
      add(MF.gHull("lowerLeg" + tag, "HEAVY LOWER LEG " + tag, "actuator",
        [side * lx * 1.1, llY + s.lowerLeg * 0.2, 0], 0.88, s.lowerLeg * 0.72, 0.88,
        { sections: 3, top: 1.02, bot: 0.86 }));
      add(MF.gWedge("foot" + tag, "WIDE FOOT " + tag, "armor",
        [side * lx * 1.1, footY, s.footL * 0.22], 1.05, 0.3, s.footL * 1.2, 0.9, 0, 0));
      add(MF.gRing("sigLeg" + tag, "KNEE ACTUATOR " + tag, "actuator",
        [side * lx * 1.1, ulY - s.upperLeg * 0.2, 0], 0.4, 0.2, "x", 8));
    });
  } else {
    const rj = (legPlan === "reverseJoint" || legPlan === "digitigrade") ? 0.66 : -0.12;
    [-1, 1].forEach((side, i) => {
      const tag = i === 0 ? "L" : "R";
      add(MF.gHull("upperLeg" + tag, "UPPER LEG " + tag, "actuator",
        [side * lx, ulY, 0], 0.55, s.upperLeg, 0.55,
        { sections: 4, top: 1.05, bot: 0.8, dz: rj * 0.4 }));
      add(MF.gHull("lowerLeg" + tag, "LOWER LEG " + tag, "actuator",
        [side * lx, llY, rj * 0.35], 0.6, s.lowerLeg, 0.6,
        { sections: 4, top: 0.95, bot: 0.7, dz: -rj * 0.55 }));
      add(MF.gWedge("foot" + tag, "FOOT " + tag, "armor",
        [side * lx, footY, s.footL * 0.18], 0.78, 0.26, s.footL, 0.82, side * 0.06, 0));
      if (rj > 0) add(MF.gBlade("sigLeg" + tag, "HOCK SPUR " + tag, "actuator",
        [side * lx, llY + s.lowerLeg * 0.2, -rj * 0.45],
        [side * lx * 1.18, llY - s.lowerLeg * 0.28, -rj * 0.7], 0.13, side * 0.12));
      else add(MF.gRing("sigLeg" + tag, "KNEE ACTUATOR " + tag, "actuator",
        [side * lx, ulY - s.upperLeg / 2, 0], 0.32, 0.16, "x", 8));
    });
  }

  /* ---------------- accent extras ---------------- */
  const extraDefs = {
    crest: () => MF.gBlade("sigExtra", "CREST / COMMS FIN", "armor",
      [0, th / 2 + hs * 0.9, -0.1], [0, th / 2 + hs * 1.9, -0.35], hs * 0.14, 0.16),
    shield: () => MF.gBlade("sigExtra", "TOWER SHIELD", "armor",
      [-tw * 0.72, th * 0.55, td * 0.45], [-tw * 1.12, -th * 0.5, td * 0.6], tw * 0.3, -0.2),
    blade: () => MF.gBlade("sigExtra", "HIP ENERGY BLADE", "weapon",
      [tw * 0.55, -th * 0.25, td * 0.3], [tw * 1.25, -th * 0.9, td * 0.6], 0.13, 0.18),
    antenna: () => MF.gNozzle("sigExtra", "ANTENNA MAST", "ew",
      [tw * 0.28, th * 0.54, -td * 0.2], "y", 0.06, th * 0.7, { flare: 1.2 }),
    skirt: () => MF.gBlade("sigExtra", "ARMOUR SKIRT", "armor",
      [0, -th * 0.42, td * 0.3], [0, -th * 0.42 - s.upperLeg * 0.9, td * 0.75], tw * 0.34, 0.1),
    tail: () => MF.gBlade("sigExtra", "STABILISER TAIL", "actuator",
      [0, -th * 0.1, -td * 0.6], [0, -th * 0.5, -td * 1.9], 0.16, -0.3),
    winglets: () => MF.gBlade("sigExtra", "HIP WINGLETS", "vent",
      [tw * 0.5, -th * 0.15, -td * 0.3], [tw * 1.1, th * 0.28, -td * 0.95], tw * 0.2, 0.1),
    missilePods: () => MF.gRack("sigExtra", "HIP MISSILE PODS", "weapon",
      [tw * 0.62, -th * 0.2, td * 0.4], tw * 0.42, th * 0.3, 0.44, 2, 2),
    halo: () => MF.gRing("sigExtra", "REACTOR HALO", "reactor",
      [0, th * 0.1, -td * 0.7], tw * 0.62, tw * 0.44, "z", 12),
    spikes: () => MF.gBlade("sigExtra", "ARMOUR SPIKES", "armor",
      [tw * 0.42, th * 0.38, td * 0.2], [tw * 1.05, th * 0.72, td * 0.5], tw * 0.16, 0.1)
  };
  E.slice(0, 3).forEach((id, i) => {
    const f = extraDefs[id]; if (!f) return;
    const d = f();
    d.anchor = i === 0 ? "sigExtra" : "sigExtra" + (i + 1);
    add(d);
  });
  return out;
};
