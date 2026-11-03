# PERMISSIONS.md — what you may and may not ship

## The base mod

**Titanfall BT-7274 (Quest and Companion)** — https://www.nexusmods.com/cyberpunk2077/mods/35041 —
by **whatmynickname & sdh0**, for CP2077 2.5 + Phantom Liberty, updated 27 Oct 2026.
> **Note (0.1.6-test):** that line describes the *external* base mod. **This project targets CP2077
> patch 2.31** with CET 1.37.1 + RED4ext 1.29/1.30; no base-mod files are used.

The mod page states that you must **get permission before using or modifying its assets**, forbids
**re-uploading elsewhere**, and forbids **Donation Points on derivative asset use**.

Therefore this project:

- ✅ references the base mod by name and Nexus id as an **optional companion layer**;
- ✅ uses `pcall`-wrapped, user-triggered, optional CET hooks (`Items.BT7274_LinkShard`,
  `GetMod("bt_quest").Restart()`, `GetMod("bt_skill_trees").TitanPoints(5)`), never required;
- ✅ mirrors feature *concepts* (4 companion orders, Protocol 3, TITAN tree) as a test harness;
- ❌ **never bundles, edits, embeds or redistributes any base-mod file** — no meshes, textures,
  audio, `.reds`, tweaks, archives, quest data or scripts;
- ❌ does not re-upload the base mod or any part of it;
- ❌ does not enable Donation Points on derivative asset use.

## Third-party franchises

Titanfall, Armored Core, BattleTech, Mecha Break and Knights & Magic are referenced as **study
material only**. Names are canonical textual references with aliases recorded (see `ROSTER.md`).
No models, textures, audio, logos or other assets from those works are used. All graphics are
generated procedurally with the HTML canvas 2D API at runtime: tapered/wedge hulls, ellipsoid domes,
capsule pods, swept blades, reactor rings, cell racks, chamfered joint rings, radiators and nozzle
bells. The **signature-part library** (`chassis.json → signatureParts`) describes original *component
TYPES* — cockpit pods, cranial skulls, reverse-joint and splayed legs, hover discs, ether wings,
missile racks, blade arms, shields, crests, tracked siege hulls and flight frames — that a player can
mix to build a new silhouette. These are our own procedural shapes inspired by characteristic
mechanical components, **not** reproductions of any specific mech's meshes, textures or traced
outlines. Nothing is imported, traced, extracted or ripped from another game or from the optional
base mod. Within the prototype the only limits on what you build are **balancing power/heat
transfer** and **player imagination** — there are no shape restrictions.

Spelling variations resolved: Earlcumber/Erlecumber, Tzendolg/Tzendolimble, Toybox/Toy Box.
`Ikaruga` is the canonical ether/mana reactor lore reference; `Corite`/`Corixium`, `Coral`,
`Clan XL Fusion`, `Militech RTG` and `Vanguard Link Shard` are **reactor preset names derived from
teardown telemetry**, not shipped game assets.

## Vanilla game entity references (in-game pilot)

`compat.json → ingamePilot` lists TweakDB record ids and `.ent` depot paths that **already exist in
the player's own Cyberpunk 2077 installation** (`Character.q003_militech_mech`, Arasaka mech records,
drone/android/spiderbot/turret records, and three `base\gameplay\devices\...` templates). CET
spawns, moves and despawns them at runtime via `exEntitySpawner`; **no game file is extracted,
modified, embedded, re-uploaded or redistributed**. No `.archive`, `.mesh`, `.rig`, `.anims`,
texture or animation is added to this repo or to the installable CET folder. These are references to
CD Projekt Red's own game content used at runtime on the player's machine, not shipped assets.

This does **not** grant permission for derivative use of the optional BT-7274 base mod or of any
third-party franchise asset. The rules above still apply to everything else in the project.

## Original content

Night City frames ("Militech Behemoth", "Arasaka Oni", "MaxTac RAM") are original, permission-free
hostile/boss placeholder designs. The code, JSON data, docs and procedural graphics are
`CC BY-NC-SA 4.0` with the carve-outs in `LICENSE.md`.

## Before publishing

1. Get written permission from the BT-7274 authors before any derivative that uses their assets.
2. Do not publish `NEXUS_PAGE.md` — it is a **DRAFT**.
3. Do not add `.reds`, TweakXL YAML or ArchiveXL files to the installable path until they are
   validated against the target game patch. A syntax error in `r6/scripts` breaks the user's game.
4. Keep Donation Points off if any base-mod derived asset is ever involved.

## Optional mod compatibility

`compat.json` references Auto drive / Auto Drive Enhanced (Nexus 14680 / 23157) and
Crystal Coat Picker (Nexus 35571) as **public compatibility concepts only**. We use their documented
key names, colour fields and share-code shape in our own procedural implementations, and CET probes
for them with `pcall(GetMod)`. No files, code, textures, models or assets from those mods — or from
the optional BT-7274 base mod — are bundled, edited, redistributed or required. Detection is
optional and never gates the prototype.


## Full models / traces — examples only

`models.json` derives every full model and every blueprint trace **only** from the 30 example chassis
in `chassis.json`. There is no asset import, no mesh download, no screenshot tracing, no extraction
from game archives and no base-mod or third-party geometry. Generic untyped hulls and numeric-only
silhouettes are rejected. This is procedural engineering data, not a derivative of any mod's assets;
see `docs/FULL_MODELS.md` and `docs/AssetManifest.md`.


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
