# MECHFALL // FORGE 77

> **A simulation-grade custom mech engineering sandbox** — an optional companion layer for the
> **Titanfall BT-7274 (Quest and Companion)** mod for Cyberpunk 2077 (Nexus 35041).

The point is **fully custom mech creation**, not a roster of famous mechs. You author the frame,
the limbs and every internal subsystem — power, mass, thermal, signature and electronic warfare —
then stress-test that design in combat. Famous mechs exist only to be studied, torn apart and mined
for **part types** — never their assets.

**Priority:** ~75% fully custom chassis + player-designed internal subsystems · ~15% prefab/teardown
library · ~10% combat test harness (it exists to prove custom builds work).

---

## 1. Two deliverables, one repo

| Deliverable | What it is | How to run it |
|---|---|---|
| **`test_build.html`** | **Main playable prototype.** One self-contained file: inline CSS/JS, canvas graphics, inline JSON data. No CDN, no fonts, no images, no network. | Open it in any modern browser (double-click). Works inside a sandboxed iframe; `localStorage` failures fall back to in-memory state. |
| **`cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua`** | **CET-only CP2077 test mod.** ImGui overlay with hangar, subsystem authoring, forge params, reactor lab, settings, compat bridges and an **IN-GAME PILOT** tab that spawns/moves vanilla mech entity records and locks V into a cockpit transform. Live power / mass / heat / RCS / ECM bars with in-world consequences. Generated from the same JSON files. | Copy the `cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/` folder into `Cyberpunk 2077/bin/x64/plugins/cyber_engine_tweaks/mods/`. Requires Cyber Engine Tweaks. Open the overlay with **MECHFALL // FORGE 77**, press `F6` to deploy, `F7` to emergency undeploy. |

**`0.1.6-test`: full models / traces from the 30 examples only, plus a patch-2.31-aware CET pilot.** CET spawns the vanilla **Militech Minotaur**
(`Character.q003_militech_mech`) plus drone/android/turret signature parts by TweakDB record id,
moves them every frame with `WorldTransform` / `SetWorldTransform`, reads continuous controls with
`registerInput` + `onUpdate`, and locks V to a COCKPIT / CHASE / ORBIT transform with
`Game.GetTeleportationFacility():Teleport`. No meshes, rigs, animations or base-mod files are
bundled — every game call is `pcall`-wrapped and falls back to PHANTOM mode. See
**`docs/INGAME_PILOT.md`** for the deploy checklist and the honest limits.

Optional **Autodrive** and **Crystal Coat** compatibility is a data-driven bridge (`compat.json`):
procedural equivalents in the browser plus `pcall(GetMod)` detection in CET. No other mod is bundled,
required, patched or redistributed.

### Full models & traces — examples only

`0.1.6-test` adds `models.json` and a tenth browser tab, **MODEL LIBRARY**. **The 30 example chassis
in `chassis.json` are the only allowed full models and traces.** Each of the 30 entries carries its
own complete 20-parameter shape vector, its signature-part composition, and front / side / top
blueprint traces with physical internal mounting bays. Generic untyped hulls, numeric-only scaling
and any geometry from outside those examples are rejected (`MF.models.isAllowed()`); MECH FORGE
refuses to BAKE a design that is not example-derived. Players still mix example parts freely — the
restriction is on **model sources**, not customisation. Regenerate from the examples with
`python3 tools/build_models.py`. See **`docs/FULL_MODELS.md`**.

### Patch matrix — the target is CP2077 2.31

CET builds are **patch-locked** and this project targets game patch **2.31**, not 2.5.

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

Phantom Liberty is **optional**: PL-only mech / drone records are skipped unless you tick
**PHANTOM LIBERTY INSTALLED** in the IN-GAME PILOT tab (browser console *and* CET overlay).

Redscript, TweakXL and ArchiveXL stay as **`.example` templates only** under `docs/integration/`.
They are deliberately **not installed**: redscript compiles `r6/scripts` at launch and a syntax error
breaks the user's game. The installable path is CET-only.

---

## 2. Quick start (browser)

