# WEAPON FORGE — custom weapon design (`0.1.7-test`)

A new browser tab, **WEAPON FORGE**, lets a player author weapons from raw simulation
parameters. `weapons.json` is the source of truth; `tools/src/29_weapons.js` is the UI and
`MF.weapons` is the API. Equipped designs feed the existing six-attribute engine through
`MF.sim.compute()`.

## 1. The eight categories

| # | Category id | Family | Role | Baseline traits |
|---|---|---|---|---|
| 1 | `energy_weapon` | energy | weapon | Laser / particle cannon — high bus draw, high heat, no ammunition |
| 2 | `ballistic_weapon` | ballistic | weapon | Autocannon / railgun — kinetic damage, ammunition, low emissions |
| 3 | `missile_weapon` | ballistic | weapon | Tube / swarm launcher — lock-on salvos, large signature |
| 4 | `melee_weapon` | ballistic | weapon | Titan-grade blade / pile driver — zero power, huge mass, short range |
| 5 | `energy_missile` | hybrid | weapon | Plasma-warhead guided munition — energy charge + ballistic delivery |
| 6 | `energy_melee` | hybrid | weapon | Charged blade / plasma fist — capacitor-fed close combat |
| 7 | `energy_shield` | energy | defence | Deflector barrier — regenerating HP, heavy continuous bus draw |
| 8 | `ballistic_shield` | ballistic | defence | Reactive plate / ablative armour — passive HP, no power draw |

**Energy missiles**, **energy melee**, **energy shielding** and **ballistic shielding** are
first-class categories, not modifiers bolted onto the four base types.

## 2. Ten editable parameters

`bus draw (kW)`, `dry mass (kg)`, `heat per volley (kW)`, `damage / defence (pts)`,
`effective range (m)`, `rate of fire (/min)`, `signature (m²)`, `ECM / jamming (str)`,
`ammo / charge (shots)`, and `shield / plate rating (pts)`.

Every category shares the same parameter set with its own defaults and traits, so a player can
design any combination — e.g. a low-signature ballistic railgun, a high-draw plasma blade, or a
passive ablative shield with 500 pts of plating. `0` capacity means an infinite energy charge;
ballistic and missile weapons consume shots.

## 3. Live consequences

`MF.weapons.six(w)` maps a design into the six first-class attributes:

```
powerDraw = p.power
mass      = p.mass
heatGen   = p.heat * (p.rate / 60) * 0.35
rcs       = p.rcs
ecm       = p.ecm
dps       = p.damage * (p.rate / 60)
```

`MF.sim.compute()` pushes each equipped weapon in as a part, so bus draw, mass, heat, RCS and ECM
all update the power margin, total mass, net heat, detect range and lock time. Under the
`0.1.7-test` forgiving balance the bus draw also benefits from `moduleDrawScale` and the
`bulkModuleDiscount`, so a full 8-weapon loadout is affordable.

Each equipped design also adds a **destructible weapon / shield part** to `MF.damage` (see
`docs/DAMAGE_MODEL.md`); shield rating adds HP to that part.

## 4. Loadout

Up to `weapons.json → loadoutLimit` (8) designs can be equipped. Templates ship one baseline per
category; `SAVE CUSTOM WEAPON` appends to `MF.state.customWeapons`, and EQUIP / UNEQUIP / EDIT
COPY / DELETE manage the loadout. Both custom weapons and loadout persist in `localStorage`.

## 5. Honest limits

These are **simulation parameters**, not meshes, projectiles, sounds, rigs, textures or
base-mod / third-party assets. The `0.1.7-test` browser prototype renders the engineering
consequences; it does not claim to add weapon models to Cyberpunk 2077. The CET installable
path still references vanilla game records only.


---

## 0.1.8-test — designs actually fire

`MF.weapons.combatProfile()` aggregates the loadout into `fireDamage`, `fireRate`, `heatPerShot`,
`missileDamage`, `missileCount`, `meleeDamage`, `shieldPool`, `shieldRegen` and `dps`. COMBAT TEST
uses it for primary bullet damage / cooldown / heat / bullet colour, `R` salvo size + damage and
`Q` burst-core melee bonus. PILOT TEST uses it for primary fire, `R` missile salvo and heat.
CET `IG.weaponProfile()` / `IG.fire()` use the equivalent CET loadout (`MF.weaponLoadout` is synced
into `MF.compute()` so the overlay's power margin reflects equipped designs).

Shield designs create destructible `shield` parts in `MF.damage`; `MF.damage.absorb()` drains their
HP before hull damage, `MF.damage.tick()` regenerates energy shielding, and destroyed shield parts
stay down until REPAIR ALL. Both COMBAT / PILOT HUDs show the live shield pool.
