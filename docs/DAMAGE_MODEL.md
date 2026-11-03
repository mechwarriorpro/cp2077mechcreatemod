# DAMAGE CONTROL — per-part destruction & pilot eject (`0.1.7-test`)

`damage.json` is the source of truth. The browser implementation is `tools/src/28_damage.js`
(`MF.damage` + the **DAMAGE CONTROL** tab); the CET in-game implementation lives in
`tools/lua_ingame.part` (`IG.buildParts` / `IG.hitPart` / `IG.checkDestruction` /
`IG.fullDestruction` / `IG.ejectPilot`). Both enforce the same thresholds.

## 1. Every individual part is destructible

The browser builds one damage record for **every part returned by `MF.shapeParts(shape)`** — the
~38 hull, cockpit, sensor, reactor, bus, capacitor, coolant, shoulder, arm, leg, foot, actuator,
vent, radiator, thruster and jump-jet boxes of the active chassis — plus one part per equipped
custom weapon / shield. Each part has:

```
{ id, anchor, name, group, section, hp, maxHp, destroyed }
```

`maxHp` comes from `damage.json → baseHp[section]` scaled by the part's physical volume. Parts
are individually hit or destroyed from the DAMAGE CONTROL tab (`HIT 10%` / `DESTROY` per row),
by incoming fire in **COMBAT TEST** and **PILOT TEST**, and by the CET in-game overlay's part
list. A destroyed part stops contributing and is recorded in the event log.

### Sections

| Section | Parts |
|---|---|
| `cockpit` | Canopy / sensor / pilot seat |
| `torso` | Central hull, reactor, bus, capacitors, coolant, backpack, hips, shoulders |
| `limb` | Arms, legs, feet, actuators |
| `system` | ECM, vents, radiators, thrusters, jump jets |
| `weapon` | Designed weapon mounts |
| `shield` | Energy / ballistic shielding plates |

## 2. Destruction thresholds — the rule that ends the run

```
cockpitDamage = 1 - Σ(cockpit part hp) / Σ(cockpit part maxHp)
torsoDamage   = 1 - Σ(torso   part hp) / Σ(torso   part maxHp)

if cockpitDamage > 0.70  =>  FULL DESTRUCTION
if torsoDamage   > 0.90  =>  FULL DESTRUCTION      (either one, not both)
```

`>` is **strictly greater than**, matching "more than 70% damage to cockpit or 90% overall
destruction to torso sections". Torso damage is the **aggregate** across all torso sections,
not a single part.

**Full destruction** marks *every* part destroyed, ejects the pilot, releases the cockpit lock,
switches to ORBIT camera, despawns every spawned entity, and ends the COMBAT / PILOT / CET run.
The reason string records which threshold fired (`COCKPIT > 70% DAMAGE` or
`TORSO SECTIONS > 90% AGGREGATE DAMAGE`).

## 3. Pilot emergency eject

* **Automatic** the instant either threshold is exceeded (part of full destruction).
* **Manual** at any time: `X` in the browser (global key), the **EMERGENCY EJECT** button in
  DAMAGE CONTROL, the `mechfall_ig_eject` CET binding (`X`), or the CET overlay's
  **EMERGENCY EJECT (X)** button. `E` remains VORTEX SHIELD in COMBAT / PILOT TEST.
* Eject releases the cockpit lock, switches to ORBIT, ends the run and logs the event.
* `REPAIR ALL` restores every part to full HP and clears destruction / eject state.

## 4. Live integration

| Surface | Integration |
|---|---|
| **DAMAGE CONTROL** tab | Thresholds, cockpit / torso / overall bars, per-part HP + HIT / DESTROY, incoming-fire buttons, EJECT, FULL DESTRUCTION, REPAIR, event log |
| **COMBAT TEST** | `combat-damage` HUD; hostile bullets and proximity damage call `MF.damage.incoming()`; Protocol 3 auto-eject also calls `MF.damage.eject()` |
| **PILOT TEST** | `pilot-damage` HUD; hostile bullets call `MF.damage.incoming()`; structure loss calls the eject |
| **CET IN-GAME PILOT** | 28 named destructible parts from `damage.json → cetPartNames`, live cockpit / torso bars, per-part HIT / KILL buttons, manual eject / full destruction / repair, and hostile fire ticking 6% part damage every 2 s |

## 5. Honest limits

Damage is **simulation state over procedural meshes and vanilla game record references**. It does
not edit game assets, add custom rigs, add destruction animations, or claim in-game verification.
No base-mod or third-party files are used. The CET side is `pcall`-wrapped and degrades to
PHANTOM mode; `GetVersion()` is a CET build tag, not a game-version API.
