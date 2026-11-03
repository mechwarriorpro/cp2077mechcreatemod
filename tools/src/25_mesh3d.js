/* PROCEDURAL 3D — software rasterizer for the full pilot test.
   Every triangle is generated at runtime from MF.shapeParts() + MF.sigGeometry()
   descriptors. Terrain is seeded value noise. No WebGL, no meshes, no textures,
   no external assets, no animation files. */

MF.mesh3d = {};

/* ---------------------------------------------------------- deterministic noise */
MF.mesh3d.hash = function (a, b, c) {
  let x = Math.sin(a * 127.1 + b * 311.7 + (c || 0) * 74.7) * 43758.5453;
  return x - Math.floor(x);
};
MF.mesh3d.smooth = function (t) { return t * t * (3 - 2 * t); };
MF.mesh3d.noise2 = function (x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z), tx = MF.mesh3d.smooth(x - xi), tz = MF.mesh3d.smooth(z - zi);
  const h = (a, b) => MF.mesh3d.hash(a, b, seed);
  const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1);
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
};
MF.mesh3d.terrain = function (seed, cfg) {
  cfg = cfg || {};
  const size = cfg.size || 320, cell = cfg.cell || 16, amp = cfg.amplitude || 2.6;
  const rough = cfg.roughness === undefined ? 0.55 : cfg.roughness;
  const height = (x, z) => {
    const s = 0.022;
    const n = MF.mesh3d.noise2(x * s + 11, z * s + 7, seed) * 0.6 +
      MF.mesh3d.noise2(x * s * 2.7 + 31, z * s * 2.7 + 3, seed + 17) * 0.3 +
      MF.mesh3d.noise2(x * s * 6.1 + 5, z * s * 6.1 + 19, seed + 91) * 0.1;
    const d = Math.sqrt(x * x + z * z) / (size * 0.5);
    return (n - 0.5) * amp * (0.55 + rough) * (1 + Math.max(0, d - 0.65) * 3.2);
  };
  const obstacles = [];
  const count = cfg.obstacles || 22;
  for (let i = 0; i < count; i++) {
    const a = MF.mesh3d.hash(i, 3, seed) * Math.PI * 2;
    const r = 26 + MF.mesh3d.hash(i, 9, seed) * (size * 0.34);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    obstacles.push({ x, z, r: 1.6 + MF.mesh3d.hash(i, 21, seed) * 2.6,
      h: 3 + MF.mesh3d.hash(i, 33, seed) * 7, seed: i });
  }
  return { seed, size, cell, amp, height, obstacles };
};