1. Open `test_build.html`.
2. **INTERNAL SYSTEMS** is the default tab and the emphasis. Click **CREATE NEW SUBSYSTEM**,
   pick a category (or `FREEFORM` to author the six attributes directly), name it, move the sliders,
   **SAVE**, **INSTALL**. Watch the power budget bar, mass/CoM readout, thermal map, 0–360° RCS polar
   plot, ECM coverage ring, dependency graph, trade-off matrix and validation list change live.
3. **REACTOR LAB** — tune `manaFlow`, `manaGrowthRate`, `rawAtmosphericManaInput`, efficiency,
   `crystalSize`, grade, containment, coolant and filtration. Bigger crystal = more power, much more
   instability. Run the 30 s sim. **SEND TO FORGE**.
4. **MECH FORGE** — `FULL MODELING TABLE`: 20 shape parameters (incl. thruster size + jump jet
   count) **plus `SIGNATURE PARTS`**: six part-slot selectors and up to three accent chips so you can
   mix characteristic components from the study frames into your own design. Front + side elevations
   and a drag-to-orbit 3D view with grid and dimension labels. `RANDOMIZE`, `RESET`, `BAKE SHAPE`.
   `PREFAB ASSEMBLY` is the alternative mode (pick a frame/limb set). Hook up your subsystems.
5. **TEARDOWN** — a **sleek mech wireframe** built from signature part geometry: tapered and
   wedge hulls, domes, pods, swept blades, rings, cell racks, joint rings, swept fins, radiators and
   nozzle bells. Six body plans (biped, reverse-joint, four-leg spider/tetrapod, legless hover disc,
   tracked siege hull, legless flyer) mean no two prefabs share a silhouette. Toggle **WIREFRAME**, **INTERNALS FIT**
   (physical mounting bays showing where every sub-component sits) and **POWER / HEAT FLOW**
   (routed bus trunks, heat runs to radiators, coolant return loop). Fit and balance are the point:
   `AUTO ROUTE`, bus/coolant sliders, `STRESS FIT`, `APPLY FIT → FORGE`, plus **SCAN INTERNALS**,
   **EXTRACT TO INVENTORY**, **USE AS TEMPLATE**, **COMPARE**. Every part and sub-component shows
   all six attributes; long bus/coolant runs cost transfer losses and hot bays flag overloads.
6. **COMBAT TEST** — `WASD` + mouse, `LMB` fire, `Q/E/R` abilities, `Shift` dash, `V` vent,
   `1–4` companion orders, `P` pause. Your baked silhouette fights. Brownouts, heat derates, mass
   inertia, RCS detection, ECM lock breaks and reactor surges are live consequences.
7. **PILOT TEST** — the **full playable procedural 3D test**: a mech mesh triangulated from your
   shape vector + signature parts, seeded-noise terrain, procedural gait, six body plans, chase /
   cockpit / orbit cameras, waves and bosses, jump jets, XP/salvage and all six telemetry
   consequences. `T` engages **AUTODRIVE**; the side panel edits a **CRYSTAL COAT**-compatible
   procedural coating with CCP1 share codes. Everything is generated at runtime — no meshes, rigs,
   textures or animation files. See `docs/PROCEDURAL_PILOT.md` and `docs/COMPAT.md`.
8. **HANGAR**, **DOSSIER**, **SETTINGS** — prefab/teardown library with `UNLOCK ALL (TEST MODE)`,
   full engineering dossier, and all simulation exponents as editable config.

### Signature parts — distinct shapes, no ripped assets

Original procedural **signature-part library** (`chassis.json → signatureParts`, 7 slots / 59 part types). Each of the 30 prefabs and 7 shape presets ships a unique `shape.sig` composition, and MECH FORGE lets the player mix them: cockpit pods, cranial skulls, reverse-joint and splayed legs, tetrapod skirts, ether wings, booster fins, missile racks, blade arms, shields, crests, hover discs, tracked siege hulls and legless flight frames. These are original **component TYPES** drawn with canvas geometry — no ripped models, textures, traced silhouettes or base-mod files. The library is data-driven: `MF.sigGeometry()` in `tools/src/20_render.js` turns each slot into procedural geometry, and the same composition drives HANGAR thumbnails, MECH FORGE, TEARDOWN and the baked COMBAT sprite. `USE AS TEMPLATE` loads a prefab's part mix straight into the Forge.

