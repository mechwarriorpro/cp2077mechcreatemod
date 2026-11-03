# COMPAT.md — Autodrive + Crystal Coat compatibility

`compat.json` is the single source of truth. This is an **optional compatibility layer**: shared public
concepts, key names and the Crystal Coat share-code format, plus `pcall`-wrapped `GetMod` detection in
CET. It **does not** bundle, patch, require or control any other mod, and it does not redistribute
any base-mod or third-party files.

## Autodrive

- Cyberpunk 2077 **2.3** added vanilla Auto Drive (drive to a tracked map pin, `V` key). Community
  mods: **Auto drive** by nobo (Nexus 14680), **Auto Drive Enhanced** (Nexus 23157), and the
  **Auto Drive CET hotkey for Wander** add-on (Nexus 19309).
- Browser: `MF.compat.autodrive.steer()` is a deterministic waypoint/obstacle-avoidance solver used by
  the `PILOT TEST` autopilot (`T`). Works with no mods installed. `GENERATE CET LUA` emits the link
  state.
- CET (`init.lua`): `MF.compatProbe()` tries `GetMod()` for the names in
  `compat.autodrive.modNames`, wrapped in `pcall`. `MF.compatHandoffWaypoint(x, z)` only calls a
  function if the detected table actually exposes one of the documented method names, also inside
  `pcall`. If nothing is detected it logs the browser fallback and returns `false`. No mod is ever
  required.

## Crystal Coat

- CrystalCoat™ is the native **2.2+** dynamic vehicle paint: a primary colour, a secondary colour, a
  light hue, and paint aspects (metallic / glossy), opened by holding `Y` while seated.
  **Crystal Coat Picker — Hex Codes and Color Library** (Nexus 35571) adds exact hex entry and
  one-line share codes such as `CCP1;P=C81E3C;S=202024;L=200;N=Night Runner`.
- Mechs are **not vehicles**, so FORGE 77 implements a procedural equivalent: `MF.compat.clampCoat()`,
  `encodeCoat()` / `decodeCoat()` (CCP1 format, extended with `A/M/R/F/W/E/D/B` fields for the
  procedural shading parameters), six coat presets, and `MF.mesh3d.coatMaterials()` which shades
  every generated triangle from those values — no textures, no image files.
- The `PILOT TEST` side panel edits primary/secondary hex, aspect, light hue, metallic, roughness,
  flake, wear and emission live; `APPLY CODE` / `COPY CODE` / `SYNC FROM CET` round-trip the share code.
- CET: `MF.compatProbe()` detects the picker with `pcall(GetMod)`, `MF.compatSyncCrystalCoat()` reads
  colours only if the table exposes a known getter, and `MF.compatParseCoat()` /
  `MF.compatEncodeCoat()` handle the CCP1 code. The `COMPAT` ImGui tab exposes all of this.

## CET inter-mod communication

`GetMod()` is CET's documented mechanism for communication between mods, and should be called after
CET has initialized all installed mods (i.e. in `onInit`). All our probes are `pcall`-wrapped, the
module loads cleanly when `GetMod` returns `nil`, and `tools/lua_test.js` verifies the module, its
`onInit`/`onDraw` handlers and the compat functions under a stub where no mods are present.

## What compatibility does **not** mean

The compatibility layer itself does not make a 3D mech driveable inside Cyberpunk 2077, does not
apply real CrystalCoat materials to a game vehicle entity, does not call private base-mod APIs, and
does not ship, modify or redistribute anyone else's files. The **separate** CET-only IN-GAME PILOT
(`docs/INGAME_PILOT.md`) spawns/moves vanilla game entity records, but it still ships no custom
meshes, rigs, animations, VO, vehicle seat or mount system. A production-grade custom mech needs
those plus ArchiveXL/TweakXL/Codeware/redscript work and possibly private base-mod APIs.


## Game-patch matrix (0.1.6-test) — target is 2.31

