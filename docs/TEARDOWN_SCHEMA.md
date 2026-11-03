# TEARDOWN_SCHEMA.md — sleek mech wireframe, internals fit, power/heat transfer

`teardowns.json` drives the **TEARDOWN TABLE**. The goal is not just "take a mech apart": it is to
show **where every internal physically mounts** and let the player **fit and balance power and heat
transfer between those parts**. The only design limits are balancing and player imagination.

All geometry is original procedural canvas drawing — tapered octagonal hulls, chamfered rings,
joint rings, swept fins, radiator banks and flared nozzle bells. No imported models, textures or
traced silhouettes. Franchise names remain textual study references only.

## View layers

`defaultViewMode: "wireframe"` and `view.modes` define three **independently toggleable** layers,
all on by default (`view.defaultOn`):

| id | label | what it draws |
| --- | --- | --- |
| `wireframe` | `MECH WIREFRAME` | Sleek tapered hulls, joints, swept fins, nozzle bells (from `MF.shapeParts`). |
| `internals` | `INTERNALS FIT` | A labelled mounting bay at each part's physical 3D centre; selected bay highlighted. |
| `flows` | `POWER / HEAT FLOW` | One bus trunk per power bus from the reactor to a distribution hub, branch stubs, heat runs from hot nodes to the nearest radiator, and a green coolant return loop. |

`view.geometry` lists the primitives (`tapered octagonal hull`, `chamfered ring`, `swept panel`,
`joint ring`, `nozzle bell`, `radiator fin`, `coolant tube`, `power bus`) plus `hullSections`,
`bevel`, `taper` and `panelRibs`. `view.fit` holds `buses`, `loops`, `busCapacityPct`,
`coolantFlowPct`, `transferLossPerUnit` and `hotSpotTolerance`.

## Shapes and anchors

`MF.shapeParts(shape)` in `tools/src/20_render.js` builds the whole mech from the **20 shape
parameters** in `chassis.json` (`torsoW … style`, plus `thrusterSize` and `jumpJetCount`). Each
descriptor keeps `anchor, name, x, y, z, w, h, d, group` (so COMBAT TEST can still draw the baked
silhouette) and adds a `type` plus geometry:

- `type: "hull"` → `rings[]` of 8-point chamfered cross-sections, optionally `chest` / `canopy`.
- `type: "nozzle"` → `center`, `axis`, `radius`, `length`, `count`, `flare`, `thrust` (jump jet and
  thruster clusters draw `count` bells each).
- `type: "fin"` → a swept `quad` with `slats` (radiators, RAM vents, armour flares, shields, crests).
- `type: "joint"` → `center` + `radius` (elbows and knees drawn as three orthogonal rings).

`anchor` values are **physical part ids**: `torso`, `head`, `sensor`, `shoulderL/R`, `upperArmL/R`,
`foreArmL/R`, `weaponL/R`, `hip`, `upperLegL/R`, `lowerLegL/R`, `footL/R`, `backpack`, `reactor`,
`bus`, `capacitor`, `coolant`, `thrusterL/R`, `jumpJet`, `jetL/R`, `radiatorL/R`, `ventL/R`,
`shield`, `crest`, `extraLegL/R`, `flareL/R`, plus decorative `jointL/R` and `kneeL/R`.

`explode.directions[anchor]` is a 3D outward vector; `TEAR DOWN ▸` / the separation slider offsets
each hull by `step * stepScale * direction` so parts drift apart instead of staying a pile of boxes.

## Part sets and internals

`partSets` has six archetype profiles (`biped`, `reversejoint`, `knight`, `spider`, `tetrapod`,
`corpo`), each with 30–34 mounting bays. Every bay references an `internalsCatalog` assembly:

```json
{
  "anchor": "thrusterL",
  "name": "L vector thruster",
  "internalsKey": "thruster",
  "salvage": 180,
  "blueprint": "bp_biped_23"
}
```

