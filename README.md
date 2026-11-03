# MECHFALL // FORGE 77

> **A simulation-grade custom mech engineering sandbox** — an optional companion layer for the
> **Titanfall BT-7274 (Quest and Companion)** mod for Cyberpunk 2077 (Nexus 35041).

The point is **fully custom mech creation**, not a roster of famous mechs. You author the frame,
the limbs and every internal subsystem — power, mass, thermal, signature and electronic warfare —
then stress-test that design in combat. Famous mechs exist only to be studied, torn apart and mined
for parts.

**Priority:** ~75% fully custom chassis + player-designed internal subsystems · ~15% prefab/teardown
library · ~10% combat test harness (it exists to prove custom builds work).

---

## 1. Two deliverables, one repo

| Deliverable | What it is | How to run it |
|---|---|---|
| **`test_build.html`** | **Main playable prototype.** One self-contained file: inline CSS/JS, canvas graphics, inline JSON data. No CDN, no fonts, no images, no network. | Open it in any modern browser (double-click). Works inside a sandboxed iframe; `localStorage` failures fall back to in-memory state. |
| **`cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua`** | **CET-only CP2077 test mod.** ImGui overlay with hangar, subsystem authoring, forge params, reactor lab and settings; live power / mass / heat / RCS / ECM bars. Generated from the same JSON files. | Copy the `cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/` folder into `Cyberpunk 2077/bin/x64/plugins/cyber_engine_tweaks/mods/`. Requires Cyber Engine Tweaks. Open the overlay with the CET hotkey binding **MECHFALL // FORGE 77**. |

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
   count), front + side elevations and a
   drag-to-orbit 3D wireframe with grid and dimension labels. `RANDOMIZE`, `RESET`, `BAKE SHAPE`.
   `PREFAB ASSEMBLY` is the alternative mode (pick a frame/limb set). Hook up your subsystems.
5. **TEARDOWN** — a **sleek mech wireframe** built from tapered octagonal hulls, chamfered rings,
   joint rings, swept fins, radiators and nozzle bells. Toggle **WIREFRAME**, **INTERNALS FIT**
   (physical mounting bays showing where every sub-component sits) and **POWER / HEAT FLOW**
   (routed bus trunks, heat runs to radiators, coolant return loop). Fit and balance are the point:
   `AUTO ROUTE`, bus/coolant sliders, `STRESS FIT`, `APPLY FIT → FORGE`, plus **SCAN INTERNALS**,
   **EXTRACT TO INVENTORY**, **USE AS TEMPLATE**, **COMPARE**. Every part and sub-component shows
   all six attributes; long bus/coolant runs cost transfer losses and hot bays flag overloads.
6. **COMBAT TEST** — `WASD` + mouse, `LMB` fire, `Q/E/R` abilities, `Shift` dash, `V` vent,
   `1–4` companion orders, `P` pause. Your baked silhouette fights. Brownouts, heat derates, mass
   inertia, RCS detection, ECM lock breaks and reactor surges are live consequences.
7. **HANGAR**, **DOSSIER**, **SETTINGS** — prefab/teardown library with `UNLOCK ALL (TEST MODE)`,
   full engineering dossier, and all simulation exponents as editable config.

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
test_build.html (generated, MAIN DELIVERABLE) · test_build.template.html
tools/src/*.js · tools/src/app.css · tools/src/body.html
tools/generate.py · tools/validate.py · tools/build_package.py · tools/init.lua.template
tools/smoke_test.js · tools/lua_test.js · tools/package.json
cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua (generated)
docs/REACTOR_MODEL.md · docs/TEARDOWN_SCHEMA.md · docs/SUBSYSTEM_MODEL.md
docs/BaseModHooks.md · docs/AssetManifest.md · docs/integration/*.example
.github/workflows/validate.yml · push_to_github.sh · .gitignore
```

> The handover planned a standalone local repo at `/home/user/mechfall-forge/`. In this Arena
> checkout the repository root **is** that repo, so all files live here on branch
> `arena/7f91711b-cp2077mechcreatemod`. `push_to_github.sh` can publish a separate standalone
> `mechfall-forge` repo from an exported copy without touching this checkout.

### Single source of truth

**Do not hand-edit `test_build.html`, `ROSTER.md` or the generated `init.lua`.** Edit the JSON files
or `tools/src/*` / `tools/init.lua.template`, then:

```bash
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

The browser prototype + CET UI are **testable**: the simulation, authoring tools, teardown catalogue
and combat harness actually run. A full 3D pilotable-mech release would need original meshes, rigs,
animations, VO, the game itself and private base-mod APIs. This repo does **not** contain those.
`NEXUS_PAGE.md` is a **DRAFT** and must not be published until base-mod permission is settled.

---

## 7. Validation states

`BROWNOUT`, `THERMAL SATURATION`, `OVER MASS`, `COM OFFSET`, `STRUCTURAL STRESS`,
`RCS EXPOSURE`, `ECM SELF-DETECTION`, `MANA STARVATION`, `LATTICE OVERFLOW`,
`CRYSTAL RESONANCE`, `CONTAINMENT FAILURE`, `HARDPOINT OVERFLOW`. TEST MODE allows deployment
anyway, with penalties.