/* ---------------------------------------------------------- colour / material */
function m3Hex(hex) {
  let s = String(hex || "#3AA9C9").replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function m3Hsl(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
MF.mesh3d.coatMaterials = function (coat) {
  const p = m3Hex(coat.primary), s = m3Hex(coat.secondary);
  const l = m3Hsl(coat.lightHue, 0.85, 0.62);
  const metal = Number(coat.metallic || 0) , rough = Number(coat.roughness || 0.3);
  const emit = Number(coat.emission || 0.4), bright = Number(coat.lightsBrightness || 0.8);
  const asp = coat.aspect || "metallic";
  const boost = asp === "glossy" ? 1.35 : asp === "crystal" ? 1.6 : asp === "matte" ? 0.4 : 1;
  const mix = (a, b, t) => [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t, a[2] * (1 - t) + b[2] * t];
  return {
    frame: { rgb: p, metal: metal * boost, emit: 0, rough: rough },
    armor: { rgb: mix(p, s, 0.16), metal: metal * boost, emit: 0, rough: rough },
    actuator: { rgb: mix(s, p, 0.18), metal: metal * 0.8, emit: 0, rough: rough + 0.15 },
    vent: { rgb: mix(s, l, 0.22), metal: metal * 0.9, emit: emit * 0.25 * bright, rough: rough },
    weapon: { rgb: mix(s, [18, 22, 28], 0.45), metal: metal, emit: emit * 0.4 * bright, rough: 0.3 },
    reactor: { rgb: l, metal: 0.4, emit: emit * bright, rough: 0.2 },
    coolant: { rgb: mix(l, [80, 220, 150], 0.5), metal: 0.3, emit: emit * 0.8 * bright, rough: 0.25 },
    ew: { rgb: mix(l, s, 0.4), metal: 0.6, emit: emit * 0.7 * bright, rough: 0.3 },
    sensor: { rgb: l, metal: 0.5, emit: emit * bright, rough: 0.2 },
    default: { rgb: p, metal: metal, emit: 0, rough: rough }
  };
};

/* ---------------------------------------------------------- bone classification */
MF.mesh3d.boneOf = function (anchor) {
  const a = String(anchor || "");
  const right = /R$|_R|Right|2R/.test(a);
  if (/^head|^sensor|^crest|^sigHead/.test(a)) return "head";
  if (/^backpack|^sigBack|^flare|^jet|^radiator|^vent|^thruster|^jumpJet/.test(a)) return "back";
  if (/^shoulder|^sigShoulder/.test(a)) return right ? "shoulderR" : "shoulderL";
  if (/^upperArm|^foreArm|^joint|^weapon|^sigArm/.test(a)) return right ? "armR" : "armL";
  if (/^upperLeg|^lowerLeg|^knee|^foot|^extraLeg|^sigLeg|^hip/.test(a)) return right ? "legR" : "legL";
  return "body";
};

/* ---------------------------------------------------------- descriptor → triangles */
MF.mesh3d.fromShape = function (shape, o) {
  o = o || {};
  const parts = MF.shapeParts(shape).filter((b) => !b.internal);
  const step = o.lowPoly ? 4 : 2;   // take every Nth point of an 8-point chamfered ring
  const tris = [];
  const face = (a, b, c, group, anchor) => {
    if (!a || !b || !c) return;
    tris.push({ v: [a, b, c], group: group || "frame", bone: MF.mesh3d.boneOf(anchor),
      var: MF.mesh3d.hash(a[0] * 3 + b[1] * 5, c[2] * 7 + a[1], a[2] * 11) });
  };
  const quad = (a, b, c, d, group, anchor) => { face(a, b, c, group, anchor); face(a, c, d, group, anchor); };
  const ringsMesh = (rings, group, anchor) => {
    const n = rings[0].length;
    const idx = [];
    for (let i = 0; i < n; i += step) idx.push(i);
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < idx.length; i++) {
        const j = (i + 1) % idx.length, a = rings[r][idx[i]], b = rings[r][idx[j]],
          c = rings[r + 1][idx[j]], d = rings[r + 1][idx[i]];
        quad(a, b, c, d, group, anchor);
      }
    }
    [rings[0], rings[rings.length - 1]].forEach((ring) => {
      const cx = ring.reduce((s, p) => s + p[0], 0) / n,
        cy = ring.reduce((s, p) => s + p[1], 0) / n,
        cz = ring.reduce((s, p) => s + p[2], 0) / n;
      for (let i = 0; i < idx.length; i++) {
        const j = (i + 1) % idx.length;
        face([cx, cy, cz], ring[idx[i]], ring[idx[j]], group, anchor);
      }
    });
  };
  const boxMesh = (c, w, h, d, group, anchor) => {
    const x = w / 2, y = h / 2, z = d / 2;
    const P = (a, b, e) => [c[0] + a * x, c[1] + b * y, c[2] + e * z];
    const A = P(-1, -1, -1), B = P(1, -1, -1), C = P(1, 1, -1), D = P(-1, 1, -1);
    const E = P(-1, -1, 1), F = P(1, -1, 1), G = P(1, 1, 1), H = P(-1, 1, 1);
    quad(A, B, C, D, group, anchor); quad(F, E, H, G, group, anchor);
    quad(B, F, G, C, group, anchor); quad(E, A, D, H, group, anchor);
    quad(D, C, G, H, group, anchor); quad(E, F, B, A, group, anchor);
  };

  parts.forEach((b) => {
    const g = b.group || "frame";
    if (b.type === "hull" && b.rings && b.rings.length > 1) {
      ringsMesh(b.rings, g, b.anchor);
    } else if (b.type === "dome") {
      const c = b.center, rx = b.w / 2, ry = b.h / 2, rz = b.d / 2, lat = 4, lon = 8;
      const pt = (a, t) => [c[0] + Math.cos(a) * rx * Math.sqrt(1 - t * t),
        c[1] + t * ry, c[2] + Math.sin(a) * rz * Math.sqrt(1 - t * t)];
      for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
        const a1 = j * Math.PI * 2 / lon, a2 = (j + 1) * Math.PI * 2 / lon,
          t1 = -1 + 2 * i / lat, t2 = -1 + 2 * (i + 1) / lat;
        quad(pt(a1, t1), pt(a2, t1), pt(a2, t2), pt(a1, t2), g, b.anchor);
      }
    } else if (b.type === "blade") {
      const root = b.root, tip = b.tip, w = b.width;
      const dx = tip[0] - root[0], dy = tip[1] - root[1], dz = tip[2] - root[2];
      let px = -dz, py = 0, pz = dx;
      const len = Math.sqrt(px * px + pz * pz) || 1;
      px = px / len * w; pz = pz / len * w;
      const r1 = [root[0] + px, root[1] + py, root[2] + pz], r2 = [root[0] - px, root[1] - py, root[2] - pz];
      const t1 = [tip[0] + px * 0.55 + (b.curve || 0), tip[1], tip[2] + pz * 0.55],
        t2 = [tip[0] - px * 0.55 + (b.curve || 0), tip[1], tip[2] - pz * 0.55];
      quad(r1, r2, t2, t1, g, b.anchor);
      quad(r2, r1, t1, t2, g, b.anchor);
      face(r1, [root[0], root[1] + dy * 0.02, root[2]], r2, g, b.anchor);
    } else if (b.type === "fin" && b.quad) {
      const q = b.quad;
      quad(q[0], q[1], q[2], q[3], g, b.anchor);
      quad(q[3], q[2], q[1], q[0], g, b.anchor);
    } else if (b.type === "ring") {
      const c = b.center, R = b.radius, r = b.inner, n = Math.min(8, b.spokes || 8), axis = b.axis || "z";
      const pt = (a, rad, off) => {
        const u = Math.cos(a) * rad, v = Math.sin(a) * rad;
        return axis === "y" ? [c[0] + u, c[1] + off, c[2] + v] :
          axis === "x" ? [c[0] + off, c[1] + u, c[2] + v] : [c[0] + u, c[1] + v, c[2] + off];
      };
      for (let i = 0; i < n; i++) {
        const a1 = i * Math.PI * 2 / n, a2 = (i + 1) * Math.PI * 2 / n;
        quad(pt(a1, R, 0), pt(a2, R, 0), pt(a2, r, 0), pt(a1, r, 0), g, b.anchor);
        quad(pt(a1, r, 0.12), pt(a2, r, 0.12), pt(a2, R, 0.12), pt(a1, R, 0.12), g, b.anchor);
      }
    } else if (b.type === "rack") {
      boxMesh(b.center, b.w, b.h, b.d, g, b.anchor);
      const cols = b.cols || 3, rows = b.rows || 2, z = b.center[2] + b.d / 2 + 0.01;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const cw = b.w / cols * 0.72, ch = b.h / rows * 0.72;
        const cx = b.center[0] - b.w / 2 + b.w / cols * (i + 0.5);
        const cy = b.center[1] - b.h / 2 + b.h / rows * (j + 0.5);
        quad([cx - cw / 2, cy - ch / 2, z], [cx + cw / 2, cy - ch / 2, z],
          [cx + cw / 2, cy + ch / 2, z], [cx - cw / 2, cy + ch / 2, z], "reactor", b.anchor);
      }
    } else if (b.type === "joint") {
      const c = b.center, r = b.radius;
      const V = [[c[0] + r, c[1], c[2]], [c[0] - r, c[1], c[2]], [c[0], c[1] + r, c[2]],
        [c[0], c[1] - r, c[2]], [c[0], c[1], c[2] + r], [c[0], c[1], c[2] - r]];
      const F = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
      F.forEach((f) => face(V[f[0]], V[f[1]], V[f[2]], g, b.anchor));
    } else if (b.type === "nozzle") {
      const c = b.center, axis = b.axis || "z", n = 6, len = b.length;
      for (let k = 0; k < (b.count || 1); k++) {
        const off = k * 0.42 - ((b.count || 1) - 1) * 0.21;
        const back = [c[0] + off, c[1], c[2]];
        const front = axis === "z" ? [c[0] + off, c[1], c[2] + len] :
          axis === "y" ? [c[0] + off, c[1] + len, c[2]] : [c[0] + len, c[1], c[2] + off];
        const rr = b.radius * (b.flare || 1.3);
        for (let i = 0; i < n; i++) {
          const a1 = i * Math.PI * 2 / n, a2 = (i + 1) * Math.PI * 2 / n;
          const p1 = [back[0] + Math.cos(a1) * b.radius, back[1] + Math.sin(a1) * b.radius, back[2]];
          const p2 = [back[0] + Math.cos(a2) * b.radius, back[1] + Math.sin(a2) * b.radius, back[2]];
          const q1 = [front[0] + Math.cos(a1) * rr, front[1] + Math.sin(a1) * rr, front[2]];
          const q2 = [front[0] + Math.cos(a2) * rr, front[1] + Math.sin(a2) * rr, front[2]];
          quad(p1, p2, q2, q1, g, b.anchor);
        }
      }
    } else {
      boxMesh([b.x, b.y, b.z], b.w, b.h, b.d, g, b.anchor);
    }
  });
  let minY = 0;
  tris.forEach((t) => t.v.forEach((v) => { if (v[1] < minY) minY = v[1]; }));
  return { tris, parts: parts.length, minY: minY, frame: (shape.sig || {}).frame || "biped" };
};

