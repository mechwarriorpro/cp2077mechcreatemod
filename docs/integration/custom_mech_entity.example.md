# Custom in-game mech entity — EXAMPLE / NOT INSTALLED

> **This is a design note, not a game file.** No `.ent`, `.mesh`, `.rig`, `.anims`, `.workspot`,
> `.archive`, `.xl`, `.reds` or YAML is shipped in this repository. The installable path is
> **CET-only**: `cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua`.

## What 0.1.5-test actually ships

`compat.json → ingamePilot` + `tools/lua_ingame.part` implement an in-game pilot that references
**vanilla Cyberpunk 2077 entity records by TweakDB id** (`Character.q003_militech_mech`, the
Militech Minotaur, plus Arasaka mechs, drones, androids and turrets). CET spawns/moves/despawns
those entities at runtime. It is a scripted pilot over existing game content, not a new asset.
See `docs/INGAME_PILOT.md`.

## What a production-grade custom mech would need instead

1. **Original assets authored from scratch** in WolvenKit: a `.mesh` + `.rig` + skeleton, an
   `.ent` entity template with a `vehicleVisualCustomization` or device descriptor, `.anims` /
   `.workspot` for boarding, idle, walk, jump, fire and eject, plus materials and VFX. No ripped
   franchise or base-mod assets.
2. **ArchiveXL** `.archive` + `.xl` manifest to register the resources and appearances.
3. **TweakXL** records for the entity, its faction/AI profile, weapons and any vehicle record.
4. **Codeware / RED4ext / redscript** for a real `DynamicEntitySystem` spec, a mount or vehicle
   seat, camera takeover (`base\entities\cameras\simple_free_camera.ent` or equivalent), input
   mapping and weapon firing through the game's own systems.
5. **Audioware / VO** and damage / hit-reaction / HUD integration.
6. **Validation against the target patch (CP2077 2.31, CET 1.37.1 + RED4ext)** before shipping — a syntax error in
   `r6/scripts` breaks the player's game at launch.
7. **Written permission from the BT-7274 authors** before any derivative use of their assets
   (and no Donation Points on such derivatives). See `PERMISSIONS.md`.

## Why this stays an example

The user-visible in-game layer in this repo is deliberately confined to CET Lua so it cannot break
startup, cannot redistribute anyone's files, and degrades safely when an API is missing. Until the
assets above exist and are validated, the honest description of the in-game pilot is:
**"spawns and moves vanilla game entities; no custom mesh, rig, animation, VO, collider, seat or
mount system is shipped."**
