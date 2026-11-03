# NEXUS_PAGE.md — **DRAFT · DO NOT PUBLISH**

> This is a draft description only. It must not be published until (a) base-mod permission is
> settled in writing with the authors of Nexus mod 35041, (b) the CET mod has been tested in-game
> against CP2077 2.5, and (c) the Donation Points question is resolved. See `PERMISSIONS.md`.

---

## MECHFALL // FORGE 77 (TEST BUILD)

**Design your own mech. Tear apart the famous ones. Stress-test the engineering.**

Forge 77 is a *custom mech engineering sandbox* and an optional companion layer for
**Titanfall BT-7274 (Quest and Companion)**. It is not a mech roster. You author the chassis shape
and limbs from scratch and every internal subsystem — **power use, weight, heat generation and
dissipation, radar cross section and ECM** — then deploy your build into a combat test harness.

### Highlights (draft copy)

- **Fully custom chassis**: 20 shape parameters (including thruster size and jump jet count), **mixable signature parts across 7 slots** (cockpit pods, skull heads, ether wings, missile racks, reverse-joint/splayed legs, hover discs, blade arms, shields, crests, tracked hulls, flight frames), front/side elevations and a drag-to-orbit 3D
  wireframe. Bake your silhouette and watch *your* shape fight.
- **Player-designed internals**: blank-slate authoring for power buses, thermal loops, mass and
  structure, signature/RCS, ECM/EW, sensors, actuators, mana reactors and freeform components.
- **Real consequences**: brownouts, thermal saturation, CoM offset, structural stress, RCS exposure,
  ECM self-detection, mana starvation, lattice overflow, crystal resonance, containment failure.
- **Mana reactor**: flow, growth, atmospheric mana, crystal efficiency/size/grade, containment and
  biome. Bigger crystal = more power, much more instability.
- **Teardown table**: 30 chassis / 6 factions as **sleek mech wireframes with 30 distinct silhouettes** (six body plans) built from tapered/wedge hulls,
  joints, swept fins and nozzle bells. See **where every internal mounts**, then route and balance
  **power bus and coolant/heat transfer** between those parts. `AUTO ROUTE`, `STRESS FIT`,
  `APPLY FIT → FORGE`, INTERNALS trees with six attributes per sub-component, salvage, blueprints
  and reactor telemetry. Thrusters, jump jets, radiators, capacitors, coolant manifolds, power
  buses, sensors and vent panels are all first-class parts.
- **Two test surfaces**: one self-contained `test_build.html` (no install) and a CET-only ImGui
  overlay for in-game telemetry.

### Requirements (draft)

- Browser prototype: any modern browser. No install, no network, no external assets.
- CET overlay: Cyber Engine Tweaks. Base mod + its requirements are **optional**, not bundled.
- CP2077 2.5 + Phantom Liberty for the base-mod context.

### Installation (draft)

1. Open `test_build.html` for the full prototype.
2. For the in-game overlay, copy `cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/`
   into your CET `mods` folder and bind the **MECHFALL // FORGE 77** hotkey.
3. Never install the `.example` files under `docs/integration/` into `r6/scripts`.

### Permissions / credits (draft)

- BT-7274 mod by whatmynickname & sdh0 — **referenced only, no files used**. Permission required
  before using or modifying its assets; no re-uploads; no Donation Points on derivative asset use.
- Franchise names are textual study references. All graphics are procedural canvas wireframes.
- Original code: CC BY-NC-SA 4.0 with IP carve-outs.

### Known limitations (draft — keep this section, do not soften)

Browser prototype + CET UI only. No new meshes, rigs, animations, pilotable 3D mech, VO or private
base-mod APIs. A full release would need all of those plus the game itself.

### Signature parts

Original procedural **signature-part library** (`chassis.json → signatureParts`, 7 slots / 59 part types). Each of the 30 prefabs and 7 shape presets ships a unique `shape.sig` composition, and MECH FORGE lets the player mix them: cockpit pods, cranial skulls, reverse-joint and splayed legs, tetrapod skirts, ether wings, booster fins, missile racks, blade arms, shields, crests, hover discs, tracked siege hulls and legless flight frames. These are original **component TYPES** drawn with canvas geometry — no ripped models, textures, traced silhouettes or base-mod files.
