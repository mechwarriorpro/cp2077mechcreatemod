/* CUSTOM WEAPON DESIGN — eight categories, fully player-authored parameters.
   Energy weapons · ballistic weapons · missile weapons · melee weapons ·
   energy missiles · energy melee · energy shielding · ballistic shielding.
   Every design feeds the six first-class attributes via MF.sim.compute(). */

MF.weapons = {
  cfg: DATA.weapons,
  draft: null,

  categories() { return this.cfg.categories; },
  params() { return this.cfg.parameters; },
  defaults(cid) {
    const c = this.categories()[cid];
    return c ? Object.assign({}, c.defaults) :
      this.params().reduce((o, p) => (o[p.key] = p.default, o), {});
  },
  draftGet() {
    if (!this.draft) {
      const cid = Object.keys(this.categories())[0];
      this.draft = { category: cid, name: "MY " + this.categories()[cid].label,
        params: this.defaults(cid) };
    }
    return this.draft;
  },
  byId(id) {
    return (MF.state.customWeapons || []).find((w) => w.id === id) ||
      this.cfg.templates.find((w) => w.id === id) || null;
  },
  loadout() { return (MF.state.loadout || []).map((id) => this.byId(id)).filter(Boolean); },
  isEquipped(id) { return (MF.state.loadout || []).indexOf(id) >= 0; },

  /* Six first-class attributes of one designed weapon. */
  six(w) {
    const p = (w && w.params) || {};
    const rate = Math.max(1, Number(p.rate) || 1);
    return {
      powerDraw: Number(p.power) || 0,
      mass: Number(p.mass) || 0,
      heatGen: (Number(p.heat) || 0) * rate / 60 * 0.35,
      heatDiss: 0,
      rcs: Number(p.rcs) || 0,
      ecm: Number(p.ecm) || 0
    };
  },
  dps(w) {
    const p = (w && w.params) || {};
    return (Number(p.damage) || 0) * Math.max(1, Number(p.rate) || 1) / 60;
  },  /* Aggregate the equipped loadout into values the combat / pilot loops use. */
  combatProfile() {
    const out = { fireDamage: 0, fireRate: 0, heatPerShot: 0, dps: 0,
      missileDamage: 0, missileCount: 0, meleeDamage: 0,
      shieldPool: 0, shieldRegen: 0, capacity: 0,
      energy: false, ballistic: false, hybrid: false, names: [], count: 0 };
    this.loadout().forEach((w) => {
      const q = w.params || {}, cat = w.category;
      out.count++; out.names.push(w.name);
      if (/energy/.test(cat)) out.energy = true;
      if (/ballistic/.test(cat)) out.ballistic = true;
      if (/hybrid/.test((this.cfg.categories[cat] || {}).family || "")) out.hybrid = true;
      if (q.capacity > 0) out.capacity += Number(q.capacity) || 0;
      if (/_shield$/.test(cat)) {
        out.shieldPool += Number(q.armor) || 0;
        if (cat === "energy_shield") out.shieldRegen += (Number(q.armor) || 0) * 0.02;
      } else if (/missile/.test(cat)) {
        out.missileDamage += Number(q.damage) || 0;
        out.missileCount += Math.max(1, Math.round((Number(q.capacity) || 12) / 6));
      } else if (/melee/.test(cat)) {
        out.meleeDamage += Number(q.damage) || 0;
      } else {
        out.fireDamage += Number(q.damage) || 0;
        out.fireRate += Math.max(1, Number(q.rate) || 1);
        out.heatPerShot += (Number(q.heat) || 0) * 0.02;
      }
      out.dps += this.dps(w);
    });
    /* Bounded so a full loadout is powerful but never breaks the harness. */
    out.fireDamage = Math.min(420, out.fireDamage);
    out.missileDamage = Math.min(600, out.missileDamage);
    out.meleeDamage = Math.min(500, out.meleeDamage);
    return out;
  },
  sixTotal() {
    const out = { powerDraw: 0, mass: 0, heatGen: 0, heatDiss: 0, rcs: 0, ecm: 0 };
    this.loadout().forEach((w) => {
      const s = this.six(w);
      MF.sixKeys.forEach((k) => { out[k] += s[k] || 0; });
    });
    return out;
  },
  save(name, category, params) {
    const cid = this.categories()[category] ? category : Object.keys(this.categories())[0];
    const id = "cw_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e4).toString(36);
    const w = { id, name: String(name || "CUSTOM WEAPON").toUpperCase().slice(0, 48),
      category: cid, params: Object.assign(this.defaults(cid), params || {}), origin: "custom" };
    MF.state.customWeapons = (MF.state.customWeapons || []).concat([w]);
    MF.save(); MF.toast("Saved custom weapon " + w.name, "ok");
    return w;
  },
  remove(id) {
    MF.state.customWeapons = (MF.state.customWeapons || []).filter((w) => w.id !== id);
    MF.state.loadout = (MF.state.loadout || []).filter((x) => x !== id);
    MF.save(); MF.refreshLive(); MF.damage.ensure(true);
  },
  toggle(id) {
    const L = MF.state.loadout || (MF.state.loadout = []);
    const i = L.indexOf(id);
    if (i >= 0) L.splice(i, 1);
    else if (L.length >= this.cfg.loadoutLimit) {
      MF.toast("Loadout limit " + this.cfg.loadoutLimit + " reached", "err"); return false;
    } else L.push(id);
    MF.save(); MF.refreshLive(); MF.damage.ensure(true);
    MF.toast((i >= 0 ? "Unequipped " : "Equipped ") + (this.byId(id) || {}).name, "ok");
    return true;
  },
  template(cid) {
    const d = this.draftGet();
    d.category = cid; d.name = "MY " + (this.categories()[cid] || {}).label;
    d.params = this.defaults(cid);
    return d;
  },

  /* -------------------------------------------------------------- WEAPON FORGE tab */
  tab: {
    bound: false,
    statsHTML() {
      const W = MF.weapons, tot = W.sixTotal(), L = W.loadout();
      return '<span class="k">LOADOUT</span><span>' + L.length + ' / ' + W.cfg.loadoutLimit +
        ' equipped</span><span class="k">BUS TOTAL</span><span>' + fmt(tot.powerDraw, 1) +
        ' kW</span><span class="k">MASS TOTAL</span><span>' + fmt(tot.mass, 0) +
        ' kg</span><span class="k">HEAT TOTAL</span><span>' + fmt(tot.heatGen, 1) +
        ' kW</span><span class="k">DPS TOTAL</span><span>' +
        fmt(L.reduce((a, w) => a + W.dps(w), 0), 1) + '</span>';
    },
    previewHTML() {
      const W = MF.weapons, d = W.draftGet(), six = W.six({ params: d.params });
      const t = MF.sim.compute(MF.activeDesign());
      return MF.sixKeys.map((k) => MF.ui.barRow(k.toUpperCase(), six[k], 120,
        fmt(six[k], 1), k === "powerDraw" ? "amber" : "cyan")).join("") +
        '<div class="mf-kv"><span class="k">DAMAGE / VOLLEY</span><span>' +
        fmt(d.params.damage, 0) + ' pts</span><span class="k">DPS</span><span>' +
        fmt(W.dps({ params: d.params }), 1) + '</span><span class="k">RANGE</span><span>' +
        fmt(d.params.range, 0) + ' m</span><span class="k">CAPACITY</span><span>' +
        fmt(d.params.capacity, 0) + ' shots</span><span class="k">SHIELD / PLATE</span><span>' +
        fmt(d.params.armor, 0) + ' pts</span></div>' +
        '<div class="mf-note">Bus draw benefits from the module bulk discount; heat scales with rate ' +
        'of fire; shields add destructible HP in DAMAGE CONTROL.</div>' +
        '<h3>ACTIVE ENGINEERING TELEMETRY</h3>' +
        MF.ui.barRow("POWER MARGIN", t.powerMargin, 120, fmt(t.powerMargin, 1) + " kW",
          t.powerMargin < 0 ? "red" : "green") +
        MF.ui.barRow("TOTAL MASS", t.totalMass, 5000, fmt(t.totalMass, 0) + " kg", "cyan") +
        MF.ui.barRow("NET HEAT", t.netHeat, 200, fmt(t.netHeat, 1) + " kW", "amber") +
        MF.ui.barRow("RCS FRONT", t.rcsFront, 40, fmt(t.rcsFront, 1) + " m2", "violet");
    },
    cardsHTML() {
      const W = MF.weapons;
      return W.cfg.templates.concat(MF.state.customWeapons || []).map((w) => {
        const s = W.six(w), cc = W.categories()[w.category] || {};
        return '<div class="weapon-card' + (W.isEquipped(w.id) ? " equipped" : "") + '">' +
          '<h3>' + esc(w.name) + '</h3><div class="mf-note">' + esc(cc.label || w.category) +
          ' · ' + esc(cc.family || "") + ' / ' + esc(cc.role || "") + '</div>' +
          '<div class="mf-note">' + esc(cc.description || w.note || "") + '</div>' +
          '<div class="mf-kv"><span class="k">BUS</span><span>' + fmt(s.powerDraw, 1) +
          ' kW</span><span class="k">MASS</span><span>' + fmt(s.mass, 0) +
          ' kg</span><span class="k">DPS</span><span>' + fmt(W.dps(w), 1) +
          '</span><span class="k">HEAT</span><span>' + fmt(s.heatGen, 1) +
          ' kW</span><span class="k">RCS / ECM</span><span>' + fmt(s.rcs, 1) + ' / ' +
          fmt(s.ecm, 1) + '</span><span class="k">ARMOUR</span><span>' +
          fmt((w.params || {}).armor || 0, 0) + ' pts</span></div>' +
          '<div class="mf-row"><button class="mf-btn small" data-act="weapon-equip" data-v="' +
          esc(w.id) + '">' + (W.isEquipped(w.id) ? "UNEQUIP" : "EQUIP") + '</button>' +
          '<button class="mf-btn small" data-act="weapon-copy" data-v="' + esc(w.id) +
          '">EDIT COPY</button>' +
          (w.origin === "custom" ? '<button class="mf-btn small danger" data-act="weapon-delete" data-v="' +
            esc(w.id) + '">DELETE</button>' : '') + '</div></div>';
      }).join("");
    },
    html() {
      const W = MF.weapons, d = W.draftGet(), c = W.categories()[d.category] || {};
      const sliders = W.params().map((p) => MF.ui.slider(p.key, p.label, p.min, p.max, p.step,
        Number(d.params[p.key] ?? p.default), "weapon", { unit: " " + p.unit })).join("");
      const catOpts = Object.keys(W.categories()).map((k) =>
        '<option value="' + esc(k) + '"' + (k === d.category ? " selected" : "") + '>' +
        esc(W.categories()[k].label) + '</option>').join("");
      return MF.ui.panel("CUSTOM WEAPON DESIGN · 8 CATEGORIES",
        '<div class="mf-note">Design any weapon from raw parameters. <b>Energy weapons</b>, ' +
        '<b>ballistic weapons</b>, <b>missile weapons</b>, <b>melee weapons</b>, ' +
        '<b>energy missiles</b>, <b>energy melee</b>, <b>energy shielding</b> and ' +
        '<b>ballistic shielding</b> all share one editable parameter set. Equipped designs feed ' +
        'live power / mass / heat / RCS / ECM through <code>MF.sim.compute()</code> and add their own ' +
        'destructible parts to <b>DAMAGE CONTROL</b>. No imported meshes, projectiles or assets.</div>' +
        '<div class="mf-kv" id="weapon-loadout-stats">' + this.statsHTML() + '</div>', "violet") +
        '<div class="mf-grid2"><div class="mf-panel"><h2>DESIGN BENCH · ' + esc(c.label || "") + '</h2>' +
        '<label class="mf-field">CATEGORY</label><select class="mf-input" id="weapon-category">' + catOpts + '</select>' +
        '<label class="mf-field">NAME</label><input class="mf-input" id="weapon-name" value="' + esc(d.name) + '">' +
        '<div class="mf-note">' + esc(c.description || "") + ' · traits: ' +
        esc((c.traits || []).join(" · ")) + '</div>' +
        '<div class="mf-slider-grid">' + sliders + '</div>' +
        '<div class="mf-row"><button class="mf-btn primary" data-act="weapon-save">SAVE CUSTOM WEAPON</button>' +
        '<button class="mf-btn small" data-act="weapon-template">RESET TO BASELINE</button></div></div>' +
        '<div class="mf-panel"><h2>LIVE SIX-ATTRIBUTE PREVIEW</h2>' +
        '<div id="weapon-preview">' + this.previewHTML() + '</div></div></div>' +
        MF.ui.panel("LIBRARY · " + (W.cfg.templates.length + (MF.state.customWeapons || []).length) +
          " DESIGNS", '<div class="weapon-grid" id="weapon-cards">' + this.cardsHTML() + '</div>');
    },
    render(sec) {
      if (!this.bound) {
        this.bound = true;
        sec.addEventListener("click", (e) => MF.weaponsTab.onClick(e));
        sec.addEventListener("input", (e) => MF.weaponsTab.onInput(e));
        sec.addEventListener("change", (e) => MF.weaponsTab.onChange(e));
      }
      sec.innerHTML = this.html();
    },
    /* Only refresh sub-panels: replacing sec.innerHTML would break a slider drag. */
    update() {
      const pv = $("weapon-preview"), st = $("weapon-loadout-stats"), cd = $("weapon-cards");
      if (pv) pv.innerHTML = MF.weaponsTab.previewHTML();
      if (st) st.innerHTML = MF.weaponsTab.statsHTML();
      if (cd) cd.innerHTML = MF.weaponsTab.cardsHTML();
    },
    onInput(e) {
      const el = e.target;
      if (el.id === "weapon-name") { MF.weapons.draftGet().name = el.value; return; }
      if (el.dataset && el.dataset.scope === "weapon" && el.dataset.param) {
        MF.weapons.draftGet().params[el.dataset.param] = Number(el.value);
        const pv = $("weapon-preview"); if (pv) pv.innerHTML = MF.weaponsTab.previewHTML();
      }
    },
    onChange(e) {
      if (e.target.id === "weapon-category") {
        MF.weapons.template(e.target.value);
        const sec = $("tab-weapons"); if (sec) sec.innerHTML = MF.weaponsTab.html();
      }
    },
    onClick(e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const W = MF.weapons, a = b.dataset.act, v = b.dataset.v;
      if (a === "weapon-save") {
        const nameEl = $("weapon-name");
        W.save(nameEl ? nameEl.value : W.draftGet().name, W.draftGet().category, W.draftGet().params);
      } else if (a === "weapon-template") W.template(W.draftGet().category);
      else if (a === "weapon-equip") W.toggle(v);
      else if (a === "weapon-copy") {
        const w = W.byId(v); if (!w) return;
        const d = W.draftGet();
        d.category = w.category; d.name = w.name + " COPY"; d.params = Object.assign({}, w.params);
      } else if (a === "weapon-delete") W.remove(v);
      else return;
      const sec = $("tab-weapons"); if (sec) sec.innerHTML = MF.weaponsTab.html();
    }
  }
};
MF.weaponsTab = MF.weapons.tab;
MF.registerTab("weapons", MF.weaponsTab);
