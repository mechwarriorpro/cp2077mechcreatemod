# DESIGN.md — canonical definition

> **MECHFALL // FORGE 77** is a simulation-grade **custom mech engineering sandbox**. The player
> authors the frame, the limbs and every internal subsystem — power, mass, thermal, signature and
> electronic warfare — then stress-tests that design in combat. Famous mechs exist only to be
> studied, torn apart and mined for parts.

## Priority

~75% fully custom mechs/chassis + player-designed internal subsystems · ~15% prefab/teardown
library · ~10% combat test harness (exists to prove custom builds work).

The five non-negotiable, first-class, visible, editable and consequential quantities are:
**power use**, **weight**, **heat generation / dissipation**, **radar cross section**, **ECM**.

## Requirements map

| # | Requirement | Where |
|---|---|---|
| R1 | Optional companion layer for BT-7274 (Nexus 35041); never bundles/edits its files | `README.md`, `PERMISSIONS.md`, `docs/BaseModHooks.md` |
| R2 | Fully custom chassis + limbs: parametric editor, **mixable signature-part library (7 slots)**, six distinct body plans, front/side/drag-to-orbit wireframe, baked combat silhouette, **procedural 3D pilot mesh + gait**; both prefab lists and full modeling table | `MECH FORGE`, `PILOT TEST`, `tools/src/20_render.js`, `25_mesh3d.js`, `70_ui_forge.js`, `chassis.json → signatureParts` |
| R3 | Blank-slate subsystem authoring, saved as reusable component; six attributes | `INTERNAL SYSTEMS`, `subsystems.json`, `10_sim.js` |
| R4 | Power / mass+CoM+inertia / heat / RCS by aspect / ECM with gauges, warnings, consequences | `10_sim.js`, `60_ui_systems.js`, `85_combat.js` |
| R5 | Mana reactor: F, G, A, η, S, Q, C, W, L; bigger crystal = more power, more unstable; biome ambient mana | `REACTOR LAB`, `reactors.json`, `docs/REACTOR_MODEL.md` |
| R6 | Teardown: **sleek mech wireframe** (signature hulls / domes / blades / rings / racks / joints / fins / nozzles), physical internals fit, power + heat transfer routing/balancing, step-through separation, INTERNALS tree with six attributes, salvage/blueprints/telemetry | `TEARDOWN`, `teardowns.json`, `20_render.js`, `40_ui_teardown.js` |
| R7 | ~30 chassis / 6 factions as examples, teardown sources, templates; `UNLOCK ALL (TEST MODE)` | `chassis.json`, `HANGAR`, `ROSTER.md` |
| R8 | Hostiles, boss waves, hangar selector, salvage/XP — test harness only | `85_combat.js`, `30_ui_hangar.js` |
| R9 | 9 browser tabs: HANGAR · TEARDOWN · REACTOR LAB · INTERNAL SYSTEMS · MECH FORGE · COMBAT TEST · PILOT TEST · DOSSIER · SETTINGS; 7 CET ImGui tabs incl. IN-GAME PILOT | `tools/src/body.html`, `90_main.js`, `tools/init.lua.template` |
| R10 | "Full test mod" = browser prototype + CET-only `init.lua` + **CET-only in-game pilot**; redscript/TweakXL/ArchiveXL `.example` only | `test_build.html`, `cet_mod/.../init.lua`, `tools/lua_ingame.part`, `docs/integration/` |
| R11 | Local repo with README, `.gitignore`, Actions workflow, `push_to_github.sh`, `git bundle` | this repository |
| R12 | No ripped IP assets, no base-mod files, honest disclaimer | `PERMISSIONS.md`, `README.md` §6 |
| R13 | In-game pilotable mechs: spawn/move vanilla CP2077 entity records by TweakDB id, continuous CET input, cockpit lock, in-world RCS/ECM consequences, emergency undeploy | `compat.json → ingamePilot`, `tools/lua_ingame.part`, `tools/src/88_ingame.js`, `docs/INGAME_PILOT.md` |

## Data model

- A **design** = `{ shape (20 params), subsystemIds, reactor params, hardpoints, origin }`.
- A **subsystem** = `{ name, category, params }` → derived `{ powerDraw, mass, heatGen,
  heatDiss, rcs, ecm }` plus category-specific outputs (brownoutThreshold, surgeTolerance,
  transmissionLoss, thermalMass, hotspots, rcsMultiplier, jamStrength, lockBreak, selfEmissions,
  quickhackResist, detectionRange, cooldownMultiplier, speed, dodge, heatPerMove, …).
- A **teardown part** = `{ anchor, name, internalsKey }` → INTERNALS tree, each sub-component with
  the same six attributes.
- A **reactor** = 9 parameters → throughput, gross output, instability, net output, heat load,
  crystal signature, resonance, meltdown.

## Derived model (equations shown live in the UI)

```
powerUsed    = Σ subsystem.powerDraw
powerMargin  = reactor.netOutput - powerUsed              // <0 => BROWNOUT
totalMass    = frame.mass + Σ part.mass + payload
speed        = baseSpeed * (1 - k1*totalMass/massRef) * (1 - k2*structuralStress)
heatGen      = reactor.heat + Σ part.heatGen + movementHeat + ecmHeat
heatDiss     = Σ radiator.area * coolantFlow * efficiency
netHeat      = heatGen - heatDiss
temperature += netHeat * dt / thermalMass               // >1 => DERATE / VENT / MELTDOWN
rcs          = shapeFactor(facets, torsoW, limbStance) * materialFactor(RAM, coating)
             + crystalSignature(S, η) + activeEmissions(jammer, radar, charge)
detectRange  = k * sqrt(rcs) * enemySensorFactor
jamStrength  = jammerPower * antennaGain / (dist^2 * enemyECCM)
lockBreak    = clamp(jamStrength - enemyLockQuality, 0, 1)
selfEmissions= jammerPower * (LPI ? 0.25 : 1.0)        // jamming makes you visible
```

