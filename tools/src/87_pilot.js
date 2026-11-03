/* FULL PLAYABLE PROCEDURAL 3D PILOT TEST + compat UI.
   Geometry, terrain, gait, hostiles, effects and coatings are all generated at
   runtime. No models, rigs, textures, animation clips or external assets. */

const PILOT_ORDERS = ["FOLLOW & FIGHT", "FOLLOW & HOLD FIRE", "HOLD POSITION", "WAIT"];

MF.pilot = {
  active: false, paused: false, bound: false, t: 0, last: 0, hudAt: -1, teleAt: -1,
  keys: {}, mouse: { down: false, x: 0, y: 0, dx: 0 }, order: 0,
  seed: DATA.compat.pilot.terrain.seed,
  terrain: null, mesh: null, waypoints: [], wpIndex: 0, wave: 0, kills: 0, xp: 0, salvage: 0,
  player: null, hostiles: [], bullets: [], effects: [], logLines: [],
  cameraMode: "CHASE", autopilot: false, polyCount: 0, lastFrame: 0, shake: 0,

  coat() { return MF.state.coat || (MF.state.coat = MF.compat.defaultCoat()); },
  clog(msg) {
    this.logLines.unshift("[" + fmt(this.t, 1) + "s] " + msg);
    if (this.logLines.length > 20) this.logLines.pop();
    const el = $("pilot-log");
    if (el) el.innerHTML = this.logLines.map((x) => '<div class="mf-item">' + esc(x) + "</div>").join("");
  },
  telemetry() {
    if (!this.tele || this.t - this.teleAt > 0.3) {
      const moving = !!(this.keys.w || this.keys.a || this.keys.s || this.keys.d || this.autopilot);
      this.tele = MF.sim.compute(MF.activeDesign(), {
        temperature: this.player ? this.player.temp : 0.34, moving,
        charging: this.player ? this.player.charging : false,
        distance: 1, enemyEccm: 1 + this.wave * 0.08, enemyLockQuality: 8 + this.wave
      });
      this.teleAt = this.t;
    }
    return this.tele;
  },

  /* ------------------------------------------------------------ generation */
  generate(seed) {
    this.seed = seed;
    const cfg = DATA.compat.pilot;
    this.terrain = MF.mesh3d.terrain(seed, cfg.terrain);
    const shape = MF.state.bakedShape || MF.activeDesign().shape || MF.state.shape;
    this.mesh = MF.mesh3d.fromShape(shape);
    this.waypoints = MF.compat.autodrive.waypoints(seed, this.terrain, 5);
    this.wpIndex = 0;
    this.hostiles = [];
    this.bullets = [];
    this.effects = [];
    this.wave = 0; this.kills = 0; this.xp = 0; this.salvage = 0;
    this.player = { x: 0, z: 0, yaw: 0, pitch: 0.06, vx: 0, vz: 0, lift: 0, vy: 0,
      hp: 100, maxHp: 100, temp: 0.34, core: 0, fireCd: 0, dashCd: 0, missileCd: 0,
      ventCd: 0, shield: 0, charging: false, gait: 0 };
    this.spawnWave();
    this.clog("PROCEDURAL WORLD GENERATED · seed " + seed + " · " + this.mesh.tris.length +
      " triangles · " + this.mesh.parts + " parts · " + this.terrain.obstacles.length + " obstacles");
  },
  spawnWave() {
    const cfg = DATA.compat.pilot.waves;
    this.wave++;
    const n = Math.min(cfg.maxHostiles, cfg.baseHostiles + (this.wave - 1) * cfg.perWave);
    const roster = DATA.chassis.roster;
    for (let i = 0; i < n; i++) {
      const c = roster[(this.seed + this.wave * 7 + i * 3) % roster.length];
      const a = MF.mesh3d.hash(i, this.wave, this.seed) * Math.PI * 2;
      const r = 38 + MF.mesh3d.hash(i, this.wave + 11, this.seed) * 55;
      const boss = this.wave % cfg.bossEvery === 0 && i === 0;
      this.hostiles.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: a + Math.PI,
        hp: boss ? 220 : 60 + this.wave * 8, maxHp: boss ? 220 : 60 + this.wave * 8,
        boss, name: c.name, mesh: MF.mesh3d.fromShape(c.shape, { lowPoly: true }),
        gait: MF.mesh3d.hash(i, 4, this.seed) * 6, fireCd: 1 + i * 0.3,
        scale: boss ? 1.35 : 0.9, lowPoly: true });
    }
    this.clog("WAVE " + this.wave + " · " + n + " procedurally generated hostiles" +
      (this.wave % cfg.bossEvery === 0 ? " · BOSS" : ""));
  },
  start() {
    this.generate(this.seed);
    this.active = true; this.paused = false; this.t = 0; this.last = 0;
    this.clog("PILOT TEST STARTED · " + MF.activeDesign().name + " · " +
      MF.mesh3d.bodyPlan(MF.state.bakedShape || MF.activeDesign().shape || MF.state.shape).toUpperCase() + " BODY PLAN");
    this.updateHUD(true);
  },
  stop() { this.active = false; this.paused = false; this.clog("PILOT TEST STOPPED"); },
  onEnter() { if (!this.active) this.start(); this.updateHUD(true); },
  togglePause() { if (!this.active) return; this.paused = !this.paused; this.clog(this.paused ? "PAUSED" : "RESUMED"); },
  toggleAutopilot() {
    this.autopilot = !this.autopilot;
    MF.compat.autodrive.setLink(this.autopilot);
    this.clog("AUTODRIVE " + (this.autopilot ? "ENGAGED → WP " + (this.wpIndex + 1) +
      " · " + MF.compat.autodrive.status().mode : "DISENGAGED · MANUAL CONTROL"));
    this.updateHUD(true);
  },

  /* ------------------------------------------------------------ simulation */
  update(dt) {
    const p = this.player, C = DATA.compat.pilot.physics, t = this.telemetry();
    this.t += dt;
    const massFactor = Math.max(0.4, Math.min(1.6, 2200 / Math.max(600, t.totalMass)));
    const brownout = t.powerMargin < 0 ? 0.55 : 1;
    const heatDerate = p.temp > 1.0 ? 0.62 : 1;
    let throttle = 0, steer = 0;

    if (this.autopilot && this.waypoints.length) {
      const wp = this.waypoints[this.wpIndex % this.waypoints.length];
      const s = MF.compat.autodrive.steer(p, wp, this.terrain);
      if (s.done) {
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        this.clog("AUTODRIVE · waypoint reached → WP " + (this.wpIndex + 1));
      } else { throttle = s.throttle; steer = s.steer; }
    } else {
      if (this.keys.w) throttle += 1;
      if (this.keys.s) throttle -= 0.6;
      if (this.keys.a) steer -= 1;
      if (this.keys.d) steer += 1;
    }
    if (DATA.compat.autodrive.params.resumeOnManualInput && this.autopilot &&
      (this.keys.w || this.keys.a || this.keys.s || this.keys.d)) {
      /* a hard manual input temporarily overrides cruise but keeps the link */
      throttle = throttle * 0.4 + (this.keys.w ? 0.8 : 0);
    }
    p.yaw += steer * C.turnRate * dt * brownout;
    const speed = (this.keys.shift || this.autopilot ? C.dashSpeed : C.walkSpeed) *
      massFactor * brownout * heatDerate;
    const targetVx = Math.sin(p.yaw) * throttle * speed;
    const targetVz = Math.cos(p.yaw) * throttle * speed;
    p.vx += (targetVx - p.vx) * Math.min(1, dt * 4);
    p.vz += (targetVz - p.vz) * Math.min(1, dt * 4);
    p.x += p.vx * dt; p.z += p.vz * dt;
    const lim = this.terrain.size * 0.46;
    p.x = Math.max(-lim, Math.min(lim, p.x)); p.z = Math.max(-lim, Math.min(lim, p.z));
    /* obstacle collision */
    this.terrain.obstacles.forEach((o) => {
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.sqrt(dx * dx + dz * dz), rr = o.r + 1.6;
      if (d < rr && d > 0.001) { p.x += dx / d * (rr - d); p.z += dz / d * (rr - d); p.vx *= 0.5; p.vz *= 0.5; }
    });
    /* jump jets */
    if (this.keys.space && p.lift <= 0.01 && p.temp < 1.4) { p.vy = C.jumpImpulse; p.temp += 0.16; }
    if (p.vy !== 0 || p.lift > 0) {
      p.vy -= C.gravity * dt; p.lift = Math.max(0, p.lift + p.vy * dt);
      if (p.lift === 0) p.vy = 0;
    }
    /* gait + thermal */
    const moving = Math.abs(p.vx) + Math.abs(p.vz) > 0.5;
    p.gait += dt * C.gait * (moving ? 1 + speed / 18 : 0.4);
    p.temp = Math.max(0.2, p.temp + dt * (0.055 + Math.abs(throttle) * 0.10 - t.heatDiss / 400));
    if (this.keys.v && p.ventCd <= 0) { p.temp = 0.28; p.ventCd = 6; this.clog("FORCED VENT"); }
    p.fireCd -= dt; p.dashCd -= dt; p.missileCd -= dt; p.ventCd -= dt;
    p.shield = Math.max(0, p.shield - dt);
    p.core = Math.min(100, p.core + dt * 4);
    p.charging = !!this.keys.q;
    if (this.mouse.down && p.fireCd <= 0) this.fire();

    /* hostiles */
    this.hostiles.forEach((e, i) => {
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
      e.yaw = Math.atan2(dx, dz);
      const aggro = 1 - Math.min(0.75, t.rcsFront / 55);   // high RCS = detected sooner
      if (d > 12) { e.x += dx / d * dt * (e.boss ? 5 : 3.4) * aggro; e.z += dz / d * dt * (e.boss ? 5 : 3.4) * aggro; }
      e.gait += dt * 3;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && d < 90 && t.lockBreak < 1.2) {
        e.fireCd = (e.boss ? 1.1 : 2.0) + MF.mesh3d.hash(i, this.t | 0, this.seed);
        this.bullets.push({ x: e.x, z: e.z, y: 2.2, vx: p.x - e.x, vz: p.z - e.z,
          life: 3, hostile: true, damage: e.boss ? 9 : 4 });
      }
    });
    /* bullets */
    this.bullets.forEach((b) => {
      const l = Math.sqrt(b.vx * b.vx + b.vz * b.vz) || 1;
      b.x += b.vx / l * dt * 48; b.z += b.vz / l * dt * 48; b.life -= dt;
      if (!b.hostile) {
        this.hostiles.forEach((e) => {
          const dx = e.x - b.x, dz = e.z - b.z;
          if (dx * dx + dz * dz < (e.boss ? 5 : 3) * (e.boss ? 5 : 3)) {
            e.hp -= b.damage || 18; b.life = 0;
            if (e.hp <= 0) { this.kills++; this.xp += e.boss ? 120 : 28; this.salvage += e.boss ? 90 : 18; }
          }
        });
      } else {
        const dx = p.x - b.x, dz = p.z - b.z;
        if (dx * dx + dz * dz < 4) {
          b.life = 0;
          p.hp -= p.shield > 0 ? b.damage * 0.25 : b.damage;
          this.shake = 0.25;
        }
      }
    });
    this.bullets = this.bullets.filter((b) => b.life > 0);
    const alive = this.hostiles.filter((e) => e.hp > 0);
    if (alive.length !== this.hostiles.length) {
      this.hostiles = alive;
      if (!alive.length) { MF.state.xp += this.xp; MF.state.salvage += this.salvage; this.spawnWave(); }
    }
    if (p.hp <= 0) {
      this.clog("PROTOCOL 3 · EJECT — structure lost, pilot recovered");
      p.hp = p.maxHp; p.temp = 0.34; p.x = 0; p.z = 0; p.vx = 0; p.vz = 0;
      this.hostiles.forEach((e) => { e.x += 30; e.z += 30; });
    }
    /* effects */
    this.effects = [];
    if (p.lift > 0.1) {
      this.effects.push({ x: p.x - 0.6, y: this.terrain.height(p.x, p.z) + 0.6, z: p.z, r: 7, rgb: [255, 140, 60] });
      this.effects.push({ x: p.x + 0.6, y: this.terrain.height(p.x, p.z) + 0.6, z: p.z, r: 7, rgb: [255, 190, 90] });
    }
    this.bullets.forEach((b) => this.effects.push({ x: b.x, y: b.y, z: b.z, r: 3,
      rgb: b.hostile ? [255, 90, 70] : [110, 230, 255] }));
    const wp = this.waypoints[this.wpIndex % this.waypoints.length];
    if (wp && this.autopilot) this.effects.push({ x: wp.x, y: this.terrain.height(wp.x, wp.z) + 6, z: wp.z, r: 9, rgb: [130, 255, 160] });
  },
  fire() {
    const p = this.player, t = this.telemetry();
    if (t.powerMargin < -8) { this.clog("BROWNOUT · weapon bus offline"); p.fireCd = 0.6; return; }
    this.bullets.push({ x: p.x, z: p.z, y: 2.4,
      vx: Math.sin(p.yaw) * 60, vz: Math.cos(p.yaw) * 60, life: 1.4, hostile: false,
      damage: 18 + (p.charging ? 16 : 0) });
    p.fireCd = 0.22; p.temp += 0.045;
  },

  /* ------------------------------------------------------------ rendering */
  draw() {
    const cv = $("pilot-canvas"); if (!cv) return;
    const f = MF.fit(cv, true); if (!f) return;
    const { ctx, w, h } = f, p = this.player, T = this.terrain, cfg = DATA.compat.pilot.camera;
    const gy = T.height(p.x, p.z) + p.lift;
    let camPos, target;
    if (this.cameraMode === "COCKPIT") {
      camPos = [p.x, gy + 4.2, p.z];
      target = [p.x + Math.sin(p.yaw) * 30, gy + 4.2 - Math.tan(p.pitch) * 30, p.z + Math.cos(p.yaw) * 30];
    } else if (this.cameraMode === "ORBIT") {
      const a = this.t * 0.25;
      camPos = [p.x + Math.cos(a) * cfg.distance, gy + cfg.height * 0.95, p.z + Math.sin(a) * cfg.distance];
      target = [p.x, gy + 2.8, p.z];
    } else {
      camPos = [p.x - Math.sin(p.yaw) * cfg.distance, gy + cfg.height, p.z - Math.cos(p.yaw) * cfg.distance];
      target = [p.x, gy + 2.4, p.z];
    }
    const shape = MF.state.bakedShape || MF.activeDesign().shape || MF.state.shape;
    const pose = MF.mesh3d.pose(shape, { gait: p.gait, moving: Math.abs(p.vx) + Math.abs(p.vz) > 0.5,
      dash: !!this.keys.shift, torsoYaw: 0, lookYaw: 0, recoil: p.fireCd > 0 ? 0.4 : 0,
      bob: DATA.compat.pilot.physics.bob });
    const mechs = [{ mesh: this.mesh, pos: [p.x, 0, p.z], yaw: p.yaw, pose,
      coat: this.coat(), lift: p.lift }];
    this.hostiles.forEach((e) => mechs.push({ mesh: e.mesh, pos: [e.x, 0, e.z], yaw: e.yaw,
      scale: e.scale, lowPoly: true, coat: { primary: "#C4543F", secondary: "#2A2E36",
        lightHue: 16, lightsBrightness: 0.9, aspect: "metallic", metallic: 0.7,
        roughness: 0.36, flake: 0.25, wear: 0.3, emission: 0.75, patternSeed: e.gait | 0 },
      pose: MF.mesh3d.pose(shape, { gait: e.gait, moving: true, bob: 0.08 }) }));
    try {
      this.polyCount = MF.mesh3d.render(ctx, w, h, {
        camera: { pos: camPos, target, fov: cfg.fov, near: cfg.near, far: cfg.far },
        terrain: T, center: [p.x, 0, p.z], coat: this.coat(), mechs,
        effects: this.effects, light: [-0.45, 0.82, -0.36]
      });
    } catch (e) { this.polyCount = -1; }
    /* cockpit / HUD overlay */
    ctx.fillStyle = "rgba(4,10,16,0.72)"; ctx.fillRect(0, 0, w, 22); ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = "#4dd0e1"; ctx.font = "10px monospace";
    ctx.fillText("PROCEDURAL 3D PILOT · " + this.cameraMode + " · SEED " + this.seed +
      " · " + this.polyCount + " POLYS · BODY PLAN " + MF.mesh3d.bodyPlan(shape).toUpperCase(), 7, 14);
    ctx.fillStyle = this.autopilot ? "#8bd450" : "#ffb347";
    ctx.fillText((this.autopilot ? "AUTODRIVE ENGAGED → WP " + (this.wpIndex + 1) : "MANUAL CONTROL") +
      " · WAVE " + this.wave + " · X " + fmt(p.x, 0) + " Z " + fmt(p.z, 0), 7, h - 7);
    ctx.strokeStyle = "rgba(120,220,240,0.65)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2 - 9, h / 2); ctx.lineTo(w / 2 + 9, h / 2);
    ctx.moveTo(w / 2, h / 2 - 9); ctx.lineTo(w / 2, h / 2 + 9); ctx.stroke();
    /* compass + waypoint bearing */
    const cx = w / 2;
    ctx.fillStyle = "rgba(4,10,16,0.55)"; ctx.fillRect(cx - 120, 24, 240, 16);
    ctx.fillStyle = "#7e9aab"; ctx.font = "9px monospace";
    ["NW", "N", "NE", "E", "SE", "S", "SW", "W"].forEach((lab, i) => {
      const deg = i * 45, delta = ((deg - (p.yaw * 180 / Math.PI)) % 360 + 360) % 360;
      const x = cx + (delta > 180 ? delta - 360 : delta) * 1.15;
      if (x > cx - 118 && x < cx + 118) ctx.fillText(lab, x - 6, 35);
    });
    if (this.waypoints.length) {
      const wp = this.waypoints[this.wpIndex % this.waypoints.length];
      const bearing = Math.atan2(wp.x - p.x, wp.z - p.z) - p.yaw;
      const bx = cx + Math.max(-110, Math.min(110, bearing * 90));
      ctx.fillStyle = this.autopilot ? "#8bd450" : "#ffb347";
      ctx.fillRect(bx - 1, 24, 2, 16);
    }
  },
  loop(ts) {
    if (!this.active || MF.state.tab !== "pilot") return;
    if (ts - this.lastFrame < 38) return;      // ~26 fps software rasterizer
    this.lastFrame = ts;
    if (!this.last) this.last = ts;
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    if (!this.paused) this.update(dt);
    this.draw();
    this.updateHUD(false);
  },

  /* ------------------------------------------------------------ UI */
  render(sec) {
    if (!this.bound) {
      this.bound = true;
      sec.addEventListener("click", (e) => this.onClick(e));
      sec.addEventListener("input", (e) => this.onInput(e));
      sec.addEventListener("change", (e) => this.onInput(e));
      document.addEventListener("keydown", (e) => this.onKey(e, true));
      document.addEventListener("keyup", (e) => this.onKey(e, false));
      const cv = $("pilot-canvas");
      if (cv) {
        cv.addEventListener("mousedown", (e) => { this.mouse.down = true; this.mouse.x = e.clientX; });
        document.addEventListener("mouseup", () => { this.mouse.down = false; });
        document.addEventListener("mousemove", (e) => {
          if (MF.state.tab !== "pilot" || !this.mouse.down || !this.player) return;
          this.player.yaw += (e.clientX - this.mouse.x) * 0.004; this.mouse.x = e.clientX;
        });
      }
    }
    if (!MF.state.coat) MF.state.coat = MF.compat.defaultCoat();
    this.panels();
    if (!this.active) this.start();
  },
  update(sec) { this.panels(); this.updateHUD(true); },
  panels() {
    const hud = $("pilot-hud"), coatEl = $("pilot-coat"), comp = $("pilot-compat"), ingameEl = $("pilot-ingame");
    if (hud) hud.innerHTML = '<div id="pilot-hud-live"></div>' +
      '<div class="mf-hr"></div><div class="mf-row">' +
      '<button class="mf-btn small" data-act="pilot-seed">NEW TERRAIN SEED</button>' +
      '<button class="mf-btn small" data-act="pilot-lua">GENERATE CET LUA</button>' +
      '<button class="mf-btn small" data-act="pilot-export">EXPORT STATE JSON</button></div>' +
      '<div class="mf-note">Every polygon above is generated from your shape vector + signature parts. ' +
      "Change the frame in MECH FORGE and BAKE, then re-enter this tab.</div>";
    if (coatEl) coatEl.innerHTML = this.coatHTML();
    if (comp) comp.innerHTML = this.compatHTML();
    if (ingameEl && MF.ingame) ingameEl.innerHTML = MF.ingame.panelHTML();
    this.updateHUD(true);
  },
  coatHTML() {
    const c = MF.compat.clampCoat(this.coat()), aspects = DATA.compat.crystalCoat.aspects;
    const range = (id, label, v, max) => '<label class="mf-field">' + label + "</label>" +
      '<input class="mf-input" type="range" id="' + id + '" min="0" max="' + max +
      '" step="0.01" value="' + v + '"> <span class="num" id="' + id + '-v">' + fmt(v, 2) + "</span>";
    return '<div class="mf-note">Primary / secondary / light hue / paint aspect mirror CrystalCoat. ' +
      "Shading is computed per triangle — no textures.</div>" +
      '<div class="mf-row"><span class="mf-pill" style="background:' + esc(c.primary) +
      ';color:#06121a">PRIMARY</span><span class="mf-pill" style="background:' + esc(c.secondary) +
      ';color:#e6f4f8">SECONDARY</span></div>' +
      '<label class="mf-field">PRESET</label>' +
      MF.ui.select("coat-preset", DATA.compat.coatings, c.id || "vanguard_stock",
        (x) => x.name, (x) => x.id) +
      '<label class="mf-field">NAME</label><input class="mf-input" id="coat-name" value="' + esc(c.name) + '">' +
      '<label class="mf-field">PRIMARY HEX</label><input class="mf-input" id="coat-primary" value="' + esc(c.primary) + '">' +
      '<label class="mf-field">SECONDARY HEX</label><input class="mf-input" id="coat-secondary" value="' + esc(c.secondary) + '">' +
      '<label class="mf-field">PAINT ASPECT</label>' +
      MF.ui.select("coat-aspect", aspects, c.aspect, (x) => x.toUpperCase(), (x) => x) +
      '<label class="mf-field">LIGHT HUE</label><input class="mf-input" type="range" id="coat-hue" min="0" max="359" step="1" value="' + c.lightHue + '">' +
      range("coat-metallic", "METALLIC", c.metallic, 1) +
      range("coat-roughness", "ROUGHNESS", c.roughness, 1) +
      range("coat-flake", "FLAKE / WEAR NOISE", c.flake, 1) +
      range("coat-wear", "WEAR", c.wear, 1) +
      range("coat-emission", "LIGHT EMISSION", c.emission, 1) +
      '<label class="mf-field">SHARE CODE (CCP1)</label><input class="mf-input" id="coat-code" value="' +
      esc(MF.compat.encodeCoat(c)) + '">' +
      '<div class="mf-row"><button class="mf-btn small" data-act="coat-apply">APPLY CODE</button>' +
      '<button class="mf-btn small" data-act="coat-copy">COPY CODE</button>' +
      '<button class="mf-btn small" data-act="coat-sync">SYNC FROM CET</button></div>';
  },
  compatHTML() {
    const a = MF.compat.autodrive.status(), c = MF.compat.crystalCoat.status();
    return '<div class="mf-kv">' +
      "<span class=\"k\">AUTODRIVE</span><span>" + esc(a.mode) + "</span>" +
      "<span class=\"k\">NATIVE</span><span>" + esc(a.native) + "</span>" +
      "<span class=\"k\">KEY</span><span>" + esc(a.key) + " · waypoint hand-off</span>" +
      "<span class=\"k\">CRYSTAL COAT</span><span>" + (c.present ? "CET LINK DETECTED" : "BROWSER FALLBACK") + "</span>" +
      "<span class=\"k\">NATIVE</span><span>" + esc(c.native) + "</span>" +
      "<span class=\"k\">PICKER</span><span>" + esc(c.picker) + " · hold " + esc(c.holdKey) + "</span>" +
      "<span class=\"k\">CODE</span><span>" + esc(c.example) + "</span></div>" +
      '<div class="mf-row"><button class="mf-btn small" data-act="compat-link">SIMULATE CET LINK ON/OFF</button>' +
      '<button class="mf-btn small" data-act="compat-lua">GENERATE CET LUA</button></div>' +
      '<div class="mf-note">' + esc(DATA.compat.disclaimer) + "</div>";
  },
  updateHUD(force) {
    if (!force && this.t - this.hudAt < 0.2) return;
    this.hudAt = this.t;
    const p = this.player, t = this.telemetry(), el = $("pilot-hud-live");
    if (el && p) el.innerHTML =
      MF.ui.barRow("STRUCTURE", p.hp, p.maxHp, fmt(p.hp, 0) + "%", "green") +
      MF.ui.barRow("POWER MARGIN", 50 + t.powerMargin, 100, fmt(t.powerMargin, 1) + " kW",
        t.powerMargin < 0 ? "red" : "amber") +
      MF.ui.barRow("HEAT", p.temp, 1.5, fmt(p.temp, 2), "red") +
      MF.ui.barRow("RCS", t.rcsFront, 40, fmt(t.rcsFront, 1) + " m²", "violet") +
      MF.ui.barRow("ECM", t.jamStrength, 80, fmt(t.jamStrength, 1) + " str", "cyan") +
      MF.ui.barRow("CORE", p.core, 100, fmt(p.core, 0) + "%", "green") +
      '<div class="mf-hr"></div><div class="mf-kv">' +
      "<span class=\"k\">SPEED</span><span>" + fmt(t.speed, 2) + " m/s</span>" +
      "<span class=\"k\">MASS</span><span>" + fmt(t.totalMass, 0) + " kg</span>" +
      "<span class=\"k\">DETECT RANGE</span><span>" + fmt(t.detectRange, 0) + " m</span>" +
      "<span class=\"k\">LOCK TIME</span><span>" + fmt(t.missileLockTime, 2) + " s</span>" +
      "<span class=\"k\">MESH</span><span>" + (this.mesh ? this.mesh.tris.length : 0) + " tris / " +
      (this.mesh ? this.mesh.parts : 0) + " parts</span>" +
      "<span class=\"k\">POLYGONS DRAWN</span><span>" + this.polyCount + "</span>" +
      "<span class=\"k\">WAYPOINT</span><span>" + (this.waypoints.length ? this.wpIndex + 1 + " / " + this.waypoints.length : "—") + "</span>" +
      "<span class=\"k\">COMPANION</span><span>" + PILOT_ORDERS[this.order] + "</span></div>" +
      '<div class="mf-hr"></div><h3>VALIDATION</h3><div class="mf-chips">' + MF.ui.validChips(t) + "</div>";
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("pilot-wave", this.wave); set("pilot-xp", MF.state.xp + this.xp);
    set("pilot-salvage", MF.state.salvage + this.salvage);
    set("pilot-design", MF.activeDesign().name);
    const log = $("pilot-log");
    if (log && !log.children.length) log.innerHTML = this.logLines.map((x) => '<div class="mf-item">' + esc(x) + "</div>").join("");
  },

  /* ------------------------------------------------------------ events */
  onKey(e, down) {
    if (MF.state.tab !== "pilot") return;
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    const k = String(e.key || "").toLowerCase();
    const map = { arrowup: "w", arrowdown: "s", arrowleft: "a", arrowright: "d" };
    const key = map[k] || k;
    if (["w", "a", "s", "d", "shift", " ", "q", "e", "r", "v"].indexOf(key) >= 0 && down && e.preventDefault) e.preventDefault();
    this.keys[key === " " ? "space" : key] = down;
    if (!down) return;
    if (key === "t") this.toggleAutopilot();
    else if (key === "p") this.togglePause();
    else if (key === "c") { this.cameraMode = this.cameraMode === "CHASE" ? "COCKPIT" : this.cameraMode === "COCKPIT" ? "ORBIT" : "CHASE"; this.clog("CAMERA " + this.cameraMode); }
    else if (key === "y") { MF.toast("Crystal Coat panel is on the right — hex, aspect and CCP1 share code", "ok"); }
    else if (key === "e" && this.player) { this.player.shield = 2.4; this.player.temp += 0.12; this.clog("VORTEX SHIELD UP"); }
    else if (key === "r" && this.player) { this.player.missileCd = 0; this.bullets.push({ x: this.player.x, z: this.player.z, y: 2.5, vx: Math.sin(this.player.yaw) * 60, vz: Math.cos(this.player.yaw) * 60, life: 1.6, hostile: false, damage: 42 }); this.clog("MISSILE SALVO"); }
    else if (key >= "1" && key <= "4") { this.order = Number(key) - 1; this.clog("COMPANION ORDER · " + PILOT_ORDERS[this.order]); }
  },
  onInput(e) {
    const id = e.target.id, v = e.target.value;
    if (id.indexOf("ingame-") === 0 && MF.ingame) {
      if (id === "ingame-core") MF.state.ingameCore = v;
      else if (id === "ingame-parts") {
        MF.state.ingameParts = clamp(Number(v) || 0, 0, MF.ingame.maxParts());
        const out = $("ingame-parts-v"); if (out) out.textContent = MF.state.ingameParts;
      } else if (id === "ingame-camera") MF.state.ingameCamera = v;
      else if (id === "ingame-cockpit") MF.state.ingameCockpit = !!e.target.checked;
      else return;
      MF.save(); return;
    }
    if (id.indexOf("coat-") !== 0) return;
    const c = MF.compat.clampCoat(this.coat());
    if (id === "coat-preset") {
      const p = MF.compat.coatPreset(v); Object.keys(p).forEach((k) => { c[k] = p[k]; });
      MF.state.coat = c; this.panels(); return;
    }
    if (id === "coat-name") c.name = v;
    else if (id === "coat-primary" || id === "coat-secondary") c[id.slice(5)] = v;
    else if (id === "coat-aspect") c.aspect = v;
    else if (id === "coat-hue") c.lightHue = Number(v);
    else if (id === "coat-metallic") c.metallic = Number(v);
    else if (id === "coat-roughness") c.roughness = Number(v);
    else if (id === "coat-flake") c.flake = Number(v);
    else if (id === "coat-wear") c.wear = Number(v);
    else if (id === "coat-emission") c.emission = Number(v);
    else return;
    MF.state.coat = MF.compat.clampCoat(c); MF.save();
    const label = $(id + "-v"); if (label) label.textContent = fmt(Number(v), 2);
    const code = $("coat-code"); if (code) code.value = MF.compat.encodeCoat(MF.state.coat);
  },
  onClick(e) {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act, v = b.dataset.v;
    if (a === "pilot-start") this.start();
    else if (a === "pilot-stop") this.stop();
    else if (a === "pilot-pause") this.togglePause();
    else if (a === "pilot-autodrive") this.toggleAutopilot();
    else if (a === "pilot-camera") { this.cameraMode = this.cameraMode === "CHASE" ? "COCKPIT" : this.cameraMode === "COCKPIT" ? "ORBIT" : "CHASE"; this.clog("CAMERA " + this.cameraMode); }
    else if (a === "pilot-seed") { this.seed = 1000 + Math.floor(Math.random() * 8999); this.start(); }
    else if (a === "pilot-lua" || a === "compat-lua") MF.copyText(MF.compat.luaSnippet(this.coat(), this.autopilot), "CET compat Lua");
    else if (a === "ingame-lua") MF.copyText(MF.ingame.luaSnippet());
    else if (a === "ingame-records") MF.copyText(MF.ingame.recordsText());
    else if (a === "ingame-checklist") MF.modal("IN-GAME PILOT · DEPLOY CHECKLIST", MF.ingame.checklistHTML());
    else if (a === "pilot-export") MF.copyText(JSON.stringify({ seed: this.seed, coat: this.coat(), autopilot: this.autopilot, shape: MF.state.shape }, null, 2), "pilot state JSON");
    else if (a === "coat-apply") {
      const c = MF.compat.decodeCoat(($("coat-code") || {}).value || "");
      if (!c) { MF.toast("Not a CCP1 Crystal Coat code", "err"); return; }
      MF.state.coat = c; MF.save(); this.panels(); this.clog("CRYSTAL COAT APPLIED · " + c.name);
    } else if (a === "coat-copy") MF.copyText(MF.compat.encodeCoat(this.coat()), "CCP1 share code");
    else if (a === "coat-sync") {
      const c = MF.compat.crystalCoat.readExternal();
      if (!c) { MF.toast("No CET Crystal Coat sync published — using the procedural fallback", "err"); return; }
      MF.state.coat = c; MF.save(); this.panels(); this.clog("CRYSTAL COAT SYNCED FROM CET · " + c.name);
    } else if (a === "compat-link") {
      const on = !MF.compat.autodrive.status().present;
      MF.compat.autodrive.setLink(on);
      MF.compat.crystalCoat.syncFromMod = on ? "SIMULATED" : null;
      this.panels();
      this.clog("SIMULATED CET LINK " + (on ? "ON (GetMod returns a table)" : "OFF"));
    } else if (a === "pilot-start" || a === "pilot-stop") { /* handled above */ }
    this.updateHUD(true);
  }
};

MF.registerTab("pilot", MF.pilot);
