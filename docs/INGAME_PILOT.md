# IN-GAME PILOT — CET-only, vanilla-record mech deployment

> **Status: experimental, CET-only, not verified inside Cyberpunk 2077 from this repository.**
> This document is deliberately explicit about what works, what is *attempted*, and what a
> production-grade pilotable mech would still need.

## 0. What changed in 0.1.5-test (and the 0.1.6-test corrections)

> **`0.1.6-test` corrections:** the target game patch is **2.31**, so the required CET build is
> **1.37.1** (or 1.37.0, the release tagged `Patch 2.31`), **not CET 1.38.x**. RED4ext is a CET
> prerequisite. Patch 2.31 also **upgraded vanilla AutoDrive**; our procedural autopilot does not
> call AutoDrive, so no behaviour change is assumed. `models.json` now supplies the only allowed
> full models / traces (30 examples) to the browser MODEL LIBRARY — see `docs/FULL_MODELS.md`.
> The CET installable path still references vanilla game records only.

## 0a. What changed in 0.1.5-test

`0.1.4` shipped a **browser** procedural 3D pilot. `0.1.5` adds a **Cyber Engine Tweaks in-game
layer** that actually spawns, moves and rides mech entities *inside Cyberpunk 2077*. It does this
without shipping a single mesh, rig, animation, texture or base-mod file: the mechs are **vanilla
game entity records referenced by TweakDB id**.

The headline core is `Character.q003_militech_mech` — the game's own **Militech Minotaur**.
Drone, android, spiderbot and turret records become the *signature parts* attached to the chassis.
`compat.json → ingamePilot` is the single source of truth; `tools/lua_ingame.part` is injected into
the generated `init.lua` by `tools/generate.py`.

## 1. What it actually does

| Layer | Implementation | In-game effect |
|---|---|---|
| **Spawn** | `exEntitySpawner.SpawnRecord(record, WorldTransform, "")` | A real, visible in-game mech entity appears ~7 m in front of V. |
| **Signature parts** | More `SpawnRecord` calls mapped to `sig*` anchors | Up to 8 drone / android / turret entities orbit the chassis. |
| **Fallback body** | `exEntitySpawner.Spawn(path, WorldTransform, "")` with `.ent` paths | If every record is rejected, three vanilla device templates form a primitive hull. |
| **Movement** | `entity:GetWorldTransform()` → `tr:SetPosition(...)` / `tr:SetOrientationEuler(...)` → `entity:SetWorldTransform(tr)` in `onUpdate` | The chassis and every part physically move each frame, with a procedural gait bob. |
| **Controls** | `registerInput(slug, label, cb(keypress))` + `registerForEvent("onUpdate", cb)` | Continuous W/S/A/D/Shift/Space/V/LMB/C/T input, not release-only hotkeys. |
| **Pilot camera** | `Game.GetTeleportationFacility():Teleport(player, Vector4, EulerAngles)` at 30 Hz | V is locked into a **COCKPIT**, **CHASE** or **ORBIT** transform so the normal third-person camera rides the mech. |
| **Engineering consequences** | `MF.compute(activeDesignId)` telemetry | Power deficit → brownout (45 % throttle); heat saturation → derate (60 %); mass → speed; RCS/self-emissions → in-game drones acquire you; ECM/jamming or a salvo → despawns a lock. |
| **Cleanup** | `exEntitySpawner.Despawn(entity)` | **F7 / EMERGENCY UNDEPLOY** despawns every entity the mod spawned and releases the cockpit lock. |

Every game call is inside `pcall`. If `exEntitySpawner` is missing or a record is rejected, the
overlay says so and drops to **PHANTOM** (cockpit-only) mode instead of breaking the game. The
`IN-GAME PILOT` tab has a **PROBE APIs** button that reports exactly which CET APIs your build
exposes.

## 2. Records used (references only — nothing is bundled)

Configured in `compat.json → ingamePilot.coreRecords`:

| Role | TweakDB record | Name |
|---|---|---|
| biped | `Character.q003_militech_mech` | MILITECH MINOTAUR (VANILLA) |
| heavy | `Character.q113_top_atrium_arasaka_mech` | ARASAKA ATRIUM MECH |
| heavy | `Character.q115_lobby_arasaka_mech` | ARASAKA LOBBY MECH |
| spider | `Character.q302_spidertank_kurt_soldier_melee_heavy` | SPIDER TANK |
| flyer | `Character.q306_orbital_air_robot_guard` | ORBITAL AIR ROBOT GUARD |

