# CHANGELOG.md

## 2026-11-03 — in-game pilotable mechs via CET (0.1.5-test)

- **New top-priority deliverable: a CET-only IN-GAME PILOT.** The browser procedural pilot is no
  longer the only playable mech. `tools/lua_ingame.part` (injected into the generated `init.lua`)
  spawns the vanilla **Militech Minotaur** (`Character.q003_militech_mech`) plus eight drone /
  android / spiderbot / turret signature parts with `exEntitySpawner.SpawnRecord`, resolves them
  asynchronously with `Game.FindEntityByID`, and moves them every frame via `WorldTransform`,
  `SetPosition` / `SetOrientationEuler` and `entity:SetWorldTransform`.
- **Continuous real controls**: 12 `registerInput` bindings + `registerForEvent("onUpdate")` drive
  throttle, turn, dash, jump jets, vent, fire/lock-break, camera, autodrive, deploy (`F6`) and
  emergency undeploy (`F7`). `Game.GetTeleportationFacility():Teleport` locks V into COCKPIT /
  CHASE / ORBIT at a throttled 30 Hz, gated by `IsPreGame()` / `IsGamePaused()`.
- **Engineering consequences in the game world**: `MF.compute()` telemetry drives speed, power
  deficit brownout (45 % throttle), thermal derate (60 %), and RCS / self-emission / ECM risk that
  spawns or breaks real in-game drone locks. Venting temporarily raises detection risk.
- **Graceful degradation**: every game call is `pcall`-wrapped; missing `exEntitySpawner` or
  rejected records fall back to three `.ent` templates, then PHANTOM cockpit-only mode. A failed
  teleport disables cockpit lock instead of spamming the game. `F7` despawns everything spawned.
- **7th CET ImGui tab `IN-GAME PILOT`**: PROBE APIs, deploy/undeploy, core record selector,
  signature part count, camera mode, cockpit lock, autodrive, in-world locks, live engineering bars,
  binding list and event log.
- **Browser deploy console**: `PILOT TEST → IN-GAME PILOT (CET)` with a DEPLOY CHECKLIST modal,
  `GENERATE IN-GAME CET LUA`, `COPY RECORD IDS`, core/signature/camera/cockpit selectors persisted
  in state (`tools/src/88_ingame.js`, `body.html`, `87_pilot.js`, `00_core.js`).
- **Data-driven**: `compat.json → ingamePilot` is the single source of truth (5 core records, 8
  part records, 3 `.ent` fallbacks, 12 controls, physics/camera config, requirements, sources and
  an honest disclaimer). `tools/generate.py` embeds a compact copy into the CET Lua and documents
  the records in `ROSTER.md`.
- **Docs/tests**: new `docs/INGAME_PILOT.md`; README / DESIGN (R13) / NEXUS_PAGE / PERMISSIONS /
  AssetManifest / CET README updated. `tools/validate.py --strict` now checks the in-game data,
  HTML tokens, CET Lua API tokens and doc presence; `tools/smoke_test.js` exercises the deploy
  console; `tools/lua_test.js` stubs the CET game APIs and runs deploy → 40 onUpdate frames →
  jump/vent/fire/camera/autodrive → RCS lock/ECM break → undeploy.
- **Honest limit**: this is a scripted CET pilot over **vanilla game entities referenced by record
  id**, not a new custom mesh, rig, animation set, VO, physics collider, vehicle seat or mount
  system. No base-mod files or ripped franchise assets are bundled. Not verified inside the game
  from this repo. Redscript / TweakXL / ArchiveXL remain `.example` templates only.

## 2026-11-03 — procedural 3D pilot test + Autodrive / Crystal Coat compatibility (0.1.4-test)

- **New `PILOT TEST` tab (09 tabs total): a full playable procedural 3D mech test.**
  `tools/src/25_mesh3d.js` triangulates the existing `MF.shapeParts()` / `MF.sigGeometry()`
  descriptors into a real 3D mesh (chamfered rings, domes, blades, torus rings, cell racks, joints,
  nozzle cones), generates a seeded-noise heightfield with obstacles and skyline, and renders it with
  a software perspective rasterizer (painter depth sort, per-face Lambert + metallic specular + rim
  light + flake + wear + emissive + fog). No WebGL, meshes, textures or external assets.
- **Procedural animation**: `MF.mesh3d.pose()` generates a gait (hip/shoulder swing, torso sway, head
  tracking, recoil) with variants for quad, hover, tank and flyer body plans. No rigs or clips.
