# IN-GAME PILOT — CET-only, vanilla-record mech deployment

> **Status: experimental, CET-only, not verified inside Cyberpunk 2077 from this repository.**
> This document is deliberately explicit about what works, what is *attempted*, and what a
> production-grade pilotable mech would still need.

## 0. What changed in 0.1.5-test

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
modern CET builds (1.38+ for patch 2.5) are the target. The **PROBE APIs** button exists precisely
because this varies by game build. If `SpawnRecord` is unavailable the code tries `Spawn` with
`.ent` paths, then `Game.GetStaticEntitySystem` (Codeware), then PHANTOM.

## 4. Install & deploy

1. Install **Cyber Engine Tweaks** (1.38+ for CP2077 2.5 / Phantom Liberty). PC only.
2. Copy the folder
   `cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/`
   into `Cyberpunk 2077/bin/x64/plugins/cyber_engine_tweaks/mods/`.
3. **Load a save in the open world.** The pilot refuses to deploy in the main menu or while paused.
4. Open CET → **Bindings** and assign the 12 `MECHFALL IN-GAME` entries. Suggested keys:

   | Key | Action | Key | Action |
   |---|---|---|---|
   | `F6` | DEPLOY / UNDEPLOY | `F7` | EMERGENCY UNDEPLOY |
   | `W` / `S` | throttle forward / reverse | `A` / `D` | turn left / right |
   | `Shift` | sprint / dash | `Space` | jump jets |
   | `V` | vent heat | `LMB` | fire / break lock |
   | `C` | cycle camera | `T` | autodrive |

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
| `SPAWNER UNAVAILABLE — PHANTOM` | CET version mismatch or `exEntitySpawner` disabled. Update CET; the browser prototype still works. |
| `DEPLOYED` but no visible mech | Records can be rejected on some patches. The `.ent` fallback templates are tried automatically; check the CET console log. |
| Parts stay at `0/N` | Spawning is asynchronous. Wait a few seconds; the resolver retries each frame. |
| V teleports awkwardly / camera fights | Uncheck **COCKPIT LOCK**, or switch to **ORBIT**. Press `F7` to stop. |
| Controls stuck | Press `F7`; undeploy clears all key state. |
| Game AI attacks you | Expected — spawned NPCs are vanilla. Press `F7`, move to a quiet area. |
| Overlay tab missing | Regenerate: `python3 tools/generate.py`; confirm `IN-GAME PILOT` is the 7th CET tab. |

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
