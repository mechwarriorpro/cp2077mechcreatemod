# PROCEDURAL_PILOT.md — the full playable 3D test

`PILOT TEST` (tab 07) is a **complete, playable procedural 3D mech test** inside the single
self-contained `test_build.html`. It exists to answer the "you need meshes/rigs/animations"
limitation honestly: we do not ship any of those, we generate equivalents at runtime from numbers.

## What is generated (nothing is loaded)

| Thing | Generator | Source |
|---|---|---|
| Mech mesh | `MF.mesh3d.fromShape()` | `MF.shapeParts(shape)` + `MF.sigGeometry(shape, shape.sig)` descriptors → triangulated chamfered rings, domes, blades, torus rings, cell racks, octahedral joints, truncated nozzle cones |
| Six body plans | `MF.mesh3d.bodyPlan()` | `shape.sig.frame` / `shape.sig.legs` — biped, reverse-joint, quad, hover, tank, flyer |
| Animation | `MF.mesh3d.pose()` + `m3Rotate()` | procedural gait: hip/shoulder rotation, torso sway, head tracking, recoil, hover/quad/flyer variants. No animation clips, no rigs |
| Terrain | `MF.mesh3d.terrain()` | seeded value-noise heightfield, deterministic obstacle placement, procedural skyline |
| Hostiles & waves | `MF.pilot.spawnWave()` | other roster `sig` compositions, low-poly meshes, boss every third wave |
| Materials | `MF.mesh3d.coatMaterials()` | procedural Crystal-Coat-compatible shading (see `docs/COMPAT.md`) |
| Rendering | `MF.mesh3d.render()` | software perspective rasterizer: view basis, painter's-algorithm depth sort, per-face Lambert + metallic specular + rim + flake + wear + emissive + distance fog. Canvas 2D only, no WebGL |

## Controls

`WASD` move · mouse drag look · `LMB` fire · `Shift` dash · `Space` jump jets · `Q` core charge ·
`E` vortex shield · `R` missile salvo · `V` forced vent · **`T` AUTODRIVE** · **`Y` Crystal Coat panel
(hint)** · `C` camera (CHASE → COCKPIT → ORBIT) · `P` pause · `1–4` companion orders.
Buttons: `START`, `STOP`, `PAUSE`, `AUTODRIVE`, `CAMERA`, `NEW TERRAIN SEED`, `GENERATE CET LUA`,
`EXPORT STATE JSON`.

## Consequences are still live

`MF.pilot.telemetry()` calls `MF.sim.compute()` with live temperature, movement and wave ECCM. Power
deficit reduces steering and weapon bus (`BROWNOUT`), heat saturation derates speed, total mass
changes inertia, high RCS shortens hostile detection distance, ECM/jamming changes `lockBreak`, and
reactor instability feeds the reactor readout. Kills award XP/salvage into persistent state;
structure loss triggers **Protocol 3 — eject**.

## Honest scope

This is a **browser prototype**, not a new in-game mech asset. It proves the geometry, gait,
coating, autopilot and combat consequences can be generated procedurally. `0.1.5-test` adds a
separate **CET-only IN-GAME PILOT** that spawns/moves vanilla Cyberpunk 2077 mech entity records
and locks V into a cockpit transform — see `docs/INGAME_PILOT.md`. That in-game layer still ships
no custom meshes, rigs, animations, VO, vehicle seat or mount system; a production-grade custom
mech would need those plus ArchiveXL/TweakXL/Codeware/redscript work and possibly private base-mod
APIs. No third-party or base-mod assets are used.


## 0.1.6-test additions

The **MODEL LIBRARY** tab now supplies a rotatable **full 3D model** and front / side / top
**blueprint traces** for each of the 30 example chassis — the only allowed model sources — and
`DEPLOY IN PILOT` bakes an example's complete shape + signature composition into this procedural
pilot. The CET in-game layer is now **patch 2.31 aware** (CET 1.37.1 + RED4ext, optional Phantom
Liberty record gating). Neither change adds an in-game mesh, rig, animation, seat or mount. See
`docs/FULL_MODELS.md` and `docs/INGAME_PILOT.md`.


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
