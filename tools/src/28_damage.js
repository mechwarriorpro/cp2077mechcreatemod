/* PER-PART DESTRUCTION MODEL — every individual part is destructible.
   Cockpit > 70% damage OR torso sections > 90% aggregate damage => FULL
   DESTRUCTION + automatic pilot emergency eject. Thresholds live in damage.json
   and are mirrored in the CET in-game pilot. No game assets are touched. */

MF.damage = {
  cfg: DATA.damage,
  state: null,

  sectionOf(p) {
    const a = String(p.anchor || ""), n = String(p.name || "");
    const hay = (a + " " + n).toLowerCase();
    if (this.cfg.cockpitAnchors.indexOf(a) >= 0 || /cockpit|canopy|pilot seat/.test(hay)) return "cockpit";
    if (this.cfg.torsoAnchors.indexOf(a) >= 0) return "torso";
    if (/shield|plate|emitter|deflector/.test(hay)) return "shield";
    if (/weapon|gun|blade|mount|missile/.test(hay)) return "weapon";
    if (/arm|leg|foot|actuator|joint|knee/.test(hay)) return "limb";
    return "system";
  },

  /* Build one damage record for every physical part of the active chassis. */
  create(shape, design) {
    const src = MF.shapeParts(shape || MF.state.shape || {});
    const parts = src.map((p, i) => {
      const section = this.sectionOf(p);
      const bulk = Math.max(0.2, (Number(p.w) || 1) * (Number(p.h) || 1) * (Number(p.d) || 1));
      const maxHp = Math.round((this.cfg.baseHp[section] || 80) * (0.75 + Math.min(bulk, 12) * 0.035));
      return { id: p.anchor + "#" + i, anchor: p.anchor, name: p.name, group: p.group,
        section, hp: maxHp, maxHp, destroyed: false };
    });
    (MF.state.loadout || []).forEach((id, i) => {
      const w = MF.weapons && MF.weapons.byId(id);
      if (!w) return;
      const isShield = /shield$/.test(w.category);
      const section = isShield ? "shield" : "weapon";
      const maxHp = Math.round((this.cfg.baseHp[section] || 80) +
        (Number((w.params || {}).armor) || 0) * 0.35);
      parts.push({ id: "weapon#" + i, anchor: w.id, name: w.name, group: "weapon",
        section, hp: maxHp, maxHp, destroyed: false });
    });
    return { parts, log: [], cursor: 0, ejected: false, destroyed: false,
      reason: "", designName: design && design.name ? design.name : "ACTIVE FRAME" };
  },

  ensure(force) {
    if (!this.state || force) {
      this.state = this.create(MF.state.shape, MF.activeDesign());
      this.note("DAMAGE MODEL online · " + this.state.parts.length + " individually destructible parts");
    }
    return this.state;
  },
  note(msg) {
    const st = this.state; if (!st) return;
    st.log.unshift(String(msg));
    while (st.log.length > 40) st.log.pop();
  },
  byId(st, id) { return st.parts.find((x) => x.id === id); },
  fraction(parts) {
    let hp = 0, max = 0;
    parts.forEach((p) => { hp += p.hp; max += p.maxHp; });
    return max > 0 ? clamp(1 - hp / max, 0, 1) : 0;
  },
  cockpitDamage(st) { return this.fraction(st.parts.filter((p) => p.section === "cockpit")); },
  torsoDamage(st) { return this.fraction(st.parts.filter((p) => p.section === "torso")); },
  overallDamage(st) { return this.fraction(st.parts); },
  aliveParts(st) { return st.parts.filter((p) => !p.destroyed); },

  hit(st, id, amount) {
    const p = this.byId(st, id); if (!p || st.destroyed) return null;
    const before = p.hp;
    p.hp = Math.max(0, p.hp - Math.max(0, Number(amount) || 0));
    if (p.hp <= 0 && !p.destroyed) {
      p.destroyed = true;
      this.note("PART DESTROYED · " + p.name + " (" + p.section.toUpperCase() + ")");
    } else this.note("HIT · " + p.name + " -" + fmt(before - p.hp, 0) + " HP");
    return this.evaluate(st);
  },
  hitPct(st, id, pct) {
    const p = this.byId(st, id); if (!p) return null;
    return this.hit(st, id, p.maxHp * (Number(pct) || 0));
  },
  /* Deterministic incoming fire: rotate through living parts so every part can be hit. */
  incoming(st, amount, pct) {
    if (st.destroyed) return null;
    const alive = this.aliveParts(st);
    if (!alive.length) return this.destroy(st, "ALL PARTS DESTROYED");
    const p = alive[st.cursor % alive.length];
    st.cursor = (st.cursor + 1) % Math.max(1, alive.length);
    return this.hit(st, p.id, pct !== undefined ? p.maxHp * pct : amount);
  },
  destroyPart(st, id) {
    const p = this.byId(st, id); if (!p) return null;
    p.hp = 0; p.destroyed = true;
    this.note("PART DESTROYED · " + p.name);
    return this.evaluate(st);
  },
  thresholds(st) {
    const t = this.cfg.thresholds, c = this.cockpitDamage(st), o = this.torsoDamage(st);
    return { cockpit: c, torso: o, cockpitLimit: t.cockpitDestruction, torsoLimit: t.torsoDestruction,
      cockpitExceeded: c > t.cockpitDestruction, torsoExceeded: o > t.torsoDestruction };
  },
  evaluate(st) {
    if (st.destroyed) return st;
    const q = this.thresholds(st);
    if (q.cockpitExceeded) return this.destroy(st, "COCKPIT > " + Math.round(q.cockpitLimit * 100) + "% DAMAGE");
    if (q.torsoExceeded) return this.destroy(st, "TORSO SECTIONS > " + Math.round(q.torsoLimit * 100) + "% AGGREGATE DAMAGE");
    if (q.cockpit > 0.5) this.note("WARNING · cockpit canopy critical");
    if (q.torso > 0.7) this.note("WARNING · torso structure critical");
    return st;
  },

  /* FULL DESTRUCTION: every part destroyed, pilot ejected, run over. */
  destroy(st, reason) {
    if (st.destroyed) return st;
    st.parts.forEach((p) => { p.hp = 0; p.destroyed = true; });
    st.destroyed = true; st.ejected = true; st.reason = reason || "FULL DESTRUCTION";
    this.note("FULL DESTRUCTION · " + st.reason);
    this.note("PILOT EMERGENCY EJECT · canopy blown, cockpit lock released");
    if (MF.pilot && MF.pilot.active) { MF.pilot.active = false; MF.pilot.clog("MECH DESTROYED — PILOT EJECTED"); }
    if (MF.combat && MF.combat.active) { MF.combat.active = false; MF.combat.clog("MECH DESTROYED — PILOT EJECTED"); }
    MF.toast("FULL DESTRUCTION — PILOT EJECTED (" + st.reason + ")", "err");
    MF.refreshLive();
    return st;
  },
  eject(st, manual) {
    if (st.destroyed) return st;
    st.ejected = true;
    this.note((manual ? "MANUAL EMERGENCY EJECT (E)" : "AUTOMATIC EMERGENCY EJECT") +
      " · pilot clear, cockpit lock released, ORBIT camera");
    if (MF.pilot) { MF.pilot.active = false; MF.pilot.cameraMode = "ORBIT"; MF.pilot.clog("EMERGENCY EJECT"); }
    if (MF.combat && MF.combat.active) { MF.combat.active = false; MF.combat.clog("EMERGENCY EJECT"); }
    MF.toast("PILOT EMERGENCY EJECT", "warn");
    MF.refreshLive();
    return st;
  },
  repair(st) {
    st.parts.forEach((p) => { p.hp = p.maxHp; p.destroyed = false; });
    st.ejected = false; st.destroyed = false; st.reason = ""; st.cursor = 0;
    this.note("ALL PARTS REPAIRED · mech operational");
    MF.toast("All parts repaired", "ok");
    MF.refreshLive();
    return st;
  },
  statusText(st) {
    if (st.destroyed) return "DESTROYED · " + st.reason;
    if (st.ejected) return "PILOT EJECTED";
    const q = this.thresholds(st);
    if (q.cockpitExceeded || q.torsoExceeded) return "CRITICAL";
    if (q.cockpit > 0.5 || q.torso > 0.7) return "DAMAGED";
    return "OPERATIONAL";
  },

  /* ------------------------------------------------------------- compact HUD */
  hudHTML(st) {
    const q = this.thresholds(st);
    return MF.ui.barRow("COCKPIT", q.cockpit * 100, 100, fmt(q.cockpit * 100, 0) + "% / " +
      fmt(q.cockpitLimit * 100, 0) + "% LIMIT", q.cockpitExceeded ? "red" : "amber") +
      MF.ui.barRow("TORSO", q.torso * 100, 100, fmt(q.torso * 100, 0) + "% / " +
        fmt(q.torsoLimit * 100, 0) + "% LIMIT", q.torsoExceeded ? "red" : "amber") +
      MF.ui.barRow("OVERALL", this.overallDamage(st) * 100, 100,
        fmt(this.aliveParts(st).length, 0) + " / " + st.parts.length + " PARTS ALIVE", "green") +
      '<div class="mf-note">' + esc(this.statusText(st)) + ' · ' +
      esc(this.cfg.eject.key) + ' = EMERGENCY EJECT</div>';
  },

  /* ------------------------------------------------------------- DAMAGE tab */
  tab: {
    render(sec) {
      if (!this.bound) {
        this.bound = true;
        sec.addEventListener("click", (e) => MF.damageTab.onClick(e));
      }
      sec.innerHTML = MF.damageTab.html();
    },
    update(sec) { if (sec) sec.innerHTML = MF.damageTab.html(); },
    html() {
      const st = MF.damage.ensure(), q = MF.damage.thresholds(st), c = MF.damage.cfg;
      const groups = {};
      st.parts.forEach((p) => { (groups[p.section] = groups[p.section] || []).push(p); });
      const order = ["cockpit", "torso", "limb", "system", "weapon", "shield"];
      const rows = order.filter((g) => groups[g]).map((g) => {
        const list = groups[g].map((p) => {
          const pct = 100 * p.hp / p.maxHp;
          return '<div class="mf-part-row' + (p.destroyed ? " dead" : "") + '">' +
            '<span class="nm">' + esc(p.name) + '</span>' +
            '<div class="mf-bar"><i class="' + (p.destroyed ? "red" : pct < 35 ? "amber" : "green") +
            '" style="width:' + fmt(pct, 0) + '%"></i></div>' +
            '<span class="num">' + (p.destroyed ? "DEAD" : fmt(pct, 0) + "%") + '</span>' +
            '<button class="mf-btn tiny" data-act="damage-hit" data-v="' + esc(p.id) + '">HIT 10%</button>' +
            '<button class="mf-btn tiny" data-act="damage-kill" data-v="' + esc(p.id) + '">DESTROY</button>' +
            '</div>';
        }).join("");
        return '<div class="mf-panel tight"><h3>' + g.toUpperCase() + ' · ' + groups[g].length +
          ' PARTS</h3><div class="mf-note">' + esc(c.sections[g] || "") + '</div>' + list + '</div>';
      }).join("");
      return MF.ui.panel("PER-PART DESTRUCTION · PILOT EMERGENCY EJECT",
        '<div class="mf-note">Every individual part below has its own HP and can be destroyed. ' +
        '<b>Full destruction</b> fires automatically when <b>cockpit damage &gt; ' +
        fmt(c.thresholds.cockpitDestruction * 100, 0) + '%</b> <b>OR</b> ' +
        '<b>aggregate torso-section damage &gt; ' +
        fmt(c.thresholds.torsoDestruction * 100, 0) + '%</b>. Either one ejects the pilot, ' +
        'destroys every part and ends the run. Manual <b>' + esc(c.eject.key) +
        '</b> eject is always available. Damage is simulation data, not edited game assets.</div>' +
        MF.damage.hudHTML(st), "red") +
        '<div class="mf-row"><button class="mf-btn small" data-act="damage-incoming">INCOMING HIT 10%</button>' +
        '<button class="mf-btn small" data-act="damage-incoming25">INCOMING HIT 25%</button>' +
        '<button class="mf-btn small" data-act="damage-kill-random">DESTROY RANDOM PART</button>' +
        '<button class="mf-btn small" data-act="damage-eject">EMERGENCY EJECT (' + esc(c.eject.key) + ')</button>' +
        '<button class="mf-btn small" data-act="damage-destroy">FULL DESTRUCTION</button>' +
        '<button class="mf-btn small" data-act="damage-repair">REPAIR ALL</button>' +
        '<button class="mf-btn small" data-act="damage-rebuild">REBUILD FROM ACTIVE FRAME</button></div>' +
        '<div class="mf-note">STATUS <b>' + esc(MF.damage.statusText(st)) + '</b> · ' +
        esc(st.designName) + ' · ' + st.parts.length + ' parts · cockpit ' +
        fmt(q.cockpit * 100, 1) + '% / torso ' + fmt(q.torso * 100, 1) + '%</div>' +
        '<div class="damage-grid">' + rows + '</div>' +
        MF.ui.panel("EVENT LOG", '<div class="mf-list short">' +
          st.log.map((x) => '<div>' + esc(x) + '</div>').join("") + '</div>');
    },
    onClick(e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const st = MF.damage.ensure(), a = b.dataset.act, v = b.dataset.v;
      if (a === "damage-hit") MF.damage.hitPct(st, v, 0.10);
      else if (a === "damage-kill") MF.damage.destroyPart(st, v);
      else if (a === "damage-incoming") MF.damage.incoming(st, 0, 0.10);
      else if (a === "damage-incoming25") MF.damage.incoming(st, 0, 0.25);
      else if (a === "damage-kill-random") {
        const alive = MF.damage.aliveParts(st);
        if (alive.length) MF.damage.destroyPart(st, alive[st.cursor % alive.length].id);
      } else if (a === "damage-eject") MF.damage.eject(st, true);
      else if (a === "damage-destroy") MF.damage.destroy(st, "MANUAL FULL DESTRUCTION");
      else if (a === "damage-repair") MF.damage.repair(st);
      else if (a === "damage-rebuild") MF.damage.ensure(true);
      else return;
      const sec = $("tab-damage"); if (sec) sec.innerHTML = MF.damageTab.html();
    }
  }
};
MF.damageTab = MF.damage.tab;
MF.registerTab("damage", MF.damageTab);

/* Global E = emergency eject (works in every tab). */
document.addEventListener("keydown", (e) => {
  if (String(e.key || "").toLowerCase() !== "x") return;
  const tag = e.target && e.target.tagName ? String(e.target.tagName).toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  MF.damage.eject(MF.damage.ensure(), true);
  const sec = $("tab-damage");
  if (sec && MF.state.tab === "damage") sec.innerHTML = MF.damageTab.html();
});
MF.damage.ensure();