/* ---------------------------------------------------------- procedural gait */
MF.mesh3d.pose = function (shape, anim) {
  const s = shape || {}, a = anim || {};
  const bodyPlan = MF.mesh3d.bodyPlan(shape);
  const amp = a.moving ? (a.dash ? 0.85 : 0.5) : 0.06;
  const g = a.gait || 0, swing = Math.sin(g) * amp;
  const legs = bodyPlan === "hover" || bodyPlan === "flyer" || bodyPlan === "tank";
  const pivotY = -s.torsoH * 0.28;
  const pivot = (x) => [x, pivotY, 0];
  return {
    body: { pivot: [0, 0, 0], rx: 0, ry: a.torsoYaw || 0, rz: Math.sin(g * 0.5) * (a.moving ? 0.035 : 0.008), dy: Math.abs(Math.sin(g)) * (a.moving ? a.bob || 0.12 : 0.02) },
    head: { pivot: [0, s.torsoH * 0.5, 0], rx: 0, ry: (a.lookYaw || 0) * 0.5, rz: 0, dy: 0 },
    armL: { pivot: pivot(-s.torsoW * 0.9), rx: -swing * 0.55, ry: 0, rz: 0, dy: 0 },
    armR: { pivot: pivot(s.torsoW * 0.9), rx: swing * 0.55 - (a.recoil || 0) * 0.35, ry: 0, rz: 0, dy: 0 },
    shoulderL: { pivot: pivot(-s.torsoW * 0.9), rx: -swing * 0.18, ry: 0, rz: 0, dy: 0 },
    shoulderR: { pivot: pivot(s.torsoW * 0.9), rx: swing * 0.18, ry: 0, rz: 0, dy: 0 },
    legL: { pivot: pivot(-s.legStance * 0.6), rx: legs ? 0 : swing, ry: 0, rz: 0, dy: 0 },
    legR: { pivot: pivot(s.legStance * 0.6), rx: legs ? 0 : -swing, ry: 0, rz: 0, dy: 0 },
    back: { pivot: [0, s.torsoH * 0.28, -s.torsoD * 0.5], rx: legs ? Math.sin(g * 0.7) * 0.05 : 0,
      ry: 0, rz: Math.sin(g * 0.5) * 0.04, dy: 0 }
  };
};
MF.mesh3d.bodyPlan = function (shape) {
  const g = (shape && shape.sig) || {}, f = g.frame, l = g.legs;
  if (f === "flyer") return "flyer";
  if (f === "tank") return "tank";
  if (f === "hover" || l === "hoverSkirt") return "hover";
  if (f === "spider" || f === "tetrapod" || l === "spiderLegs" || l === "tetrapodLegs") return "quad";
  if (l === "reverseJoint" || l === "digitigrade") return "reversejoint";
  return "biped";
};
function m3Rotate(v, bone) {
  if (!bone) return v;
  let x = v[0], y = v[1], z = v[2], p = bone.pivot || [0, 0, 0];
  let dx = x - p[0], dy = y - p[1], dz = z - p[2], c, s;
  if (bone.rx) { c = Math.cos(bone.rx); s = Math.sin(bone.rx);
    const ny = dy * c - dz * s, nz = dy * s + dz * c; dy = ny; dz = nz; }
  if (bone.ry) { c = Math.cos(bone.ry); s = Math.sin(bone.ry);
    const nx = dx * c + dz * s, nz = -dx * s + dz * c; dx = nx; dz = nz; }
  if (bone.rz) { c = Math.cos(bone.rz); s = Math.sin(bone.rz);
    const nx = dx * c - dy * s, ny = dx * s + dy * c; dx = nx; dy = ny; }
  return [p[0] + dx, p[1] + dy + (bone.dy || 0), p[2] + dz];
}

