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

/* ------------------------------------------------------------------ parametric shape -> boxes */
MF.shapeParts = function (s) {
  const b = [];
  const add = (anchor, name, x, y, z, w, h, d, group) => b.push({ anchor, name, x, y, z, w, h, d, group });
  const th = s.torsoH, tw = s.torsoW, td = s.torsoD;
  add("torso", "TORSO", 0, 0, 0, tw, th, td, "armor");
  add("head", "HEAD", 0, th / 2 + s.headScale * 0.34, 0, s.headScale * 0.9, s.headScale * 0.72, s.headScale * 0.9, "frame");
  add("backpack", "PACK", 0, th * 0.08, -td / 2 - 0.3, tw * 0.6, th * 0.5, 0.55, "vent");
  add("reactor", "REACTOR", 0, -th * 0.1, td / 2 + 0.22, tw * 0.42, th * 0.32, 0.42, "reactor");
  const sx = tw / 2 + s.shoulderW * 0.26, sy = th * 0.28;
  add("shoulderL", "SHOULDER L", -sx, sy, 0, s.shoulderW * 0.55, s.shoulderH, td * 0.85, "armor");
  add("shoulderR", "SHOULDER R", sx, sy, 0, s.shoulderW * 0.55, s.shoulderH, td * 0.85, "armor");
  const armY = sy - s.shoulderH / 2 - s.upperArm / 2;
  add("upperArmL", "UPPER ARM L", -sx, armY, 0, 0.42, s.upperArm, 0.42, "actuator");
  add("upperArmR", "UPPER ARM R", sx, armY, 0, 0.42, s.upperArm, 0.42, "actuator");
  const foreY = armY - s.upperArm / 2 - s.foreArm / 2;
  add("foreArmL", "FOREARM L", -sx, foreY, 0, 0.5, s.foreArm, 0.5, "actuator");
  add("foreArmR", "FOREARM R", sx, foreY, 0, 0.5, s.foreArm, 0.5, "actuator");
  add("weaponL", "WEAPON L", -s.weaponX, s.weaponY - th / 2, td / 2 + 0.35, 0.5, 0.5, 1.35, "weapon");
  add("weaponR", "WEAPON R", s.weaponX, s.weaponY - th / 2, td / 2 + 0.35, 0.5, 0.5, 1.35, "weapon");
  add("hip", "HIP", 0, -th / 2 - 0.22, 0, s.hipW, 0.38, td * 0.8, "frame");
  const lx = s.legStance * 0.55, hipY = -th / 2 - 0.4;
  const ulY = hipY - s.upperLeg / 2;
  add("upperLegL", "UPPER LEG L", -lx, ulY, 0, 0.55, s.upperLeg, 0.55, "actuator");
  add("upperLegR", "UPPER LEG R", lx, ulY, 0, 0.55, s.upperLeg, 0.55, "actuator");
  const llY = ulY - s.upperLeg / 2 - s.lowerLeg / 2;
  add("lowerLegL", "LOWER LEG L", -lx, llY, 0, 0.6, s.lowerLeg, 0.6, "actuator");
  add("lowerLegR", "LOWER LEG R", lx, llY, 0, 0.6, s.lowerLeg, 0.6, "actuator");
  const footY = llY - s.lowerLeg / 2 - 0.14;
  add("footL", "FOOT L", -lx, footY, s.footL * 0.18, 0.75, 0.28, s.footL, "armor");
  add("footR", "FOOT R", lx, footY, s.footL * 0.18, 0.75, 0.28, s.footL, "armor");
  if (s.jetCount > 0) {
    add("jetL", "JET L", -tw * 0.3, th * 0.18, -td / 2 - 0.55, 0.38, 0.5, 0.45, "vent");
    add("jetR", "JET R", tw * 0.3, th * 0.18, -td / 2 - 0.55, 0.38, 0.5, 0.45, "vent");
  }
  if (s.armorFlare > 0.4) {
    add("flareL", "FLARE L", -tw * 0.7, th * 0.2, td * 0.2, 0.3 * s.armorFlare, th * 0.6, 0.5, "armor");
    add("flareR", "FLARE R", tw * 0.7, th * 0.2, td * 0.2, 0.3 * s.armorFlare, th * 0.6, 0.5, "armor");
  }
  if (s.style === "spider" || s.style === "tetrapod") {
    const ex = s.legStance * 0.95;
    add("extraLegL", "REAR LEG L", -ex, ulY, -td * 0.6, 0.52, s.upperLeg + s.lowerLeg, 0.52, "actuator");
    add("extraLegR", "REAR LEG R", ex, ulY, -td * 0.6, 0.52, s.upperLeg + s.lowerLeg, 0.52, "actuator");
  }
  if (s.style === "knight") {
    add("crest", "CREST", 0, th / 2 + s.headScale * 0.8, 0, 0.18, s.headScale * 0.9, 0.5, "armor");
    add("shield", "SHIELD", -tw * 0.75, -th * 0.05, td * 0.4, 0.3, th * 0.9, td * 0.7, "armor");
  }
  return b;
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
    const r = MF.draw.box(ctx, bb, P, { filled: !!o.filled, alpha: o.alpha,
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

/* ------------------------------------------------------------------ teardown exploded view */
MF.draw.teardown = function (canvas, shape, parts, step, selectedAnchor, opts) {
  const o = opts || {};
  const hit = MF.draw.shapeOn(canvas, shape, {
    view: "orbit", yaw: o.yaw === undefined ? 0.45 : o.yaw, pitch: 0.16,
    explode: step * (DATA.teardowns.explode.stepScale || 0.4),
    directions: DATA.teardowns.explode.directions,
    highlight: selectedAnchor, labels: true, label: "EXPLODED WIREFRAME · STEP " + step,
    dimensions: false, gridStep: 28, strokeAlpha: 0.95
  });
  const f = MF.fit(canvas, true);
  if (f) {
    const { ctx, w, h } = f;
    // Overlay part labels without clearing the exploded wireframe.
    parts.forEach((p, i) => {
      const box = hit.find((x) => x.anchor === p.anchor);
      if (!box) return;
      const r = box.rect;
      if (r.x > w || r.y > h || r.x + r.w < 0 || r.y + r.h < 0) return;
      ctx.fillStyle = p.anchor === selectedAnchor ? "#ffb347" : "#5e8ba3";
      ctx.font = "8.5px monospace";
      ctx.fillText(String(i + 1) + " " + p.name.slice(0, 15), r.x, Math.max(10, r.y - 2));
    });
    ctx.fillStyle = "#ffb347"; ctx.font = "10px monospace";
    ctx.fillText("STEP " + step + " / " + parts.length + "   ·   CLICK A PART TO INSPECT INTERNALS", 7, h - 7);
  }
  return hit;
};
