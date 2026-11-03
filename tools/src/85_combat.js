/* COMBAT TEST — deploys the player-authored chassis + subsystems. Power, mass, heat, RCS, ECM,
   reactor instability all have live consequences here. Procedural canvas only. */

const ORDERS = ["FOLLOW & FIGHT", "FOLLOW & HOLD FIRE", "HOLD POSITION", "WAIT"];

MF.combat = {
  active: false, paused: false, keys: {}, mouse: { x: 0, y: 0, down: false, moved: false },
  player: null, bullets: [], enemies: [], particles: [], companion: null,
  wave: 0, kills: 0, t: 0, last: 0, tele: null, teleAt: -1, hudAt: -1,
  spawnTimer: 0, waveDelay: 0, ejectCooldown: 0, invuln: 0, shake: 0, glitch: 0,
  nextWaveAt: 0, xp: 0, salvage: 0,

  telemetry() {
    if (!this.tele || this.t - this.teleAt > 0.25) {
      const moving = !!(this.keys.w || this.keys.a || this.keys.s || this.keys.d);
      this.tele = MF.sim.compute(MF.activeDesign(), {
        temperature: this.player ? this.player.temp : 0.34,
        moving, charging: this.player ? this.player.charging : false,
        distance: 1, enemyEccm: 1 + this.wave * 0.08, enemyLockQuality: 8 + this.wave
      });
      this.teleAt = this.t;
    }
    return this.tele;
  },
  clog(msg) {
    const el = $("combat-log");
    if (!el) return;
    const d = document.createElement("div");
    d.className = "mf-item"; d.style.cursor = "default";
    d.textContent = "[" + fmt(this.t, 1) + "s] " + msg;
    el.insertBefore(d, el.firstChild);
    while (el.children.length > 22) el.removeChild(el.lastChild);
  },
  start() {
    const cv = $("combat-canvas"), f = MF.fit(cv);
    const w = f ? f.w : 900, h = f ? f.h : 540;
    this.active = true; this.paused = false;
    this.player = { x: w / 2, y: h / 2, hp: 100, maxHp: 100, temp: 0.34, core: 0,
      fireCd: 0, dashCd: 0, missileCd: 0, ventCd: 0, vortex: false, charging: false,
      angle: -Math.PI / 2, vx: 0, vy: 0 };
    this.bullets = []; this.enemies = []; this.particles = [];
    this.companion = { order: 0, x: w / 2 - 60, y: h / 2 + 40, fireCd: 0, holdX: w / 2 - 60, holdY: h / 2 + 40 };
    this.wave = 0; this.kills = 0; this.t = 0; this.last = 0; this.tele = null; this.teleAt = -1;
    this.spawnTimer = 0; this.waveDelay = 0; this.ejectCooldown = 0; this.invuln = 0;
    this.shake = 0; this.glitch = 0; this.xp = 0; this.salvage = 0;
    this.mouse = { x: w / 2, y: h / 4, down: false, moved: false };
    const log = $("combat-log"); if (log) log.innerHTML = "";
    this.clog("COMBAT TEST STARTED · " + MF.activeDesign().name + " deployed");
    this.nextWave();
    MF.toast("Combat test started — WASD + mouse, LMB fire, Q/E/R abilities", "ok");
    this.updateHUD(true);
  },
  stop() {
    this.active = false; this.paused = false;
    MF.state.xp += this.xp; MF.state.salvage += this.salvage;
    MF.state.wavesCleared += Math.max(0, this.wave - 1);
    MF.save();
    this.clog("COMBAT TEST STOPPED · " + this.xp + " XP / " + this.salvage + " salvage banked");
    this.drawIdle();
  },
  togglePause() { if (!this.active) return; this.paused = !this.paused; this.clog(this.paused ? "PAUSED" : "RESUMED"); },
  onEnter() { if (!this.active) this.start(); this.updateHUD(true); },
  nextWave() {
    this.wave++;
    const n = Math.min(14, 3 + this.wave * 2);
    const cv = $("combat-canvas"), f = MF.fit(cv, true);
    const w = f ? f.w : 900, h = f ? f.h : 540;
    const boss = this.wave % 3 === 0;
    for (let i = 0; i < (boss ? Math.max(2, n - 2) : n); i++) {
      const edge = Math.floor(Math.random() * 4);
      const x = edge < 2 ? Math.random() * w : (edge === 2 ? -30 : w + 30);
      const y = edge < 2 ? (edge === 0 ? -30 : h + 30) : Math.random() * h;
      this.enemies.push({ x, y, hp: 26 + this.wave * 8, maxHp: 26 + this.wave * 8,
        speed: 26 + this.wave * 3, size: 15, type: "grunt", lock: 0, detected: false,
        fireCd: 1 + Math.random(), angle: 0 });
    }
    if (boss) {
      this.enemies.push({ x: w / 2, y: -50, hp: 260 + this.wave * 55, maxHp: 260 + this.wave * 55,
        speed: 20 + this.wave * 2, size: 34, type: "boss", lock: 0, detected: true,
        fireCd: 1.4, angle: 0 });
    }
    this.clog("WAVE " + this.wave + (boss ? " · BOSS WAVE" : "") + " · " + this.enemies.length + " hostiles");
    MF.toast("WAVE " + this.wave + (boss ? " — BOSS" : ""), boss ? "err" : "ok");
    this.updateHUD(true);
  },
  ability(k) {
    if (!this.active || this.paused || !this.player) return;
    const p = this.player, t = this.telemetry();
    const unreliable = t.powerMargin < 0 && Math.random() < 0.65;
    if (k === "q") {
      if (p.core < 100) { this.clog("BURST CORE failed: charge " + fmt(p.core, 0) + "%"); return; }
      if (unreliable) { this.clog("BURST CORE failed: BROWNOUT"); this.glitch = 0.5; return; }
      p.core = 0;
      this.enemies.forEach((e) => {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 260) this.hitEnemy(e, 65 + t.powerMargin * 0.6);
      });
      this.burst(p.x, p.y, "#ffb347", 40);
      this.clog("BURST CORE discharged");
    } else if (k === "e") {
      if (unreliable) { this.clog("VORTEX SHIELD failed: BROWNOUT"); return; }
      p.vortex = !p.vortex;
      this.clog("VORTEX SHIELD " + (p.vortex ? "UP" : "DOWN"));
    } else if (k === "r") {
      if (p.missileCd > 0) return;
      if (unreliable) { this.clog("MISSILE SALVO failed: BROWNOUT"); return; }
      p.missileCd = 4.5 * t.cooldownMultiplier;
      const targets = this.enemies.slice(0, 5);
      if (!targets.length) { this.clog("MISSILE SALVO: no targets"); return; }
      targets.forEach((e, i) => this.bullets.push({ x: p.x, y: p.y, vx: 0, vy: 0,
        dmg: 30, friendly: true, homing: e, life: 3, size: 4, color: "#ffb347", delay: i * 0.08 }));
      this.clog("MISSILE SALVO · " + targets.length + " locks");
    } else if (k === "v") {
      if (p.ventCd > 0) return;
      p.ventCd = 6; p.temp = Math.max(0.3, p.temp - 0.30);
      this.shake = 0.25; this.burst(p.x, p.y, "#4dd0e1", 22);
      this.clog("FORCED VENT · heat dumped (RCS spike)");
    } else if (k >= "1" && k <= "4") {
      this.companion.order = Number(k) - 1;
      if (this.companion.order === 2 || this.companion.order === 3) {
        this.companion.holdX = this.companion.x; this.companion.holdY = this.companion.y;
      }
      this.clog("COMPANION ORDER: " + ORDERS[this.companion.order]);
    }
    this.updateHUD(true);
  },
  hitEnemy(e, dmg) {
    e.hp -= dmg;
    this.burst(e.x, e.y, e.type === "boss" ? "#ff5f56" : "#ffb347", e.type === "boss" ? 14 : 7);
    if (e.hp <= 0) {
      this.kills++;
      const gain = e.type === "boss" ? 90 : 12;
      this.xp += gain; this.salvage += e.type === "boss" ? 180 : 24;
      if (this.player) this.player.core = clamp(this.player.core + (e.type === "boss" ? 35 : 9), 0, 100);
      this.clog((e.type === "boss" ? "BOSS" : "HOSTILE") + " destroyed · +" + gain + " XP");
    }
  },
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 160;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.35 + Math.random() * 0.5, color });
    }
  },
  update(dt) {
    const cv = $("combat-canvas"), f = MF.fit(cv, true);
    const w = f ? f.w : 900, h = f ? f.h : 540;
    const p = this.player, t = this.telemetry();
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.glitch = Math.max(0, this.glitch - dt * 1.2);
    this.invuln = Math.max(0, this.invuln - dt);
    this.ejectCooldown = Math.max(0, this.ejectCooldown - dt);
    p.fireCd = Math.max(0, p.fireCd - dt); p.dashCd = Math.max(0, p.dashCd - dt);
    p.missileCd = Math.max(0, p.missileCd - dt); p.ventCd = Math.max(0, p.ventCd - dt);
    p.charging = p.core < 100 && (this.mouse.down || !!this.keys.q);

    /* reactor instability: surges, glitches, forced vent, eject */
    if (t.reactor.instability > 0.75 && Math.random() < dt * (t.reactor.instability - 0.6) * 2) {
      this.glitch = 0.45; this.shake = 0.35; p.temp += 0.04;
      p.core = Math.max(0, p.core - 8);
      this.clog("MANA SURGE · HUD flicker / core loss");
    }
    if (t.reactor.meltdown && p.temp > 1.0 && Math.random() < dt * 0.35) {
      if (this.ejectCooldown <= 0) {
        this.ejectCooldown = 20; p.hp = Math.max(p.hp, 34); p.temp = 0.45; this.invuln = 2.5;
        this.burst(p.x, p.y, "#ff5f56", 60);
        this.clog("CONTAINMENT FAILURE · Protocol 3 EJECT · 20 s test cooldown");
      } else {
        this.clog("CONTAINMENT FAILURE · frame lost · test over");
        this.stop(); return;
      }
    }

    /* movement: mass, structural stress, dash cost */
    let mx = 0, my = 0;
    if (this.keys.w) my -= 1; if (this.keys.s) my += 1;
    if (this.keys.a) mx -= 1; if (this.keys.d) mx += 1;
    const len = Math.hypot(mx, my) || 1;
    const speedPx = 35 + t.speed * 12;
    let dash = 1;
    if ((this.keys.shift === true) && p.dashCd <= 0 && (mx || my)) {
      dash = 3.1; p.dashCd = 0.7 + t.dashCost * 0.035;
      p.temp += t.dashCost * 0.004;
      this.burst(p.x, p.y, "#4dd0e1", 12);
    }
    p.x = clamp(p.x + mx / len * speedPx * dash * dt, 18, w - 18);
    p.y = clamp(p.y + my / len * speedPx * dash * dt, 18, h - 18);
    if (this.mouse.moved) p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);

    /* thermal integration + derate + forced vent */
    p.temp = clamp(p.temp + t.netHeat * dt * 0.006 + (this.mouse.down ? dt * 0.012 : 0), 0.1, 1.8);
    if (p.temp > 1.08) {
      p.temp = Math.max(0.55, p.temp - 0.35);
      this.clog("THERMAL SATURATION · FORCED VENT · weapons derated");
      this.shake = 0.3;
    }
    const derate = p.temp > 0.85 ? 0.45 : 1;
    const powerFactor = clamp(0.35 + t.powerMargin / 90, 0.25, 1.5);

    /* fire */
    if (this.mouse.down && p.fireCd <= 0 && !p.vortex) {
      p.fireCd = 0.14 / (0.6 + powerFactor * 0.5) / derate;
      const dmg = 11 * powerFactor * derate;
      this.bullets.push({ x: p.x + Math.cos(p.angle) * 22, y: p.y + Math.sin(p.angle) * 22,
        vx: Math.cos(p.angle) * 470, vy: Math.sin(p.angle) * 470, dmg, friendly: true,
        life: 1.4, size: 3, color: "#4dd0e1" });
      p.temp += 0.006;
    }
    p.core = clamp(p.core + dt * (5 + Math.max(0, t.powerMargin) * 0.10), 0, 100);

    /* companion: 4 orders, fires unless hold fire / wait */
    const cm = this.companion;
    cm.fireCd = Math.max(0, cm.fireCd - dt);
    if (cm.order === 0 || cm.order === 1) {
      cm.x += ((p.x - 55) - cm.x) * Math.min(1, dt * 2.2);
      cm.y += ((p.y + 48) - cm.y) * Math.min(1, dt * 2.2);
    } else { cm.x += (cm.holdX - cm.x) * Math.min(1, dt * 2); cm.y += (cm.holdY - cm.y) * Math.min(1, dt * 2); }
    if ((cm.order === 0 || cm.order === 2) && cm.fireCd <= 0 && this.enemies.length) {
      const e = this.enemies[0];
      const a = Math.atan2(e.y - cm.y, e.x - cm.x);
      this.bullets.push({ x: cm.x, y: cm.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
        dmg: 7, friendly: true, life: 1.6, size: 2.5, color: "#8bd450" });
      cm.fireCd = 0.65;
    }

    /* bullets */
    this.bullets = this.bullets.filter((b) => {
      if (b.delay) { b.delay -= dt; return true; }
      if (b.homing) {
        if (b.homing.hp <= 0) { b.homing = this.enemies[0] || null; }
        if (b.homing) {
          const a = Math.atan2(b.homing.y - b.y, b.homing.x - b.x);
          b.vx += Math.cos(a) * 620 * dt; b.vy += Math.sin(a) * 620 * dt;
          const sp = Math.hypot(b.vx, b.vy), max = 390;
          if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20) return false;
      if (b.friendly) {
        const e = this.enemies.find((x) => Math.hypot(x.x - b.x, x.y - b.y) < x.size + 6);
        if (e) { this.hitEnemy(e, b.dmg); return false; }
      } else {
        if (Math.hypot(p.x - b.x, p.y - b.y) < 17) {
          if (p.vortex && Math.random() < 0.85) { this.burst(b.x, b.y, "#4dd0e1", 5); return false; }
          if (this.invuln <= 0) {
            p.hp -= b.dmg; this.shake = 0.28; this.burst(b.x, b.y, "#ff5f56", 8);
          }
          return false;
        }
      }
      return true;
    });

    /* hostiles: detection from RCS, lock from ECM, aggro, boss waves */
    const aggro = 90 + t.detectRange * 0.30 * MF.coeff("enemySensorFactor");
    this.enemies = this.enemies.filter((e) => {
      if (e.hp <= 0) return false;
      const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
      e.angle = Math.atan2(dy, dx);
      e.detected = e.type === "boss" || dist < aggro || e.detected;
      if (e.detected) {
        const sp = e.speed * (e.type === "boss" ? 0.72 : 1);
        if (dist > 46) { e.x += dx / dist * sp * dt; e.y += dy / dist * sp * dt; }
        e.lock = clamp(e.lock + dt / Math.max(0.35, t.missileLockTime * 0.28) * (1 - t.lockBreak * 0.85), 0, 1.4);
        if (t.jamStrength > 12 && Math.random() < dt * t.lockBreak * 1.6) {
          e.lock = 0; this.clog("ECM LOCK BREAK · hostile reacquiring");
        }
        e.fireCd -= dt;
        if (e.lock >= 1 && e.fireCd <= 0) {
          e.fireCd = e.type === "boss" ? 0.85 : 1.5;
          const n = e.type === "boss" ? 3 : 1;
          for (let i = 0; i < n; i++) {
            const a = e.angle + (i - (n - 1) / 2) * 0.18;
            this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
              dmg: e.type === "boss" ? 9 : 6, friendly: false, life: 2.2, size: 4, color: "#ff5f56" });
          }
        }
      } else { e.x += Math.cos(this.t + e.y) * 6 * dt; }
      if (dist < 24 && this.invuln <= 0) { p.hp -= dt * 8; }
      return true;
    });

    /* particles */
    this.particles = this.particles.filter((q) => {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.life -= dt;
      return q.life > 0;
    });

    /* wave clear / progression */
    if (!this.enemies.length) {
      this.waveDelay += dt;
      if (this.waveDelay > 1.8) {
        this.waveDelay = 0;
        this.xp += 25 + this.wave * 8; this.salvage += 40 + this.wave * 12;
        this.clog("WAVE " + this.wave + " CLEARED · salvage + XP banked");
        this.nextWave();
      }
    }

    /* Protocol 3 auto-eject / game over */
    if (p.hp <= 0) {
      if (this.ejectCooldown <= 0) {
        this.ejectCooldown = 20; p.hp = 34; p.temp = 0.4; this.invuln = 2.5;
        this.burst(p.x, p.y, "#ffb347", 45);
        this.clog("PROTOCOL 3 · AUTO-EJECT · 20 s test cooldown");
        MF.toast("Protocol 3: auto-eject", "err");
      } else {
        this.clog("FRAME DESTROYED · test over");
        this.stop(); return;
      }
    }
  },
  draw() {
    const cv = $("combat-canvas"), f = MF.fit(cv);
    if (!f) return;
    const { ctx, w, h } = f;
    const t = this.telemetry(), p = this.player;
    /* background */
    ctx.fillStyle = "#050a0f"; ctx.fillRect(0, 0, w, h);
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 14);
    ctx.strokeStyle = "#11202c"; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    /* detection + ECM rings */
    ctx.setLineDash([5, 7]); ctx.strokeStyle = "rgba(199,146,234,0.28)";
    ctx.beginPath(); ctx.arc(p.x, p.y, 46 + t.jamStrength * 1.4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,95,86,0.20)";
    ctx.beginPath(); ctx.arc(p.x, p.y, 60 + t.rcsFront * 1.6, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    /* player's baked custom silhouette */
    const d = MF.activeDesign();
    const scale = 13 * clamp(1.0 + d.shape.torsoW / 8, 0.8, 1.5);
    const P = MF.projector("front", 0, 0, scale, p.x, p.y);
    MF.shapeParts(MF.state.bakedShape || d.shape).forEach((b) => {
      MF.draw.box(ctx, b, P, { filled: true, alpha: 0.30, color: "#4dd0e1", strokeAlpha: 0.95 });
    });
    ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 32, p.y + Math.sin(p.angle) * 32); ctx.stroke();
    if (p.vortex) {
      ctx.strokeStyle = "rgba(77,208,225,0.8)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.stroke();
    }
    /* companion */
    const cm = this.companion;
    const PC = MF.projector("front", 0, 0, 8, cm.x, cm.y);
    MF.shapeParts(DATA.chassis.presets.biped).slice(0, 12).forEach((b) =>
      MF.draw.box(ctx, b, PC, { filled: true, alpha: 0.16, color: "#8bd450", strokeAlpha: 0.6 }));
    /* hostiles */
    this.enemies.forEach((e) => {
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
      const col = e.type === "boss" ? "#ff5f56" : "#c792ea";
      ctx.fillStyle = "rgba(20,12,26,0.8)"; ctx.strokeStyle = col; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-e.size, -e.size * 0.55); ctx.lineTo(e.size * 0.75, -e.size * 0.75);
      ctx.lineTo(e.size, 0); ctx.lineTo(e.size * 0.75, e.size * 0.75);
      ctx.lineTo(-e.size, e.size * 0.55); ctx.lineTo(-e.size * 0.55, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
      if (e.lock > 0.15) {
        ctx.strokeStyle = "rgba(255,95,86,0.75)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(e.lock, 0, 1)); ctx.stroke();
      }
      ctx.fillStyle = "#ff5f56"; ctx.fillRect(e.x - e.size, e.y - e.size - 9, e.size * 2 * clamp(e.hp / e.maxHp, 0, 1), 3);
    });
    /* bullets + particles */
    this.bullets.forEach((b) => {
      ctx.fillStyle = b.color || "#fff";
      ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
    });
    this.particles.forEach((q) => { ctx.globalAlpha = clamp(q.life, 0, 1); ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, 3, 3); });
    ctx.globalAlpha = 1;
    /* overlay */
    ctx.fillStyle = "#7e9aab"; ctx.font = "11px monospace";
    ctx.fillText("WAVE " + this.wave + " · HOSTILES " + this.enemies.length + " · KILLS " + this.kills, 10, 18);
    ctx.fillText("POWER " + fmt(t.powerMargin, 1) + " kW · HEAT " + fmt(p.temp, 2) + " · RCS " + fmt(t.rcsFront, 1) +
      " · JAM " + fmt(t.jamStrength, 1) + " · INSTAB " + fmt(t.reactor.instability, 2), 10, h - 12);
    if (t.powerMargin < 0) {
      ctx.fillStyle = "rgba(255,95,86,0.85)"; ctx.font = "bold 14px monospace";
      ctx.fillText(this.glitch > 0 ? "BROWNOUT // HUD FLICKER" : "BROWNOUT // ABILITIES UNRELIABLE", w / 2 - 130, 30);
    }
    if (this.glitch > 0) {
      ctx.fillStyle = "rgba(255,179,71,0.10)";
      for (let i = 0; i < 6; i++) ctx.fillRect(0, Math.random() * h, w, 2 + Math.random() * 3);
    }
    if (this.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffb347"; ctx.font = "bold 22px monospace";
      ctx.fillText("PAUSED", w / 2 - 45, h / 2);
    }
    ctx.restore();
  },
  drawIdle() {
    const cv = $("combat-canvas"), f = MF.fit(cv); if (!f) return;
    const { ctx, w, h } = f;
    ctx.fillStyle = "#050a0f"; ctx.fillRect(0, 0, w, h);
    MF.draw.grid2D(ctx, w, h, 36);
    ctx.fillStyle = "#ffb347"; ctx.font = "bold 18px monospace";
    ctx.fillText("COMBAT TEST · READY", w / 2 - 105, h / 2 - 20);
    ctx.fillStyle = "#7e9aab"; ctx.font = "12px monospace";
    ctx.fillText("Press START COMBAT TEST (or re-enter this tab) to deploy " + MF.activeDesign().name, w / 2 - 240, h / 2 + 8);
    ctx.fillText("Power · mass · heat · RCS · ECM · reactor instability are live consequences.", w / 2 - 240, h / 2 + 28);
  },
  updateHUD(force) {
    if (!force && this.t - this.hudAt < 0.12) return;
    this.hudAt = this.t;
    const t = this.telemetry(), p = this.player;
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    const bar = (id, v) => { const el = $(id); if (el) el.style.width = clamp(v, 0, 100) + "%"; };
    set("combat-wave", this.wave); set("combat-xp", MF.state.xp + this.xp);
    set("combat-salvage", MF.state.salvage + this.salvage);
    set("combat-design", MF.activeDesign().name);
    if (!p) return;
    bar("hud-hp", p.hp); set("hud-hp-v", fmt(p.hp, 0) + "%");
    const pw = clamp(50 + t.powerMargin, 0, 100);
    bar("hud-power", pw); set("hud-power-v", fmt(t.powerMargin, 1) + " kW");
    bar("hud-heat", p.temp / 1.5 * 100); set("hud-heat-v", fmt(p.temp, 2));
    bar("hud-rcs", t.rcsFront / 40 * 100); set("hud-rcs-v", fmt(t.rcsFront, 1) + " m²");
    bar("hud-ecm", t.jamStrength / 80 * 100); set("hud-ecm-v", fmt(t.jamStrength, 1) + " str");
    bar("hud-core", p.core); set("hud-core-v", fmt(p.core, 0) + "%");
    set("hud-speed", fmt(t.speed, 2) + " m/s"); set("hud-mass", fmt(t.totalMass, 0) + " kg");
    set("hud-detect", fmt(t.detectRange, 0) + " m"); set("hud-lock", fmt(t.missileLockTime, 2) + " s");
    set("hud-jam", fmt(t.jamStrength, 1) + " / " + fmt(t.lockBreak, 2));
    set("hud-reactor", fmt(t.reactor.netOutput, 1) + " kW · instab " + fmt(t.reactor.instability, 2));
    set("hud-order", ORDERS[this.companion ? this.companion.order : 0]);
    const vd = $("combat-validation");
    if (vd) vd.innerHTML = MF.ui.validChips(t);
  },
  loop(ts) {
    if (!this.active || MF.state.tab !== "combat") return;
    if (!this.last) this.last = ts;
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    if (!this.paused) this.update(dt);
    if (!this.active) { this.drawIdle(); return; }
    this.draw();
    this.updateHUD(false);
  }
};