/* ---------------------------------------------------------- scene renderer */
MF.mesh3d.render = function (ctx, w, h, scene) {
  const cam = scene.camera, fov = cam.fov || 1.02;
  const focal = h / (2 * Math.tan(fov / 2));
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const fwd = norm(sub(cam.target, cam.pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const project = (p) => {
    const r = sub(p, cam.pos), z = dot(r, fwd);
    if (z < (cam.near || 0.6)) return null;
    return { x: w / 2 + dot(r, right) * focal / z, y: h / 2 - dot(r, up) * focal / z, z };
  };
  const light = norm(scene.light || [-0.45, 0.82, -0.36]);
  const mats = MF.mesh3d.coatMaterials(scene.coat || DATA.compat.crystalCoat.fields);
  const polys = [];

  /* --- sky + sun --- */
  const sky = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, 0, h * 0.72) : null;
  if (sky && typeof sky.addColorStop === "function") {
    sky.addColorStop(0, "#060e18"); sky.addColorStop(0.55, "#0d2030"); sky.addColorStop(1, "#1a3340");
    ctx.fillStyle = sky;
  } else ctx.fillStyle = "#0d2030";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,190,120,0.10)";
  ctx.beginPath(); ctx.arc(w * 0.76, h * 0.24, Math.min(w, h) * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,190,120,0.30)";
  ctx.beginPath(); ctx.arc(w * 0.76, h * 0.24, Math.min(w, h) * 0.024, 0, Math.PI * 2); ctx.fill();
  const haze = ctx.createLinearGradient ? ctx.createLinearGradient(0, h * 0.42, 0, h * 0.72) : null;
  if (haze && typeof haze.addColorStop === "function") {
    haze.addColorStop(0, "rgba(70,125,145,0)"); haze.addColorStop(0.7, "rgba(70,125,145,0.15)");
    haze.addColorStop(1, "rgba(70,125,145,0)");
    ctx.fillStyle = haze; ctx.fillRect(0, h * 0.42, w, h * 0.3);
  }
  /* procedural distant skyline */
  const sk = scene.terrain.seed;
  ctx.fillStyle = "rgba(8,20,30,0.85)";
  ctx.beginPath(); ctx.moveTo(0, h * 0.62);
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, hh = MF.mesh3d.hash(i, 5, sk) * 0.16 + MF.mesh3d.hash(i, 17, sk) * 0.06;
    ctx.lineTo(t * w, h * (0.62 - hh));
  }
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();

  /* --- ground heightfield --- */
  const T = scene.terrain, cell = T.cell, reach = Math.min(T.size, 220), n = Math.floor(reach / cell);
  for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
    const x0 = i * cell, z0 = j * cell, x1 = x0 + cell, z1 = z0 + cell;
    const dx = (x0 + x1) / 2 - scene.center[0], dz = (z0 + z1) / 2 - scene.center[2];
    if (dx * dx + dz * dz > reach * reach * 0.7) continue;
    const q = [[x0, T.height(x0, z0), z0], [x1, T.height(x1, z0), z0],
      [x1, T.height(x1, z1), z1], [x0, T.height(x0, z1), z1]];
    const P = q.map(project);
    if (P.some((p) => !p || p.z < 7)) continue;   // no huge foreground wedge
    const shade = 0.16 + MF.mesh3d.hash(i, j, sk) * 0.10;
    polys.push({ p: P, z: (P[0].z + P[1].z + P[2].z + P[3].z) / 4,
      rgb: [16 + shade * 100, 32 + shade * 120, 42 + shade * 130],
      grid: true, fog: true });
  }
  /* --- procedural obstacles --- */
  T.obstacles.forEach((o) => {
    const y = T.height(o.x, o.z);
    const corners = [[o.x - o.r, y, o.z - o.r], [o.x + o.r, y, o.z - o.r],
      [o.x + o.r, y + o.h, o.z - o.r], [o.x - o.r, y + o.h, o.z - o.r],
      [o.x - o.r, y, o.z + o.r], [o.x + o.r, y, o.z + o.r],
      [o.x + o.r, y + o.h, o.z + o.r], [o.x - o.r, y + o.h, o.z + o.r]];
    const P = corners.map(project);
    if (P.some((p) => !p || p.z < 7)) return;
    [[0, 1, 2, 3], [5, 4, 7, 6], [1, 5, 6, 2], [4, 0, 3, 7], [3, 2, 6, 7]].forEach((f, k) => {
      const pp = f.map((i) => P[i]);
      polys.push({ p: pp, z: pp.reduce((s, p) => s + p.z, 0) / 4,
        rgb: [26 + k * 5, 42 + k * 6, 52 + k * 7], fog: true });
    });
  });

  /* --- mechs --- */
  (scene.mechs || []).forEach((m) => {
    const mesh = m.mesh, pose = m.pose || {}, yaw = m.yaw || 0;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const gy = T.height(m.pos[0], m.pos[2]);
    const baseY = gy - mesh.minY * (m.scale || 1) + (m.lift || 0);
    const coat = m.coat || scene.coat, mm = MF.mesh3d.coatMaterials(coat);
    const step = m.lowPoly ? 3 : 1;
    for (let ti = 0; ti < mesh.tris.length; ti += step) {
      const t = mesh.tris[ti];
      const bone = pose[t.bone];
      const wv = t.v.map((v0) => {
        let v = m3Rotate(v0, bone);
        const sc = m.scale || 1;
        let x = v[0] * sc, y = v[1] * sc, z = v[2] * sc;
        const nx = x * cy + z * sy, nz = -x * sy + z * cy;
        return [m.pos[0] + nx, baseY + y, m.pos[2] + nz];
      });
      const P = wv.map(project);
      if (P.some((p) => !p)) continue;
      const e1 = sub(wv[1], wv[0]), e2 = sub(wv[2], wv[0]);
      const nrm = norm(cross(e1, e2));
      const diffuse = Math.abs(dot(nrm, light));
      const mat = mm[t.group] || mm.default;
      const flake = (t.var - 0.5) * Number(coat.flake || 0) * 60;
      const wear = (t.var < Number(coat.wear || 0) * 0.5 ? 26 : 0);
      const spec = Math.pow(diffuse, 2) * mat.metal * 70;
      const base = mat.rgb, lightness = 0.44 + diffuse * 0.86;
      const emissive = mat.emit * (0.45 + Number(coat.lightsBrightness || 0.8) * 0.55);
      const rim = Math.pow(1 - Math.abs(dot(nrm, fwd)), 2) * 34;
      polys.push({ p: P, z: (P[0].z + P[1].z + P[2].z) / 3, fog: true,
        rgb: [base[0] * lightness + spec + rim + flake + wear + emissive * 90,
          base[1] * lightness + spec + rim + flake + wear + emissive * 115,
          base[2] * lightness + spec + rim + flake + wear + emissive * 140] });
    }
  });

  /* --- effects (jump jet plumes, projectiles, waypoints) --- */
  (scene.effects || []).forEach((e) => {
    const P = project([e.x, e.y, e.z]); if (!P) return;
    polys.push({ p: [{ x: P.x - e.r, y: P.y - e.r, z: P.z }, { x: P.x + e.r, y: P.y - e.r, z: P.z },
      { x: P.x + e.r, y: P.y + e.r, z: P.z }, { x: P.x - e.r, y: P.y + e.r, z: P.z }],
      z: P.z - 0.01, rgb: e.rgb || [255, 160, 80], fog: false, glow: true });
  });

  /* --- painter's algorithm --- */
  polys.sort((a, b) => b.z - a.z);
  const fogFar = cam.far || 460;
  polys.forEach((pl) => {
    const p = pl.p;
    if (p.some((v) => !isFinite(v.x) || !isFinite(v.y))) return;
    let f = 1;
    if (pl.fog) f = Math.max(0.16, 1 - Math.min(1, pl.z / fogFar) * 0.82);
    const c = pl.rgb.map((v) => Math.max(0, Math.min(255, v * f)));
    ctx.fillStyle = "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.closePath(); ctx.fill();
    if (pl.grid) { ctx.strokeStyle = "rgba(90,175,200,0.20)"; ctx.lineWidth = 0.7; ctx.stroke(); }
    if (pl.glow) { ctx.fillStyle = "rgba(255,210,150,0.18)"; ctx.fill(); }
  });
  return polys.length;
};