`internalsCatalog` has **20 assemblies**. Alongside the original `torso`, `cockpit`,
`shoulder_actuator`, `leg_actuator`, `ew_suite`, `reactor_core`, `weapon_mount`, `jet_pack`, `hip`,
`foot` and `armor`, the new mech part assemblies are `thruster`, `jump_jet`, `radiator_bank`,
`capacitor_bank`, `coolant_loop`, `power_bus`, `arm_actuator`, `sensor_suite` and `vent_panel`.
Each sub-component carries `qty` and all six attributes:

```json
{ "name": "Plasma injector", "qty": 1, "powerDraw": 28, "mass": 22,
  "heatGen": 14, "heatDiss": 0, "rcs": 1.1, "ecm": 0, "material": "corite" }
```

`MF.tdParts(design)` sums `qty × six` into a part total; `SCAN INTERNALS` reveals the full table.
`components.json` also gained 12 installable parts (38 total) in new types `thruster`, `jumpjet`,
`cooling`, `power`, `sensor`, `vent` for PREFAB ASSEMBLY mode.

## Fit / transfer balance (`MF.sim.fitBalance`)

Each bay is a real load. With reactor `netOutput`, `busPct` and `coolantPct` from the sliders:

```
distance_i  = |bay_i − reactor_core|
loss_i      = draw_i × k × distance_i          (k = view.fit.transferLossPerUnit)
delivered_i = draw_i + loss_i
effDiss_i   = diss_i × (coolantPct/100) × max(0, 1 − k × distance_i × 0.5)
margin_i    = effDiss_i − heatGen_i           (negative → HOT SPOT)
busCapacity = netOutput × busPct/100          (split across BUS A/B/C)
```

Flags: `BUS OVERDRAW`, `COOLANT SATURATION`, `HOT SPOT`, `TRANSFER LOSS`, `UNROUTED NODE`. These
are also in `simulation.json` `validationStates`; two live equations (`bus_transfer`,
`loop_balance`) show the substitutions. `MF.sim.autoRoute` greedily assigns each bay to the
least-loaded bus and coolant loop; `AUTO ROUTE` applies it. `STRESS FIT` cuts bus and coolant to
55% to provoke the flags. `APPLY FIT → FORGE` writes the routed totals (including transfer losses
and waste heat) into a freeform subsystem so the fit changes the deployable build.

## UI behaviour

| Control | Effect |
| --- | --- |
| Chassis select | Switches profile; clears fit routes. |
| Layer buttons | Toggle WIREFRAME / INTERNALS FIT / POWER / HEAT FLOW independently. |
| `TEAR DOWN ▸` / separation slider | Explodes parts along `explode.directions` by `step * stepScale`. |
| Click a part / bay / routing row | Selects it; highlights the hull, bay marker and its bus/heat routes; shows its INTERNALS tree. |
| `SCAN INTERNALS` | Reveals all six attributes per sub-component. |
| `AUTO ROUTE` / `STRESS FIT` / `RESET FIT` | Re-route, stress or reset the bus/loop balance. |
| `BUS CAPACITY` / `COOLANT FLOW` | Scale bus throughput and pump-driven dissipation. |
| `APPLY FIT → FORGE` | Create/update a consequential freeform subsystem in INTERNAL SYSTEMS. |
| `EXTRACT TO INVENTORY` | Bank salvage, XP, blueprints and inventory rows. |
| `USE AS TEMPLATE` / `COMPARE` / `REASSEMBLE` | Template hand-off, side-by-side metrics, reset separation. |

Right-hand panels: **MOUNTING BAYS** (six attributes per part), **FIT & TRANSFER BALANCE**
(reactor net, bus load, heat margin, transfer loss, flags, bus/loop gauges, per-bay routing table),
**INTERNALS TREE**, **REACTOR TELEMETRY / YIELD** (raw harvest, throughput, gross output, resonance,
biome multiplier, meltdown, salvage and blueprints).