CET builds are locked to exactly one Cyberpunk 2077 patch; `compat.json → ingamePilot.gamePatches`
is the source of truth used by the browser console, generated CET `init.lua`, checklist and Lua
snippet.


| GAME PATCH | CET build | RED4ext | AutoDrive | Crystal Coat |
|---|---|---|---|---|
| 2.3 | 1.36.0 (`Patch 2.3`) | 1.28.0 | vanilla Auto Drive introduced (tracked pin / `V`) | native 2.2+ |
| **2.31 — target** | **1.37.1** (or 1.37.0 `Patch 2.31`) | **1.29.0 / 1.30.0** | **vanilla Auto Drive UPGRADED in patch 2.31** | native 2.2+ |
| 2.5 | 1.38.0 / 1.38.1 | 1.31.0 | vanilla | native 2.2+ |

> ⚠️ **Do not install CET 1.38.x on patch 2.31.** CET 1.38.0 supports game version 2.5 and
> explicitly drops support for older game patches; the earlier `0.1.5-test` wording "CET 1.38+ for
> 2.5" was wrong for a 2.31 install. CET's own 1.37.1 README says **install RED4ext first**.
> CET exposes `GetVersion()` (its build tag), not a reliable Lua game-version API, so the patch is
> selected manually in the overlay and matched against `compat.json → ingamePilot.gamePatches`.
> No Redscript / TweakXL / ArchiveXL / Codeware is needed for this CET-only path.

**AutoDrive on 2.31:** CD Projekt Red's official patch 2.31 notes list an **AutoDrive upgrade**
(alongside Photo Mode, vignette, RT/path-tracing and stability changes). FORGE 77 does **not** call
the vanilla AutoDrive system — `MF.compat.autodrive.steer()` is a self-contained waypoint solver and
`T` in PILOT TEST / the CET `autodrive` binding only drives our own transform. Therefore the 2.31
AutoDrive upgrade **does not change our compat notes** beyond recording that the vanilla feature was
upgraded; no compatibility claim with the upgraded vanilla system is made. Crystal Coat is native
since 2.2 and remains a procedural equivalent on all three patches.

**Conflicting third-party data:** `2077mods.com/compatibility` lists CET 1.38.1 as working on 2.31.
Official CET release notes for 1.38.0 say earlier game patches are no longer supported. We follow
the official CET / Nexus archive evidence and flag the conflict rather than asserting either way.

## Full models / traces (examples only)

`models.json` is the closed library of 30 example-derived full models + front / side / top traces.
Only these examples are allowed; no imported, ripped, extracted or third-party geometry. See
`docs/FULL_MODELS.md`.


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


---

## 0.1.8-test

Real shipped 3D meshes + independent side/top traces for all 30 example-only models; designed
weapons now fire (with destructible, regenerating shields); 10 CET ImGui tabs; example-model-driven
in-game part layout; generated reactor/threshold data with a CET↔browser parity harness; four
complete (still NOT installed / compiled / in-game verified) integration specs;
`build_hooks_appendix()` wired into ROSTER. See `README.md` §9 and `CHANGELOG.md`.


---

## 0.1.9-test — original mesh exports, no ripped assets

`tools/export_meshes.py` exports the 30 example-only `models.json` meshes as
**original** glTF 2.0 `.glb` + `.obj` geometry into `assets/original_meshes/`
(892 parts / 10,704 triangles), with SHA256 provenance and a `--check` drift
test wired into `validate.py --strict`. Box triangles are now outward-wound.
**No ripped, extracted, imported, third-party or base-mod assets** — this sandbox
has no game install, no archives, no WolvenKit and no asset-host route, and this
GitHub repo is public. Exports are **NOT INSTALLED / NOT COMPILED / NOT BUILT
INTO AN ARCHIVE / NOT IN-GAME VERIFIED**; CET-only install path over vanilla
records is unchanged. See `docs/ORIGINAL_MESH_PIPELINE.md`.
