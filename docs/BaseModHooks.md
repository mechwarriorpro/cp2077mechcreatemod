# BaseModHooks.md — optional CET integration (never required)

Target: **Titanfall BT-7274 v1.2.0 (Quest and Companion)**, Nexus 35041, by whatmynickname & sdh0,
for **CP2077 2.5 + Phantom Liberty** (updated 27 Oct 2026). **This project targets patch 2.31** with CET 1.37.1 + RED4ext 1.29/1.30; the line above describes the external base mod only. Requirements of the base mod:
ArchiveXL, TweakXL, RED4ext, redscript, Codeware, AudioXL 0.9.x, CET, Vehicle Turret Core;
AMM / Mod Settings optional.

## Rules

1. **Never bundle, edit or redistribute base-mod files.**
2. All hooks are `pcall`-wrapped, user-triggered from the CET SETTINGS tab (or a console call),
   and **never executed at load**.
3. Failure is logged and ignored. The overlay works with or without the base mod installed.
4. Do not add `.reds`, TweakXL YAML or ArchiveXL files to the installable path. Templates live in
   `docs/integration/*.example` only — redscript compiles `r6/scripts` at launch and a syntax error
   breaks the user's game.

## Hooks implemented in `init.lua`

| Function | Call |
|---|---|
| `MF.optionalLinkShard()` | `Game.AddToInventory("Items.BT7274_LinkShard", 1)` |
| `MF.optionalRestartQuest()` | `GetMod("bt_quest").Restart()` |
| `MF.optionalTitanPoints()` | `GetMod("bt_skill_trees").TitanPoints(5)` |

Mod Settings page convention: **"Standby for"**.

## Base-mod controls (reference only — NOT rebound by this project)

| Action | Key |
|---|---|
| Call Titan | NumPad 9 |
| Home / return | NumPad 8 |
| Hold to embark | F |
| Cycle companion order | NumPad 0 |
| Fire / missiles / vortex / smoke | LMB / G / V / B |
| Jump / dash / view | Space / LCtrl / Q |
| Companion orders | `Follow & Fight`, `Follow & Hold Fire`, `Hold Position`, `Wait` |
| Protocol 3 | Auto-eject + 2-min cooldown (the browser harness uses a 20 s test cooldown) |

The browser harness uses its own keys (`WASD`, mouse, `Q/E/R`, `Shift`, `V`, `1–4`, `P`) inside the
combat canvas only, so it never competes with the base mod.

## CET overlay hotkey

`registerHotkey("mechfall_forge_toggle", "MECHFALL // FORGE 77", cb)` toggles the ImGui window.
Binding it is done in CET's Hotkeys panel; the registration is wrapped in `pcall` so older CET
builds still load the mod.