- **Playable**: WASD + mouse look, dash, jump jets with plumes, fire/Q/E/R abilities, vent, three
  cameras (CHASE / COCKPIT / ORBIT), waves and bosses, waypoints, XP/salvage, Protocol 3 eject, and
  live brownout / heat derate / mass inertia / RCS detection / ECM lock-break / reactor telemetry.
- **Autodrive compatibility**: `compat.json` records the CP2077 2.3 vanilla Auto Drive + `V` key and
  the community mods (Nexus 14680 / 23157 / 19309). `MF.compat.autodrive.steer()` is a
  dependency-free waypoint/obstacle-avoidance solver used by the `T` autopilot; CET probes `GetMod`
  with `pcall` and only hands off a waypoint when a known method exists.
- **Crystal Coat compatibility**: procedural CrystalCoat-equivalent fields (primary, secondary, light
  hue, paint aspect, metallic/roughness/flake/wear/emission) shade every generated triangle;
  `CCP1;P=…;S=…;L=…;N=…` share codes round-trip, six presets ship, and the CET `COMPAT` tab parses,
  encodes and optionally syncs colours. Mechs are not vehicles — this is a compatible parameter set,
  not a claim of in-game CrystalCoat support.
- CET `init.lua` gains a 6th `COMPAT` tab, `MF.compatProbe()`, `MF.compatHandoffWaypoint()`,
  `MF.compatSyncCrystalCoat()`, `MF.compatParseCoat()` / `MF.compatEncodeCoat()`; all optional and
  `pcall`-wrapped. Verified under a stub where `GetMod` returns `nil`.
- `tools/generate.py` embeds `compat.json` (8 data sections); validator, smoke tests, Lua runtime
  test, docs (`docs/PROCEDURAL_PILOT.md`, `docs/COMPAT.md`) and the test package were updated.
- **Still honest**: browser prototype only. In-game piloting needs meshes, rigs, animations, VO, the
  game itself and private base-mod APIs. No other mod's files are bundled or redistributed.

## 2026-11-03 — signature-part silhouettes + player mixing (0.1.3-test)

- **The 30 prefabs no longer share one generic biped.** Added `chassis.json → signatureParts`: 7 slots /
  59 original procedural part types, and a unique `shape.sig` composition for every roster chassis and
  all 7 shape presets (30/30 distinct).
- **Six body plans** now render: biped, reverse-joint, spider/tetrapod with four splayed leg columns,
  legless hover disc, low tracked siege hull, and legless flight frame. `MF.sigGeometry()` swaps whole
  torsos, heads, shoulders, back packs, arms, weapons, legs and accents instead of scaling one hull.
- **New procedural primitives**: wedge hulls, ellipsoid domes, capsule pods, swept blades, reactor
  rings and cell racks, plus solid dark-panel shell rendering for HANGAR / FORGE views (the TEARDOWN
  wireframe still shows internals).
- **MECH FORGE → `SIGNATURE PARTS`**: six slot selectors and up to three accent chips;
  `RANDOMIZE` rolls the part mix, `RESET`/preset/blank/`USE AS TEMPLATE` carry `sig`, and baked
  silhouettes, import/export, dossier and combat all use the same composition.
- 10 `sig*` mounting anchors added to every teardown part set (42–44 parts each) with explode
  directions; `DOSSIER` gains a signature composition table.
- Validator now requires the library, unique compositions, valid slot ids, the UI selectors and
  renderer entry points. Strict validation, smoke tests, Lua parse/runtime and a 30-mech visual
  regression render all pass. No third-party or base-mod assets were imported.

## 2026-11-03 — sleek mech wireframe + fit/transfer balancing (0.1.2-test)

- **Replaced the boxy wireframe with a sleek procedural mech wireframe.** `MF.shapeParts()` now
  generates tapered octagonal hulls (waisted torso, flared shoulders, sloped canopy), chamfered
  rings, joint rings, swept armour/radiator fins, RAM vent panels and flared nozzle bells with
  exhaust cones. No more "group of boxes". HANGAR thumbnails and MECH FORGE use the same geometry.
- **Internals now show where components physically mount.** `MF.draw.mech()` draws a labelled
  mounting bay per part, exploded step-by-step, and highlights the selected bay.
- **Power / heat transfer is the core of TEARDOWN.** Three toggleable layers (`WIREFRAME`,
  `INTERNALS FIT`, `POWER / HEAT FLOW`), routed bus trunks with branch stubs, heat runs to the
  nearest radiator and a green coolant return loop. `MF.sim.fitBalance()` computes per-bay draw,
  line loss (`draw × k × distance`), effective dissipation, thermal margin and flags
  `BUS OVERDRAW` / `COOLANT SATURATION` / `HOT SPOT` / `TRANSFER LOSS` / `UNROUTED NODE`.
