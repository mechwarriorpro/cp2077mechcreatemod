# SUBSYSTEM_MODEL.md — player-designed internal subsystems

> **Blank-slate authoring is the headline.** A subsystem is not a pick-list entry: the player names
> it, sets its parameters, saves it as a reusable component and installs it into a design.

## The six first-class attributes

Every subsystem derives (or directly authors) exactly these values, shown in every table:

| Key | Label | Unit | Meaning |
|---|---|---|---|
| `powerDraw` | Power use | kW | Added to the power budget (negative values supply power) |
| `mass` | Weight | kg | Added to total mass, CoM and inertia |
| `heatGen` | Heat generated | kW | Added to thermal load |
| `heatDiss` | Heat dissipated | kW | Radiators / phase-change capacity (may be negative = heat trapped) |
| `rcs` | RCS contribution | m² | Added to the signature (may be negative = reduction) |
| `ecm` | ECM contribution | str | Jamming / ECCM / decoy strength |

## Categories

| Category | Player-editable params | Derived outputs |
|---|---|---|
| **Power bus / mana distribution** | bus capacity, conduit gauge, voltage, routing redundancy, fuse limit, capacitor bank, grounding | brownout threshold, surge tolerance, transmission loss |
| **Mana reactor** | see `docs/REACTOR_MODEL.md` | net output, instability, heat load, crystal signature, meltdown |
| **Thermal loop** | coolant type, pump rate, radiator area, heat-pipe count, phase-change mass, vent threshold, insulation | heat dissipation, thermal mass, hotspots, overheat timer |
| **Mass / structure** | frame material, armour density, counterweights, hardpoints, CoM offset, bracing | frame mass, inertia, sprint speed, dash cost, structural stress |
| **Signature / RCS** | facet angle, RAM coating, edge alignment, cavity shielding, emitter placement, panel gaps | RCS multiplier, front/side/rear RCS, detection range, missile lock time |
| **ECM / EW** | jammer power, antenna gain, band coverage, decoy count, LPI mode, ECCM resistance, chaff, spoofing, EMCON | jam strength, lock break, quickhack resist, **self-emissions** |
| **Sensors / OS** | radar aperture, optical grade, passive/listen mode, targeting solver, AI assist | detection range, lock speed, cooldown multiplier, ECCM quality |
| **Actuators / limbs** | servo count, myomer layers, gear ratio, damper stiffness, joint range | speed, dodge, heat per move, moving RCS |
| **Freeform / blank slate** | the six attributes directly, all starting at zero | none — you own the numbers |

`subsystems.json` is authoritative: it defines each category's parameter labels, ranges, defaults,
units and help text, the dependency graph, validation states, equations and trade-off matrix. The UI
builds its sliders from that schema; `tools/generate.py` embeds it and emits the Lua table.

## Whole-design derivation

```
powerUsedEff  = Σ powerDraw * (1 + bus.transmissionLoss)
powerMargin   = reactor.netOutput - powerUsedEff
totalMass     = frameMass + Σ mass + payload
comOffset     = structure offset + counterweight correction + weapon asymmetry
inertia       = totalMass * (1 + |comOffset|*0.7)
speed         = baseSpeed*(1 - k1*mass/massRef)*(1 - k2*stress)*actuatorSpeed
heatGen       = reactor.heat + Σ heatGen + movementHeat + ecmHeat
heatDiss      = max(0, Σ heatDiss)
temperature  += (heatGen - heatDiss)*dt/thermalMass
rcsBase       = shapeFactor^... * materialFactor + crystalSignature
                + Σ rcs + selfEmissions*emissionRcsFactor
rcsPolar[i]   = rcsBase * aspect(angle)                     // 36 samples, 0–360°
detectRange   = detectionK * rcsFront^detectionExponent * enemySensorFactor
missileLock   = lockK / sqrt(rcsFront)
jamStrength   = jamK/100 * jamBase / (dist^ecmFalloffExponent * (1+enemyECCM/2))
lockBreak     = clamp((jamStrength - lockQuality)/(lockQuality+12), 0, 1)
```

The reactor's own heat and crystal signature are counted once (the reactor *part* still displays
them in the subsystems table). Radiator RCS, RAM-trapped heat, antenna hardware and active emissions
are separate additive terms.

## Validation states

`BROWNOUT`, `THERMAL SATURATION`, `OVER MASS`, `COM OFFSET`, `STRUCTURAL STRESS`,
`RCS EXPOSURE`, `ECM SELF-DETECTION`, `MANA STARVATION`, `LATTICE OVERFLOW`,
`CRYSTAL RESONANCE`, `CONTAINMENT FAILURE`, `HARDPOINT OVERFLOW`. Thresholds are in
`simulation.json`. TEST MODE allows deployment anyway with combat penalties.

## INTERNAL SYSTEMS LAB UI

Sliders per subsystem; live power budget bar; mass/CoM readout; thermal map; **RCS polar plot
(0–360°)**; ECM coverage ring; dependency graph; trade-off matrix; validation list; equations with
live values. Buttons: `CREATE NEW SUBSYSTEM`, `SAVE`, `EXPORT SUBSYSTEM JSON`,
`GENERATE CET LUA`, `SEND TO FORGE`, `STRESS TEST`, install/uninstall, duplicate, delete, import.
`STRESS TEST` runs a 30 s movement/charging cycle and plots temperature, power margin, net heat and
front RCS, reporting peak temperature, brownout ticks and forced vents.