`partRecords` maps 8 vanilla records to the `sigHead`, `sigBackL`, `sigLegL`, `sigArmL/R` and
`sigExtra*` signature anchors (Octant gunship, Wyvern drone, spiderbot case, Militech/NCPD android,
tank turret, HMG turret, skybridge drone). `entityTemplates` holds three `.ent` fallback paths from
`base\gameplay\devices\...`.

These strings are **TweakDB ids / depot paths that already exist in your own game installation**.
No file is extracted, modified, re-uploaded or redistributed. No Titanfall / Armored Core /
BattleTech / Mecha Break / Knights & Magic model or texture is used, and **no BT-7274 base-mod
file is bundled, edited or required**.

## 3. CET APIs used (and why)

| API | Source |
|---|---|
| `exEntitySpawner.SpawnRecord` / `Spawn` / `Despawn`, `Game.FindEntityByID` | [CET patch notes](https://wiki.redmodding.org/cyber-engine-tweaks/patch-notes) |
| `registerInput` (continuous, press + release) | [CET registerInput](https://wiki.redmodding.org/cyber-engine-tweaks/cet-functions/hotkeys/registerinput) — `registerHotkey` is release-only and unusable for movement |
| `ToVector4{x,y,z,w}`, `ToEulerAngles{roll,pitch,yaw}`, `Game.GetTeleportationFacility():Teleport` | [CET special types](https://wiki.redmodding.org/cyber-engine-tweaks/functions/special-types) |
| `WorldTransform.new():SetPosition / :SetOrientationEuler`, `entity:SetWorldTransform(tr)` | [CP77_entSpawner / World Builder](https://github.com/justarandomguyintheinternet/CP77_entSpawner) `spawnable:update()` |
| `Game.GetPlayer():GetWorldPosition / :GetWorldForward / :GetWorldOrientation / :GetWorldYaw` | CET entity bindings |
| `Game.GetSystemRequestsHandler():IsPreGame() / :IsGamePaused()` | Gate the update loop so nothing runs in menus or while paused |

`exEntitySpawner` was added in CET 1.15 and was documented as broken in the 1.19.0-rc notes;
on **patch 2.31** the correct build is **CET 1.37.1** (or 1.37.0 `Patch 2.31`); CET **1.38.x**
supports game patch **2.5** and explicitly drops older patches. The **PROBE APIs** and **DETECT CET
VERSION** buttons exist precisely because this varies by game build; `GetVersion()` returns the CET
build tag and is matched against `compat.json → ingamePilot.gamePatches`. If `SpawnRecord` is unavailable the code tries `Spawn` with
`.ent` paths, then `Game.GetStaticEntitySystem` (Codeware), then PHANTOM.

## 3b. Patch matrix & Phantom Liberty gating


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

The browser IN-GAME PILOT console has a **GAME PATCH** selector, a **PHANTOM LIBERTY INSTALLED**
checkbox, a **PATCH MATRIX** modal and a **GENERATE IN-GAME CET LUA** snippet. The CET overlay has
the same selector / checkbox plus **DETECT CET VERSION**; `MF.ingame.setPatch()`,
`MF.ingame.setHasPL()` and `MF.ingame.detect()` are the runtime API. `IG.records()` filters out
every record flagged `requiresPL` when Phantom Liberty is not installed, and `IG.hostileRec()`
switches the threat spawner to a base-game record. A running CET 1.38.x on patch 2.31 shows a red
**WARNING** line in the overlay. Third-party matrix `2077mods.com` claims 1.38.1 works on 2.31;
official CET releases contradict that, so the official matrix is used and this remains unverified
in-game.

## 4. Install & deploy

1. Install **RED4ext (1.29.0 / 1.30.0 for CP2077 patch 2.31)** first — CET 1.37.1's own README
   lists it as a prerequisite — then **Cyber Engine Tweaks 1.37.1** (or 1.37.0). PC only.
   **Do NOT install CET 1.38.x on patch 2.31.** On 2.3 use CET 1.36.0; on 2.5 use CET 1.38.x.
   Phantom Liberty is optional; PL-only records are skipped unless you enable it in the overlay.
2. Copy the folder
   `cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/`
   into `Cyberpunk 2077/bin/x64/plugins/cyber_engine_tweaks/mods/`.
3. **Load a save in the open world.** The pilot refuses to deploy in the main menu or while paused.
4. Open CET → **Bindings** and assign the 13 `MECHFALL IN-GAME` entries. Suggested keys:

   | Key | Action | Key | Action |
   |---|---|---|---|
   | `F6` | DEPLOY / UNDEPLOY | `F7` | EMERGENCY UNDEPLOY |
   | `W` / `S` | throttle forward / reverse | `A` / `D` | turn left / right |
   | `Shift` | sprint / dash | `Space` | jump jets |
   | `V` | vent heat | `LMB` | fire / break lock |
   | `C` | cycle camera | `T` | autodrive |
   | `X` | **EMERGENCY EJECT** | | |

   `registerInput` bindings are separate from the game's own bindings; while cockpit lock is on V's
   native movement is overridden by the throttled teleport. Bind these only while testing and
   unbind them afterwards if they conflict with normal play.
5. Open the FORGE 77 overlay (**MECHFALL // FORGE 77** hotkey) → **IN-GAME PILOT** →
   **PROBE APIs** → **DEPLOY**, or press `F6`.
6. Watch the status line: core record, resolved part count, in-world lock count and camera mode.
   Use **CAMERA (C)** to switch COCKPIT / CHASE / ORBIT. Use **SET WAYPOINT** + **AUTODRIVE** for
   procedural steering (optionally handing the waypoint to a detected AutoDrive mod).
7. **F7** (or `EMERGENCY RESET`) despawns everything. This is the first thing to press if anything
   looks wrong.

The browser `test_build.html → PILOT TEST → IN-GAME PILOT (CET)` panel has a
**DEPLOY CHECKLIST**, a **GENERATE IN-GAME CET LUA** button (copies an `MF.ingame.*` override for
`onInit`) and **COPY RECORD IDS**. Changing `compat.json` and re-running
`python3 tools/generate.py` is the preferred way to change records permanently.

## 5. Safety notes

- The pilot loop is throttled to `physics.updateHz` (30 Hz) for teleports, clamps `dt` to
  `physics.maxFrameDt` (0.1 s), and aborts entirely when `IsPreGame()` / `IsGamePaused()` is true.
- A failed `Teleport` is caught; cockpit lock disables itself and logs the error instead of
  spamming the game.
- All spawned ids are remembered and despawned on undeploy. Nothing is written to TweakDB, no
  `.reds` / TweakXL YAML / `.archive` is installed, and no save data is edited.
- Spawned NPCs use their **normal game AI** and may be hostile to V. Deploy in a safe open-world
  area, not during a quest. This is a test harness, not a quest-safe mod.
- `exEntitySpawner` spawning is **asynchronous**: `Game.FindEntityByID` is retried every frame
  until each entity resolves. That is why the parts count climbs after deploy.

## 6. What this is NOT — the honest limit

This is a **scripted CET pilot over existing game entities**, not a new playable mech asset. It does
**not** add:

- a custom `.mesh`, `.rig`, skeleton, animation set, walk cycle, cockpit interior or VO;
- a real physics collider, vehicle seat, mount/workspot system or `PlayInDevice` transition;
- new weapons, VFX, damage, hit reactions, HUD widgets or a proper third-person mech camera;
- any ripped franchise asset or any BT-7274 base-mod file.

The Minotaur and Arasaka mechs are the *game's own* NPCs; their AI, animations and collision are
whatever the base game provides. The cockpit lock teleports V rather than seating V in a rig.
Everything is verified only by `tools/lua_test.js` (Fengari + a Lua stub of the CET APIs) and the
browser smoke test — **not by running Cyberpunk 2077**.

A production-grade, fully custom in-game mech (the kind shipped by "Mechs of Night City" or
"Drive the Centaur Mech") needs WolvenKit-authored `.ent` / `.mesh` / `.rig` / `.anims` resources,
ArchiveXL, TweakXL, Codeware, redscript/RED4ext, a workspot or vehicle-seat integration, camera
and weapon systems, and possibly private base-mod APIs. Those frameworks stay as
`.example` templates under `docs/integration/` and are deliberately **not installed**: redscript
compiles `r6/scripts` at launch and a syntax error breaks the game. See `PERMISSIONS.md` before
any derivative-asset work.

## 7. Troubleshooting

| Symptom | What to do |
|---|---|
| `SPAWNER UNAVAILABLE — PHANTOM` | CET version mismatch or `exEntitySpawner` disabled. On patch 2.31 install CET 1.37.1 (not 1.38.x) + RED4ext; the browser prototype still works. |
| `CET VERSION MISMATCH` in the log | `GetVersion()` does not match the selected game patch's expected CET build. Use **GAME PATCH** or install the correct CET build. |
| `DEPLOYED` but no visible mech | Records can be rejected on some patches. The `.ent` fallback templates are tried automatically; check the CET console log. |
| Parts stay at `0/N` | Spawning is asynchronous. Wait a few seconds; the resolver retries each frame. |
| V teleports awkwardly / camera fights | Uncheck **COCKPIT LOCK**, or switch to **ORBIT**. Press `F7` to stop. |
| Controls stuck | Press `F7`; undeploy clears all key state. |
| Game AI attacks you | Expected — spawned NPCs are vanilla. Press `F7`, move to a quiet area. |
| Overlay tab missing | Regenerate: `python3 tools/generate.py`; confirm `IN-GAME PILOT` is the 10th of 10 CET tabs. |

## 8. Verification in this repo

```bash
python3 tools/generate.py
python3 tools/generate.py --check
python3 tools/validate.py --strict
cd tools && npm test        # jsdom smoke test + Fengari Lua parse/runtime test
python3 tools/build_package.py
```

`tools/lua_test.js` stubs `exEntitySpawner`, `Game`, `WorldTransform`, `Vector4`, `EulerAngles`,
`registerInput`, `registerForEvent` and `registerHotkey`, then deploys the Minotaur, drives 40
`onUpdate` frames with continuous input, exercises jump/vent/fire/camera/autodrive, spawns and
breaks an RCS/ECM lock, and verifies that undeploy despawns everything. That proves the Lua is
syntactically valid and internally consistent — **it does not prove in-game behaviour**.


## 9. Per-part destruction & emergency eject (0.1.7-test)

The IN-GAME PILOT tab now has a **PER-PART DESTRUCTION** section: 28 named destructible parts
from `damage.json → cetPartNames`, live cockpit / torso damage bars, HIT / KILL buttons per part,
**EMERGENCY EJECT (X)**, **FULL DESTRUCTION** and **REPAIR ALL**. Hostile fire ticks 6% damage to
a living part every 2 s while a lock is active.

> **Cockpit damage > 70% OR aggregate torso-section damage > 90% => FULL DESTRUCTION** — every
> part destroyed, pilot ejected, cockpit lock released, ORBIT camera, all spawned entities
> despawned, run over. Manual `X` eject is always available (`mechfall_ig_eject`, the 13th CET
> binding). See `docs/DAMAGE_MODEL.md`.

Damage is simulation state over vanilla record references; no game assets are edited.


## 10. 0.1.8-test — full CET parity

The CET overlay now has **10 ImGui tabs**: HANGAR, INTERNAL SYSTEMS, MECH FORGE, REACTOR LAB,
**WEAPON FORGE**, **MODEL LIBRARY**, **DAMAGE CONTROL**, SETTINGS, COMPAT, IN-GAME PILOT.
`lua_test.js` opens and draws all 10.

* **WEAPON FORGE** equips any of the 8 baseline designs; `MF.weaponLoadout` syncs into
  `MF.compute()` so power margin reflects the loadout, and `IG.fire()` reports designed damage /
  missile damage / shield HP while adding heat.
* **MODEL LIBRARY** lists all 30 example-only full models with triangle counts; selecting one
  calls `IG.setModel(i)`. On F6 deploy the signature-part entities are positioned from that
  example's 8 trace-derived anchors instead of a generic ring.
* **DAMAGE CONTROL** shows the 28 destructible parts with HIT / KILL, cockpit / torso threshold
  bars, EJECT, FULL DESTRUCTION and REPAIR.
* `MF.rcoeffs` and `MF.thresholds` are now generated from `reactors.json` / `simulation.json`
  (previously hardcoded to the pre-0.1.7 values). `tools/parity_test.js` proves CET and browser
  telemetry agree within 3.06% worst-case across 12 values.
* The four `docs/integration/*.example` specs are complete and validated but **still not
  installed, compiled or in-game verified**.


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
