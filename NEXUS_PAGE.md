# NEXUS_PAGE.md — **DRAFT · DO NOT PUBLISH**

> This is a draft description only. It must not be published until (a) base-mod permission is
> settled in writing with the authors of Nexus mod 35041, (b) the CET mod has been tested in-game
> against the target patch CP2077 2.31 (CET 1.37.1), and (c) the Donation Points question is resolved. See `PERMISSIONS.md`.

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
- **Full playable procedural 3D PILOT TEST**: your shape vector + signature parts are triangulated
  into a real 3D mech mesh at runtime; seeded-noise terrain, a procedural walk cycle, chase/cockpit/
  orbit cameras, jump jets, waves and bosses. No meshes, rigs, textures or animation files are loaded.
- **Autodrive + Crystal Coat compatibility**: built-in procedural autopilot (`T`) with optional CET
  `pcall(GetMod)` waypoint hand-off, and a Crystal-Coat-compatible procedural coat (primary, secondary,
  light hue, metallic/glossy/matte/crystal aspect) with `CCP1` hex share codes and six presets.
  Compatible concepts and optional detection only — no other mod is bundled or required.
- **Three test surfaces**: one self-contained `test_build.html` (no install), the procedural 3D pilot
  test inside it, and a CET-only ImGui overlay with 7 tabs including **IN-GAME PILOT**.
- **IN-GAME PILOT (EXPERIMENTAL)**: a CET-only layer spawns the vanilla **Militech Minotaur** and
  drone/android/turret signature parts by TweakDB record id, moves them each frame, reads continuous
  CET input, locks V into a cockpit/chase/orbit transform, and applies brownout / heat / RCS / ECM
  consequences in the actual game world. `F6` deploy, `F7` emergency undeploy. **Vanilla record
  references only — no custom mesh, rig, animation, VO, vehicle seat or base-mod file is shipped.**
  Not verified in-game from this repo; see `docs/INGAME_PILOT.md`.

### Requirements (draft)

- Browser prototype: any modern browser. No install, no network, no external assets.
- CET overlay: Cyber Engine Tweaks. Base mod + its requirements are **optional**, not bundled.
- CP2077 2.5 + Phantom Liberty for the **external base-mod context** only.
- **This project's target patch is 2.31**: CET 1.37.1 + RED4ext 1.29.0/1.30.0. CET 1.38.x is for
  2.5 and drops 2.31 support. Phantom Liberty is optional (PL-only records skipped by default).

### Installation (draft)

1. Open `test_build.html` for the full prototype.
2. For the in-game overlay, copy `cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/`
   into your CET `mods` folder, bind the **MECHFALL // FORGE 77** hotkey and the 12
   **MECHFALL IN-GAME** bindings, load an open-world save, then press `F6` (deploy) / `F7` (reset).
3. Never install the `.example` files under `docs/integration/` into `r6/scripts`.

### Permissions / credits (draft)

- BT-7274 mod by whatmynickname & sdh0 — **referenced only, no files used**. Permission required
  before using or modifying its assets; no re-uploads; no Donation Points on derivative asset use.
- Franchise names are textual study references. All graphics are procedural canvas wireframes.
- Original code: CC BY-NC-SA 4.0 with IP carve-outs.

### Known limitations (draft — keep this section, do not soften)

Browser prototype + CET UI + an **experimental CET-only in-game pilot**. The `PILOT TEST` is a
**playable procedural 3D mech generated at runtime** — no shipped meshes, rigs, animation clips or
textures. The CET IN-GAME PILOT spawns and moves **vanilla game entities by record reference** and
locks V to a cockpit transform, but it is **not a new custom mech asset**: no custom mesh, rig,
animation set, VO, physics collider, vehicle seat, mount system or private base-mod integration is
shipped. Spawned NPCs use normal game AI and may be hostile. It is verified only by Lua/JS tests in
this repo, not by running Cyberpunk 2077. Autodrive / Crystal Coat compatibility is optional
detection and shared public formats, not bundled or controlled mods. A production-grade mech still
needs real meshes, rigs, animations, VO, ArchiveXL/TweakXL/Codeware/redscript work and possibly
private base-mod APIs.

### Signature parts

Original procedural **signature-part library** (`chassis.json → signatureParts`, 7 slots / 59 part types). Each of the 30 prefabs and 7 shape presets ships a unique `shape.sig` composition, and MECH FORGE lets the player mix them: cockpit pods, cranial skulls, reverse-joint and splayed legs, tetrapod skirts, ether wings, booster fins, missile racks, blade arms, shields, crests, hover discs, tracked siege hulls and legless flight frames. These are original **component TYPES** drawn with canvas geometry — no ripped models, textures, traced silhouettes or base-mod files.

### Compatibility scope

See `docs/COMPAT.md` and `docs/INGAME_PILOT.md`. Auto drive is vanilla CP2077 2.3 (`V` key) with community variants
(Nexus 14680 / 23157 / 19309); CrystalCoat is native 2.2+ (hold `Y`) with the
Crystal Coat Picker hex/share-code mod (Nexus 35571). FORGE 77 uses the same public fields,
key names and share-code format in its own procedural implementations, and CET detects the mods with
`pcall(GetMod)`. It does not ship, patch or control them. A fully custom pilotable mech inside CP2077 still needs
real meshes, rigs, animations, VO, the game itself and private base-mod APIs.


### MODEL LIBRARY (0.1.6-test)

`models.json` + the tenth browser tab add **full models and front / side / top traces for the 30
example chassis — and only those examples**. Complete shape vectors, signature-part compositions,
component polygons and internal mounting bays; no imported / ripped / extracted geometry. Custom
designs still mix example parts freely. See `docs/FULL_MODELS.md`.


---

## 0.1.7-test additions

Reactor / energy design is **more forgiving** (outputScale 56, derate 0.26, `moduleDrawScale`
0.72, `bulkModuleDiscount` 0.42, relaxed brownout / thermal / mass thresholds) so a maximum
module loadout stays powered. **WEAPON FORGE** adds eight player-authored weapon / shield
categories (energy, ballistic, missile, melee, energy missiles, energy melee, energy shielding,
ballistic shielding). **DAMAGE CONTROL** makes every individual part destructible with a pilot
emergency eject (`X`); cockpit > 70% or aggregate torso > 90% damage triggers FULL DESTRUCTION.
See `docs/WEAPON_FORGE.md`, `docs/DAMAGE_MODEL.md` and `README.md` section 8. No imported assets
or in-game meshes are added; the 2.31 CET matrix and the 30-example-only model policy are
unchanged.
