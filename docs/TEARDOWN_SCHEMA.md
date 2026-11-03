# TEARDOWN_SCHEMA.md — exploded wireframes & INTERNALS trees

`teardowns.json` defines procedural part sets. No models or images are loaded: boxes come from
`MF.shapeParts(shape)` in `tools/src/20_render.js` and are drawn as wireframes on canvas.

## Structure

```json
{
  "actions": ["TEAR DOWN", "SCAN INTERNALS", "EXTRACT TO INVENTORY",
              "USE AS TEMPLATE", "COMPARE", "REASSEMBLE"],
  "internalsCatalog": {
    "<key>": {
      "label": "Shoulder actuator",
      "internals": [
        { "name": "Servo motor", "qty": 2, "powerDraw": 6.0, "mass": 18,
          "heatGen": 3.2, "heatDiss": 0, "rcs": 0.4, "ecm": 0, "material": "myomer/copper" }
      ]
    }
  },
  "partSets": {
    "<archetype>": [ { "anchor": "shoulderL", "name": "L shoulder actuator",
                       "internalsKey": "shoulder_actuator", "salvage": 48,
                       "blueprint": "bp_biped_2" } ]
  },
  "explode": { "stepScale": 0.42, "directions": { "shoulderL": [-1, 0.35, 0], ... } }
}
```

Anchors resolve to parametric boxes: `torso`, `head`, `backpack`, `reactor`, `shoulderL/R`,
`upperArmL/R`, `foreArmL/R`, `weaponL/R`, `hip`, `upperLegL/R`, `lowerLegL/R`, `footL/R`,
`jetL/R`, plus style extras. `partSets` exist for `biped`, `reversejoint`, `knight`, `spider`,
`tetrapod` and `corpo` archetypes, so **every one of the 30 prefabs and every custom design** has a
teardown manifest.

## Canonical internals examples

- **Shoulder actuator** → servo motor ×2, myomer bundle ×4, coolant capillary ×6, mana conduit ×2,
  crystal shard ×1, logic chip ×1, bolts ×8.
- **Reactor core** → mana crystal, containment lattice, atmospheric inlet filter, flow regulator,
  growth coil, vent stack, dampening-field emitter, backup capacitor, resonance dampers ×4.
- **Leg** → upper/lower actuator, knee damper, mana bus, foot pad, ankle gyro, armour plates.
- **EW suite** → jammer array, antenna ×2, decoy dispenser, LPI modulator, ECCM filter.
- Also `torso`, `cockpit`, `weapon_mount`, `jet_pack`, `hip`, `foot`, `armor`.

Every sub-component carries **power use · weight · heat generated · heat dissipated · RCS
contribution · ECM contribution**. Totals per part are the qty-weighted sum, shown in the part
manifest and the INTERNALS tree.

## UI behaviour

| Action | Effect |
|---|---|
| `TEAR DOWN ▸` / separation slider | Explodes boxes along `explode.directions` by `step * stepScale` |
| Click a part | Selects it via hit-test; highlights the wireframe box |
| `SCAN INTERNALS` | Reveals the six attributes (masked until scanned) |
| `EXTRACT TO INVENTORY` | Banks salvage, XP, part blueprints and inventory entries |
| `USE AS TEMPLATE` | Copies shape + subsystems into the editable Forge working copy |
| `COMPARE` | Side-by-side telemetry for two designs (12 metrics) |
| `REASSEMBLE` | Step 0 |

The right panel shows reactor telemetry (raw harvest, throughput, gross output, resonance, biome
multiplier, meltdown) and yield. Teardown also feeds `blueprints`, `salvage` and reactor presets
back into the Hangar / Reactor Lab.

`tools/validate.py` checks that every `internalsKey` resolves, every internal has all six numeric
attributes, and every `anchor` is a known shape box.