- New controls: `AUTO ROUTE`, `STRESS FIT`, `RESET FIT`, `APPLY FIT → FORGE` (writes a consequential
  freeform subsystem), plus `BUS CAPACITY` and `COOLANT FLOW` sliders and a routing table.
- **New mech parts:** vector thrusters, jump jet pods, jet packs, radiator banks, capacitor banks,
  coolant manifolds, power bus spines, sensors, vent/RAM panels, arm actuators. 9 new internals
  assemblies (20 total) and 12 new assembly components (38 total), all with the six attributes.
- **20 shape parameters**: added `thrusterSize` and `jumpJetCount` to every preset and all 30
  roster shapes; new `FULL MODELING TABLE` sliders and a new `MECH FORGE` heading.
- `teardowns.json` gains `view.modes`, `view.geometry`, `view.fit` and new explode directions;
  `simulation.json` gains 5 fit validation states, 2 transfer equations and a trade-off.
- Docs, validator and smoke test rewritten for the new renderer, fit simulation and parts.

## 2026-11-03 — initial test build (0.1.0-test)

**From zero project code to a playable prototype + CET-only test mod.**

- Data layer as single source of truth: `simulation.json`, `reactors.json`, `subsystems.json`,
  `chassis.json` (30 prefabs / 6 factions), `components.json`, `teardowns.json`.
- `tools/generate.py` emits `test_build.html`, `ROSTER.md` and the CET `init.lua`; `--check` detects
  drift. All generated outputs are committed so the deliverable needs no build step.
- **INTERNAL SYSTEMS LAB** built first (the emphasis): blank-slate subsystem authoring, 9 categories
  incl. `freeform`, live six-attribute derivation, power budget bar, mass/CoM/inertia, thermal map,
  0–360° RCS polar plot, ECM coverage ring, dependency graph, trade-off matrix, validation list,
  equations with live substitutions, `STRESS TEST`, `EXPORT SUBSYSTEM JSON`, `GENERATE CET LUA`,
  `SEND TO FORGE`.
- **REACTOR LAB**: mana equations, 6 teardown presets, 6 biomes, live 30 s chart, crystal-size vs
  power vs stability curve, configurable exponents, surges / forced vents / containment failure.
- **MECH FORGE**: 20 shape sliders, 5 styles, 7 shape presets, front + side + drag-to-orbit 3D
  wireframes with grid and dimension labels, `RANDOMIZE` / `RESET` / `BAKE SHAPE`, prefab assembly
  mode, subsystem hookup, internals tree.
- **TEARDOWN TABLE**: exploded procedural wireframe, step-through separation, clickable parts,
  INTERNALS trees (shoulder actuator, reactor core, leg, EW suite, etc.), salvage / blueprints /
  reactor telemetry, `COMPARE`.
- **COMBAT TEST**: player-baked silhouette, WASD + mouse, Q/E/R, Shift dash, V vent, 1–4 companion
  orders, waves + bosses, Protocol 3, XP/salvage, and live consequences for power, mass, heat, RCS,
  ECM and reactor instability.
- HANGAR, DOSSIER, SETTINGS (all coefficients/exponents editable, import/export all state).
- CET-only ImGui mod with hangar/systems/forge/reactor/settings, pcall-wrapped optional hooks,
  hotkey toggle; redscript/TweakXL/ArchiveXL remain `.example` templates.
- `tools/validate.py`, `tools/build_package.py`, `tools/smoke_test.js`, `tools/lua_test.js`,
  `.github/workflows/validate.yml`, `push_to_github.sh`, `.gitignore`.
- Balance: `outputScale` converts mana throughput to kW; `heatLoad` is a size-independent flow duty
  so doubling crystal size gives ≈1.8× gross power and ≈3× instability exactly; reactor heat and
  crystal RCS are counted once. Browser and CET telemetry agree within rounding.
- No ripped assets, no base-mod files, honest capabilities disclaimer.

## Open questions (defaults chosen, change in SETTINGS/data if needed)

1. Franchise names are canonical textual references; shipped shapes are original procedural ones.
2. Repo name / visibility / license: `mechfall-forge`, public, CC BY-NC-SA 4.0 (carve-outs).
3. GitHub auth: provided by the Arena connection; `push_to_github.sh` also checks `gh auth status`.
4. Meltdown: Protocol 3 auto-eject with a 20 s test cooldown; repeat failure ends the test.
5. Exponents for `S`, `F`, RCS and ECM: config in `reactors.json` / `simulation.json`.
6. Target patch: CP2077 2.5 + Phantom Liberty (current base mod).