All constants/exponents are in `simulation.json` / `reactors.json` and editable in **SETTINGS**.
`rcsPolar` is sampled at 36 angles (0–360°) with aspect lobes from panel gaps and edge alignment.

## Trade-offs that are visible in the UI

- Radiator area ↓ heat but ↑ RCS and mass.
- RAM / stealth coating ↓ RCS but ↑ mass and traps heat.
- Larger mana crystal ↑ gross power, ↑ instability, ↑ heat, ↑ resonance RCS.
- Active ECM ↑ power draw, ↑ heat, ↑ self-emissions; passive/EMCON is quiet but weak.
- Heavy armour ↑ mass, inertia and heat retention; stealth shaping constrains limb geometry.
- Power deficit → brownouts (abilities fail, HUD flicker); heat saturation → weapon derate + vents;
  high RCS → hostiles detect and lock faster; ECM breaks locks but paints you as a target.

## Architecture

`tools/src/*.js` + `app.css` + `body.html` are concatenated by `tools/generate.py` into one
`<script>`/`<style>` pair inside `test_build.html`, with all six JSON files embedded as an inline
`<script type="application/json">`. No build step is needed by the end user. Canvas is the only
rendering surface. `MF.shapeParts` builds **sleek procedural mech geometry** — tapered/wedge hulls,
ellipsoid domes, capsule pods, swept blades, reactor rings, cell racks, chamfered joint rings and flared
nozzle bells — from the 20 shape parameters **merged with `MF.sigGeometry(shape, shape.sig)`**. Signature
slots change the body plan (biped, four-leg, hover, tank, flyer) and swap whole limbs, heads, shoulders,
back packs and accents, so all 30 prefabs have distinct silhouettes. `MF.draw.mech` adds exploded separation, physical
internals mounting bays and routed bus/heat/coolant lines. `MF.sim.fitBalance` turns each bay's six
attributes into real power draw, transfer loss, heat generation and effective dissipation, with
`BUS OVERDRAW`, `COOLANT SATURATION`, `HOT SPOT` and `TRANSFER LOSS` flags. `APPLY FIT → FORGE`
writes the fit into a freeform subsystem so it changes the deployable build. `MF.sim` is the pure simulation core; `MF.draw` owns procedural wireframes;
`MF.tabs.*` are the eight UI panels; `MF.combat` is the harness; `MF.store` is persistence with a
sandboxed-iframe fallback.

### Signature parts

Original procedural **signature-part library** (`chassis.json → signatureParts`, 7 slots / 59 part types). Each of the 30 prefabs and 7 shape presets ships a unique `shape.sig` composition, and MECH FORGE lets the player mix them: cockpit pods, cranial skulls, reverse-joint and splayed legs, tetrapod skirts, ether wings, booster fins, missile racks, blade arms, shields, crests, hover discs, tracked siege hulls and legless flight frames. These are original **component TYPES** drawn with canvas geometry — no ripped models, textures, traced silhouettes or base-mod files.

### Procedural 3D pilot + optional compatibility

`tools/src/25_mesh3d.js` triangulates `MF.shapeParts()` into a genuine 3D mesh, generates a seeded-noise
world and animates a procedural gait; `tools/src/87_pilot.js` is the full playable test with waves,
bosses, three cameras and live power/mass/heat/RCS/ECM consequences. `tools/src/86_compat.js` +
`compat.json` provide a dependency-free Autodrive steering solver and a Crystal-Coat-compatible
procedural coating with CCP1 share codes. `tools/init.lua.template` adds `COMPAT` as an optional
`pcall(GetMod)` detection tab. See `docs/PROCEDURAL_PILOT.md` and `docs/COMPAT.md`.

The CET `init.lua` is generated from the same JSON and mirrors the telemetry math; the browser owns
the visual modeling table and combat canvas, while CET provides an in-game ImGui test surface.

## In-game pilot (R13)

`compat.json → ingamePilot` is the source of truth for the CET-only in-game pilot injected from
`tools/lua_ingame.part`. It references **vanilla game records** (`Character.q003_militech_mech`, the
Militech Minotaur; Arasaka mechs; spider tank; orbital robot) plus drone/android/turret signature
parts. `exEntitySpawner.SpawnRecord` spawns them, `WorldTransform` + `entEntity:SetWorldTransform`
move them each frame, `registerInput` + `onUpdate` read continuous controls, and
`Game.GetTeleportationFacility():Teleport` locks V into COCKPIT / CHASE / ORBIT. `MF.compute()`
drives brownout, thermal derate, speed and in-world RCS/ECM lock consequences. `F7` despawns
everything. All calls are `pcall`-wrapped; PHANTOM mode degrades gracefully. **It is a scripted
pilot over existing entities, not a new mesh/rig/animation asset** — see `docs/INGAME_PILOT.md`
for the exact limitation. No base-mod files, ripped assets or unvalidated `.reds`/YAML are installed.
