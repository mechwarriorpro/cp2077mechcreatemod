/* IN-GAME PILOT — browser-side deploy console for the CET-only in-game layer.
   The browser cannot spawn game entities; it generates the exact CET config,
   a copyable Lua override and a deployment checklist. No external assets. */

MF.ingame = {
  cfg() { return DATA.compat.ingamePilot; },
  coreRecords() { return this.cfg().coreRecords; },
  maxParts() { return Math.min(this.cfg().physics.maxParts, this.cfg().partRecords.length); },
  config() {
    const g = this.cfg();
    const core = MF.state.ingameCore || g.coreRecords[0].id;
    const rec = g.coreRecords.find((x) => x.id === core) || g.coreRecords[0];
    return {
      core: rec.id, coreName: rec.name,
      parts: clamp(Number(MF.state.ingameParts), 0, this.maxParts()),
      camera: g.cameraModes.indexOf(MF.state.ingameCamera) >= 0 ? MF.state.ingameCamera : "CHASE",
      cockpit: MF.state.ingameCockpit !== false
    };
  },

  panelHTML() {
    const g = this.cfg(), c = this.config(), p = g.physics;
    return '<div class="mf-note">The <b>CET-only IN-GAME PILOT</b> spawns mechs that already exist in '
      + 'Cyberpunk 2077 by TweakDB record id (vanilla <b>Militech Minotaur</b> core + drone / android / '
      + 'turret signature parts), moves them every frame and locks V into a cockpit transform. '
      + '<b>No meshes, rigs, animations or base-mod files are shipped.</b></div>'
      + '<div class="mf-kv">'
      + '<span class="k">CORE</span><span>' + esc(c.coreName) + '</span>'
      + '<span class="k">RECORDS</span><span>' + g.coreRecords.length + ' cores · '
      + g.partRecords.length + ' signature parts · ' + g.entityTemplates.length + ' .ent fallbacks</span>'
      + '<span class="k">SPAWNER</span><span>exEntitySpawner.SpawnRecord + WorldTransform</span>'
      + '<span class="k">CONTROLS</span><span>' + g.controls.length + ' CET Bindings · F6 deploy / F7 reset</span>'
      + '<span class="k">CONSEQUENCES</span><span>brownout · heat derate · RCS / ECM in-world locks</span>'
      + '</div>'
      + '<label class="mf-field">CORE CHASSIS RECORD</label>'
      + MF.ui.select("ingame-core", g.coreRecords, c.core, (x) => x.name + " · " + x.role, (x) => x.id)
      + '<label class="mf-field">SIGNATURE PART RECORDS (' + c.parts + ' / ' + this.maxParts() + ')</label>'
      + '<input class="mf-input" type="range" id="ingame-parts" min="0" max="' + this.maxParts()
      + '" step="1" value="' + c.parts + '"> <span class="num" id="ingame-parts-v">' + c.parts + '</span>'
      + '<label class="mf-field">CAMERA MODE</label>'
      + MF.ui.select("ingame-camera", g.cameraModes, c.camera, (x) => x, (x) => x)
      + '<label class="mf-field">COCKPIT LOCK (Teleport V to the mech)</label>'
      + '<label class="mf-note"><input type="checkbox" id="ingame-cockpit"'
      + (c.cockpit ? " checked" : "") + '> ENGAGED — disable if a teleport conflicts with your game</label>'
      + '<div class="mf-row"><button class="mf-btn small" data-act="ingame-checklist">DEPLOY CHECKLIST</button>'
      + '<button class="mf-btn small" data-act="ingame-lua">GENERATE IN-GAME CET LUA</button>'
      + '<button class="mf-btn small" data-act="ingame-records">COPY RECORD IDS</button></div>'
      + '<div class="mf-note">Update rate ' + p.updateHz + ' Hz · ' + esc(g.controls.map((x) => x.key).join(" · "))
      + '. See <b>docs/INGAME_PILOT.md</b>.</div>';
  },

  luaSnippet() {
    const c = this.config(), g = this.cfg();
    const q = (s) => JSON.stringify(String(s));
    return [
      "-- MECHFALL // FORGE 77 — IN-GAME PILOT override (CET init.lua, inside onInit)",
      "-- Source of truth is compat.json -> ingamePilot; regenerate with tools/generate.py.",
      "-- Vanilla game records only. No files are bundled, edited or redistributed.",
      "--",
      "-- exEntitySpawner.SpawnRecord / Spawn / Despawn · Game.FindEntityByID",
      "-- WorldTransform.new():SetPosition / :SetOrientationEuler · entity:SetWorldTransform",
      "-- registerInput + onUpdate · Game.GetTeleportationFacility():Teleport",
      "MF.ingame.coreRecord = " + q(c.core),
      "MF.ingame.coreName = " + q(c.coreName),
      "MF.ingame.partCount = " + c.parts,
      "MF.ingame.cameraMode = " + q(c.camera),
      "MF.ingame.cockpitLock = " + (c.cockpit ? "true" : "false"),
      "MF.ingame.showThreats = true",
      "MF.ingame.setWaypoint(40, 10)",
      "MF.ingame.probe()",
      "-- Deploy: IN-GAME PILOT tab / F6 · Emergency undeploy: F7 (despawns everything)",
      "-- " + g.controls.length + " CET bindings: " + g.controls.map((x) => x.key).join(" ")
    ].join("\n");
  },

  recordsText() {
    const g = this.cfg();
    return ["-- MECHFALL // FORGE 77 — vanilla Cyberpunk 2077 entity records (references only)",
      "-- CORE CHASSIS",
      ...g.coreRecords.map((x) => x.role.padEnd(8) + "  " + x.id + "  -- " + x.name),
      "-- SIGNATURE PARTS",
      ...g.partRecords.map((x) => x.slot.padEnd(12) + "  " + x.id + "  -- " + x.name),
      "-- .ent FALLBACK TEMPLATES (only used when a record is rejected)",
      ...g.entityTemplates.map((x) => x.slot.padEnd(12) + "  " + x.path + "  -- " + x.name),
      "-- No file is shipped. These already exist in the player's game installation."].join("\n");
  },

  checklistHTML() {
    const g = this.cfg(), c = this.config();
    const li = (s) => "<li>" + s + "</li>";
    return '<div class="mf-note">This deploys a <b>CET-only scripted pilot</b> inside Cyberpunk 2077. '
      + 'It is not a new custom mesh. Read the last step before using it.</div>'
      + '<ol class="mf-list">'
      + li('Install <b>Cyber Engine Tweaks</b> (1.38+ for patch 2.5). No Redscript / TweakXL / ArchiveXL / Codeware required.')
      + li('Copy <code>cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/</code> into your CET <code>mods/</code> folder.')
      + li('Load a save in the <b>open world</b> (not the main menu, not paused).')
      + li('Open CET → <b>Bindings</b> and assign all ' + g.controls.length + ' <b>MECHFALL IN-GAME</b> keys: '
        + esc(g.controls.map((x) => x.key).join(" · ")) + '.')
      + li('Open the FORGE 77 overlay → <b>IN-GAME PILOT</b> → <b>PROBE APIs</b>, then <b>DEPLOY</b> (or press <b>F6</b>).')
      + li('Selected core: <b>' + esc(c.coreName) + '</b> (<code>' + esc(c.core) + '</code>) with '
        + c.parts + ' signature parts, <b>' + esc(c.camera) + '</b> camera and cockpit lock '
        + (c.cockpit ? "<b>ON</b>" : "<b>OFF</b>") + '.')
      + li('W/S throttle · A/D turn · Shift dash · Space jump jets · V vent · LMB breaks a lock · C camera · T autodrive.')
      + li('<b>F7 = EMERGENCY UNDEPLOY</b> despawns every entity this mod spawned and releases the cockpit lock.')
      + '</ol>'
      + '<div class="mf-hr"></div><div class="mf-note">' + esc(g.disclaimer) + '</div>'
      + '<div class="mf-note">Requirements: ' + esc(g.requirements.join(" · ")) + '</div>';
  }
};
