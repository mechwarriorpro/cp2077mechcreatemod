# CUSTOM MECH ENTITY — COMPLETE SPAWN / DAMAGE SPEC (EXAMPLE ONLY)

> **STATUS:** complete, structurally validated by `tools/validate_integration.py`.
> **NOT INSTALLED, NOT COMPILED, NOT IN-GAME VERIFIED.** The installable path in
> this repository is **CET-only** (`init.lua`), which spawns **vanilla game
> records**. This document specifies what an original custom entity would need.
> Target patch: **CP2077 2.31** (CET 1.37.1 + RED4ext 1.29/1.30). No base-mod
> files, ripped assets or third-party meshes; no Donation Points / derivative
> asset use.

## 1. What `0.1.8-test` actually ships (recap)

* `models.json` — 30 example-only full models: complete shape vector, three
  **independent** front / side / top traces, and a real indexed triangulated
  3D mesh (10,704 triangles total). Only those 30 examples are allowed.
* `weapons.json` — 8 player-authored weapon / shield categories; equipped
  designs feed live power / mass / heat / RCS / ECM and actually fire in
  COMBAT TEST, PILOT TEST and the CET IN-GAME PILOT.
* `damage.json` — every individual part destructible; **cockpit > 70% OR
  aggregate torso > 90% ⇒ FULL DESTRUCTION + automatic pilot emergency eject**.
* CET `init.lua` — 10 ImGui tabs, `exEntitySpawner.SpawnRecord`, per-part
  destruction, model-driven part layout, `GetVersion()` patch detection.

It ships **no** custom mesh, rig, animation, VO, seat or mount resource.

## 2. Original entity record (TweakDB)

```
Mechs.Mechfall_Forge_TestFrame          # original record id
  $type: MechfallMechRecord
  displayName: "FORGE 77 / TEST FRAME"
  exampleSourceId: bt7274                # MUST be one of the 30 allowed ids
  entityTemplate: "mechfall\\entities\\mechfall_mech.ent"
  appearanceName: "mechfall_default"
  bodyPlan: vanguard
  powerMargin: 112.8
  totalMass: 2137.7
  netHeat: -6.0
  rcsFront: 10.9
  jamStrength: 29.5
  cockpitDestruction: 0.70
  torsoDestruction: 0.90
  loadoutLimit: 8
```

`exampleSourceId` is validated against `models.json → policy.allowedSourceIds`.
A record with a generic hull or a source outside those 30 ids is rejected.

## 3. CET spawn spec (pcall-wrapped, optional)

```lua
-- Illustrative only. The shipped init.lua uses SpawnRecord with VANILLA ids.
local ok = pcall(function()
  local tr = WorldTransform.new()
  tr:SetPosition(ToVector4{ x = px, y = py, z = pz, w = 1 })
  tr:SetOrientationEuler(ToEulerAngles{ roll = 0, pitch = 0, yaw = deg })
  return exEntitySpawner.SpawnRecord("Mechs.Mechfall_Forge_TestFrame", tr, "mechfall_default")
end)
```

Fallback chain in the shipped mod: `SpawnRecord` → `Spawn` with vanilla `.ent`
paths → `Game.GetStaticEntitySystem():SpawnEntity` → PHANTOM. All calls are
`pcall`-wrapped; spawning is asynchronous and resolved on `onUpdate`.

## 4. Full part / damage binding (mirrors `damage.json`)

| Section | Parts | Threshold |
|---|---|---|
| `cockpit` | COCKPIT CANOPY, SENSOR MAST, PILOT SEAT | **> 0.70** |
| `torso` | TORSO HULL, REACTOR CORE, POWER BUS SPINE, CAPACITOR BANK, COOLANT MANIFOLD, EW BACKPACK, SHOULDER L/R, HIP ASSEMBLY | **> 0.90 aggregate** |
| `limb` | ARM L/R, LEG L/R, FOOT L/R | individually destructible |
| `system` | ECM SUITE, RADIATOR L/R, THRUSTER L/R, JUMP JET | individually destructible |
| `weapon` | WEAPON MOUNT A/B | individually destructible |
| `shield` | ENERGY SHIELD EMITTER, BALLISTIC PLATE | absorbs incoming damage |

`sectionDamage = 1 - Σ(hp)/Σ(maxHp)`. `EvaluateDestruction()` triggers
`FullDestruction(reason)` on either threshold; every part is marked destroyed,
the pilot is ejected, the cockpit lock is released, ORBIT camera is selected,
and every spawned entity is despawned. Manual eject: **`X`** /
`mechfall_ig_eject` (13th CET binding) or the overlay buttons. `E` remains
VORTEX SHIELD in COMBAT / PILOT TEST.

### Shield absorption

`energy_shield` and `ballistic_shield` designs create `shield` parts whose HP
is the pool. `ApplyDamage(partIndex, amount)` drains shield HP first; only the
remainder reaches the hull part. Energy shields regenerate slowly
(`shieldRegen = Σ(armor × 0.02)` per second). Destroyed shield parts do not
regenerate until `REPAIR ALL`.

## 5. Weapon bindings (8 categories)

`energy_weapon`, `ballistic_weapon`, `missile_weapon`, `melee_weapon`,
`energy_missile`, `energy_melee`, `energy_shield`, `ballistic_shield`. Each
design maps `power → powerDraw`, `mass → mass`, `heat × rate/60 × 0.35 → heatGen`,
`rcs → rcs`, `ecm → ecm`, `damage × rate/60 → DPS`. `IG.weaponProfile()`
aggregates the CET loadout; `IG.fire()` applies heat and breaks in-world locks.
COMBAT / PILOT TEST use `MF.weapons.combatProfile()` for bullet damage, fire
rate, missile salvo damage/count, melee burst and shield mitigation.

## 6. Model-driven in-game part layout

`lua_data.models.examples[i].anchors` holds 8 per-example 3D offsets derived
from that example's front trace part centroids. `IG.setModel(i)` selects one of
the 30 examples; `partOffset()` then positions the vanilla-record signature
parts from **that example's** silhouette instead of a generic ring. Each spawned
part is linked to a damage part (`dmgId`), so destroying it despawns the entity.

## 7. Validation checklist before any real use

1. `python3 tools/generate.py` + `python3 tools/validate.py --strict`.
2. `cd tools && npm test` + `node parity_test.js` (CET ↔ browser telemetry).
3. Compile the `.reds` / TweakXL YAML / `.archive` for patch **2.31**.
4. Verify in-game with **CET 1.37.1** (NOT 1.38.x) and RED4ext 1.29/1.30.
5. Confirm every resource path resolves and no vanilla / base-mod record is
   overridden.
6. Obtain written permission from the authors of Nexus mod 35041 before any
   derivative asset use; `NEXUS_PAGE.md` stays a DRAFT.

**Nothing in this repository has been verified inside Cyberpunk 2077.**
