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
  return out;
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
    ctx.globalAlpha = o.alpha === undefined ? 0.22 : o.alpha;
    ctx.fillStyle = color;
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
  if (o.filled) { ctx.globalAlpha = o.alpha === undefined ? 0.18 : o.alpha; ctx.fillStyle = color;
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
  const boxes = MF.shapeParts(shape);
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
      selected: o.highlight === b.anchor, color: o.color, strokeAlpha: o.strokeAlpha });
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
  const reactor = geo.reactor || { x: 0, y: 0, z: 0 };
  const centers = {};
  parts.forEach((p) => {
    const b = geo[p.anchor] || { x: 0, y: 0, z: 0, w: 0.4, h: 0.4, d: 0.4 };
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
  parts.forEach((p) => {
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
      const part = parts.find((pp) => pp.anchor === x.b.anchor);
      const inManifest = !!manifest[x.b.anchor];
      MF.draw.part(ctx, x.b, P, {
        filled: !compact && layers.internals && inManifest, alpha: 0.07,
        selected: !compact && x.b.anchor === selectedAnchor,
        strokeAlpha: compact ? 0.85 : (inManifest ? 0.88 : 0.34),
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
    parts.forEach((p, i) => {
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
    parts.forEach((p) => {
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
    ctx.fillText("SLEEK MECH WIREFRAME · FIT / POWER / HEAT TRANSFER · " +
      String(shape.style).toUpperCase() + " · " + parts.length + " MOUNTING BAYS", 7, 13);
    ctx.fillStyle = "#ffb347"; ctx.font = "9px monospace";
    ctx.fillText("STEP " + step + " / " + parts.length +
      " · CLICK A PART TO INSPECT INTERNALS · CYAN=BUS  ORANGE=HEAT  GREEN=COOLANT", 7, h - 7);
  } else {
    ctx.fillStyle = "#4dd0e1"; ctx.font = "7px monospace"; ctx.fillText("MECH", 3, 8);
  }
  return hit;
};