### Full playable test — and what it still is not

`PILOT TEST` is a real, playable 3D mech generated entirely from numbers: `MF.mesh3d.fromShape()`
triangulates the shape/signature descriptors, `MF.mesh3d.pose()` generates a walk cycle, and
`MF.mesh3d.render()` is a software perspective rasterizer with procedural Crystal-Coat shading.

**The CET IN-GAME PILOT now goes further:** inside Cyberpunk 2077 it spawns and moves mech entities
that already exist in the game by TweakDB record id, and locks V to a cockpit transform. That is a
genuine in-game pilot layer, but it is a **scripted CET pilot over vanilla entities**, not a new
custom mech asset. It adds no mesh, rig, animation set, VO, vehicle seat, mount system or private
base-mod integration, and it cannot be verified in-game from this repo. A production-grade custom
mech still needs real meshes, rigs, animations, VO, ArchiveXL/TweakXL/Codeware/redscript work and
possibly private base-mod APIs — none of which are shipped or claimed. See `docs/INGAME_PILOT.md`.

Everything persists to `localStorage` (with an in-memory fallback). **SETTINGS → EXPORT ALL STATE
JSON** / **IMPORT ALL STATE** moves designs and subsystems between machines. `GENERATE CET LUA`
emits a snippet for `MF.customDesigns` in the CET mod.

---

## 3. The five first-class attributes

Every part in the Forge and every sub-component in the Teardown Table shows:

| Attribute | Unit | Consequence |
|---|---|---|
| **Power use** | kW | `powerMargin = reactor.netOutput − Σ powerDraw`; negative ⇒ `BROWNOUT` |
| **Weight** | kg | `totalMass`, CoM, inertia, sprint speed, dash cost, structural stress |
| **Heat generated / dissipated** | kW | `temperature += (heatGen − heatDiss)·dt/thermalMass`; >1 ⇒ derate / vent / meltdown |
| **Radar cross section (RCS)** | m² | shape × material + crystal signature + active emissions; aspect-angle polar plot; detection range, missile lock time |
| **ECM** | strength | jam strength, lock-break chance, quickhack resist, decoys — **but jamming makes you visible** |

The **mana reactor** is the power source and is itself one subsystem among many. Its output derives
from mana flow, growth rate, raw atmospheric mana input, crystal efficiency and crystal size; a larger
crystal gives ≈1.8× gross power but ≈3× instability. See `docs/REACTOR_MODEL.md`.

All coefficients and exponents (`S`, `F`, RCS, ECM falloff, `k1`, `k2`, …) are config, exposed in
**SETTINGS** and stored in `simulation.json` / `reactors.json` — never hard-coded in the UI.

---

## 4. Repository layout

```
HANDOVER.md · README.md · LICENSE.md · DESIGN.md · NEXUS_PAGE.md (DRAFT)
PERMISSIONS.md · CHANGELOG.md · ROSTER.md (generated)
chassis.json · components.json · reactors.json · teardowns.json · subsystems.json · simulation.json
compat.json (ingamePilot source of truth)
test_build.html (generated, MAIN DELIVERABLE) · test_build.template.html
tools/src/*.js · tools/src/app.css · tools/src/body.html
tools/generate.py · tools/validate.py · tools/build_package.py · tools/init.lua.template
tools/lua_ingame.part (injected CET in-game pilot module)
tools/smoke_test.js · tools/lua_test.js · tools/package.json
cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua (generated)
docs/REACTOR_MODEL.md · docs/TEARDOWN_SCHEMA.md · docs/SUBSYSTEM_MODEL.md
docs/BaseModHooks.md · docs/AssetManifest.md · docs/INGAME_PILOT.md · docs/integration/*.example
.github/workflows/validate.yml · push_to_github.sh · .gitignore
```