MF.tabs.combat = {
  render() { MF.combat.updateHUD(true); },
  update() { MF.combat.updateHUD(true); }
};

/* ------------------------------------------------------------------ input */
(function bindCombatInput() {
  const cv = $("combat-canvas");
  if (cv) {
    cv.onmousemove = function (e) {
      const r = cv.getBoundingClientRect();
      MF.combat.mouse.x = e.clientX - r.left; MF.combat.mouse.y = e.clientY - r.top;
      MF.combat.mouse.moved = true;
    };
    cv.onmousedown = function (e) { if (e.button === 0) MF.combat.mouse.down = true; e.preventDefault(); };
    window.addEventListener("mouseup", () => { MF.combat.mouse.down = false; });
    cv.oncontextmenu = (e) => e.preventDefault();
  }
  const s = $("combat-start"), st = $("combat-stop"), p = $("combat-pause"), v = $("combat-vent");
  if (s) s.onclick = () => MF.combat.start();
  if (st) st.onclick = () => MF.combat.stop();
  if (p) p.onclick = () => MF.combat.togglePause();
  if (v) v.onclick = () => MF.combat.ability("v");
  document.addEventListener("keydown", (e) => {
    if (MF.state.tab !== "combat") return;
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
    MF.combat.keys[k] = true;
    if (["q", "e", "r", "v", "1", "2", "3", "4", "p"].indexOf(k) >= 0) {
      if (k === "p") MF.combat.togglePause(); else MF.combat.ability(k);
    }
    if (["w", "a", "s", "d", " ", "shift"].indexOf(k) >= 0) e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    MF.combat.keys[k] = false;
  });
})();