> The handover planned a standalone local repo at `/home/user/mechfall-forge/`. In this Arena
> checkout the repository root **is** that repo, so all files live here on branch
> `arena/7f91711b-cp2077mechcreatemod`. `push_to_github.sh` can publish a separate standalone
> `mechfall-forge` repo from an exported copy without touching this checkout.

### Single source of truth

**Do not hand-edit `test_build.html`, `ROSTER.md` or the generated `init.lua`.** Edit the JSON files
(especially `compat.json → ingamePilot`), `tools/src/*`, `tools/init.lua.template` or
`tools/lua_ingame.part`, then:

```bash
python3 tools/build_models.py     # regenerate models.json from the 30 examples only
python3 tools/generate.py          # regenerate html, lua, roster
python3 tools/validate.py          # JSON integrity + drift + self-containment checks
python3 tools/build_package.py     # optional: dist/ test zip
cd tools && npm install && npm test # optional: jsdom browser smoke test + Lua parse/runtime test
```

`python3 tools/generate.py --check` fails if generated outputs are stale (used by CI).

---

## 5. Base mod context & permissions

- Target: **Titanfall BT-7274 v1.2.0 (Quest and Companion)**, Nexus 35041, by whatmynickname & sdh0,
  for CP2077 2.5 + Phantom Liberty (updated 27 Oct 2026). Standalone, ~460 MB.
- **This project targets CP2077 patch 2.31**, not 2.5. The line above describes the *external* base
  mod's own compatibility, not a requirement here. Our CET path uses CET 1.37.1 + a 2.31-compatible
  RED4ext; no base-mod files are bundled, edited or redistributed.
- Its requirements: ArchiveXL, TweakXL, RED4ext, redscript, Codeware, AudioXL 0.9.x, CET,
  Vehicle Turret Core; AMM / Mod Settings optional.
- Features mirrored as *test harness only*: Badlands prologue, Vanguard Link Shard, Titanfall drop,
  cockpit, XO-16 / missiles / vortex / smoke, Jet Jump / Dash / Punch, 4 AI orders, Protocol 3,
  TITAN tree, MaxTac RAM escalation.
- Optional CET hooks are `pcall`-wrapped, user-triggered and **never required**:
  `Game.AddToInventory("Items.BT7274_LinkShard", 1)`, `GetMod("bt_quest").Restart()`,
  `GetMod("bt_skill_trees").TitanPoints(5)`.

> ⚠️ **The base-mod page says you must get permission before using or modifying its assets, forbids
> re-uploading elsewhere and forbids Donation Points on derivative asset use.** This project
> **never bundles, edits or redistributes base-mod files**. No Titanfall / Armored Core / BattleTech /
> Mecha Break / Knights & Magic models are ripped. Chassis are procedural wireframes; names are
> canonical references with aliases recorded. See `PERMISSIONS.md` and `docs/AssetManifest.md`.

---

## 6. Honest disclaimer

The browser prototype + CET UI are **testable**: the simulation, authoring tools, teardown catalogue,
2D combat harness and the **full procedural 3D pilot test** actually run. The 3D pilot is generated
from numbers at runtime — it is not an in-game mech. Making a mech pilotable inside Cyberpunk 2077
would still need original meshes, rigs, animations, VO, the game itself and private base-mod APIs.
This repo does **not** contain those. Autodrive / Crystal Coat compatibility means shared concepts,
key names, share codes and optional `pcall(GetMod)` detection — not bundled or controlled mods.
`NEXUS_PAGE.md` is a **DRAFT** and must not be published until base-mod permission is settled.
The MODEL LIBRARY full models / traces are procedural data derived from the 30 example chassis; they
are **not** in-game meshes, rigs, animations, textures or extracted game geometry.

---

## 7. Validation states

`BROWNOUT`, `THERMAL SATURATION`, `OVER MASS`, `COM OFFSET`, `STRUCTURAL STRESS`,
`RCS EXPOSURE`, `ECM SELF-DETECTION`, `MANA STARVATION`, `LATTICE OVERFLOW`,
`CRYSTAL RESONANCE`, `CONTAINMENT FAILURE`, `HARDPOINT OVERFLOW`. TEST MODE allows deployment
anyway, with penalties.
