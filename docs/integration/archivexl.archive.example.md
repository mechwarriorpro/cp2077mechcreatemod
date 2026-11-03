# ARCHIVE-XL RESOURCE TEMPLATE — COMPLETE SPEC (EXAMPLE ONLY)

> **STATUS:** a complete WolvenKit project specification, structurally validated by
> `tools/validate_integration.py`. It is **NOT INSTALLED**, **NOT BUILT** into an
> `.archive`, and **NOT VERIFIED** against Cyberpunk 2077 patch **2.31**
> (CET 1.37.1 + RED4ext 1.29/1.30). This sandbox has no game, no WolvenKit and no
> asset compiler. The installable path in this repository remains **CET-only**
> (`init.lua`). No base-mod files, ripped assets or third-party meshes are used;
> no Donation Points / derivative asset use. Everything below is original.

## 1. Why this exists

A truly custom in-game mech mesh, rig, animation, VO, seat and mount system needs
`.mesh` / `.ent` / `.app` / `.rig` resources packed into an `.archive` and
registered with ArchiveXL. Pure CET Lua cannot conjure those resources — it can
only spawn **vanilla records** (which is exactly what the shipped IN-GAME PILOT
does). This template closes the documentation gap: it is the complete, honest
spec of what a real resource pipeline would look like, generated from
`models.json` (the 30 example-only full models).

**Only the 30 `chassis.json` examples are allowed as model sources**
(`models.json → policy.onlyExamplesAllowed`). Generic hulls, imported meshes and
numeric-only silhouettes are rejected.

## 2. WolvenKit project layout

```
mechfall_forge/
├─ source/
│  ├─ raw/
│  │  ├─ mechs/
│  │  │  ├─ mechfall_<exampleId>.glb          # generated from models.json mesh
│  │  │  └─ mechfall_<exampleId>.glb.import.json
│  │  └─ textures/
│  │     └─ mechfall_procedural_<name>.png     # generated, no ripped textures
│  └─ archive/
│     └─ base/
│        └─ mechfall/
│           ├─ entities/
│           │  └─ mechfall_mech.ent.json
│           ├─ meshes/
│           │  └─ mechfall_<exampleId>.mesh.json
│           ├─ appearances/
│           │  └─ mechfall_mech.app.json
│           └─ rigs/
│              └─ mechfall_mech.rig.json
├─ resources/
│  └─ mechfall_forge.archive.xl              # ArchiveXL registration
└─ project.wkitproject
```

## 3. Original `.archive.xl` registration (no base-mod records)

```yaml
# resources/mechfall_forge.archive.xl
resource:
  - name: "Mechfall/Mech"
    path: "mechfall\\entities\\mechfall_mech.ent"
    type: "ent"
  - name: "Mechfall/Mesh"
    path: "mechfall\\meshes\\mechfall_bt7274.mesh"
    type: "mesh"
```

## 4. Entity template (`mechfall_mech.ent.json`, abridged but complete in shape)

```json
{
  "Header": { "WolvenKitVersion": "8.16", "DataType": "CR2W" },
  "Type": "entEntityTemplate",
  "Properties": {
    "appearances": ["mechfall_default", "mechfall_coat"],
    "entity": {
      "components": [
        { "$type": "entMeshComponent", "name": "mech_body",
          "mesh": { "DepotPath": "mechfall\\meshes\\mechfall_bt7274.mesh" } },
        { "$type": "entMeshComponent", "name": "cockpit_canopy",
          "mesh": { "DepotPath": "mechfall\\meshes\\mechfall_bt7274_cockpit.mesh" } },
        { "$type": "entSlotComponent", "name": "weapon_mount_L" },
        { "$type": "entSlotComponent", "name": "weapon_mount_R" }
      ]
    }
  }
}
```

Every `MF.damage` part maps to one component: cockpit (2), torso (9), limb,
system, weapon and shield. `MechfallForgeRuntime.ApplyDamage()` (see
`redscript_hook.reds.example`) disables the corresponding component when its HP
reaches zero. **>70% cockpit damage OR >90% aggregate torso damage** destroys
every component and ejects the pilot.

## 5. Mesh generation from `models.json`

`models.json → models[i].mesh` is already a real indexed triangulated part-soup:
`vertices` (metres), `triangles` (`[a, b, c, partIndex]`), `parts` (name, section,
center, half, vertexStart, triangleStart). A generator can:

1. Read `models[i].mesh.vertices` / `.triangles`.
2. Emit one submesh per `parts[]` entry, preserving `section` as a material tag.
3. Write `glTF` / `.mesh.json`, import with WolvenKit, pack the `.archive`.

No geometry is imported, extracted or screenshot-traced. The `section` tags are
the destructible-part groups used by the damage model.

## 6. Appearance (Crystal Coat parity)

`mechfall_mech.app.json` defines `mechfall_default` and `mechfall_coat`, with
material parameters `primary`, `secondary`, `lightHue`, `aspect`, `metallic`,
`roughness`, `flake`, `wear`, `emission` — the same fields as the procedural
Crystal Coat equivalent in `compat.json`. No textures are copied from any mod.

## 7. Rig / animation / seat / mount — explicitly NOT shipped

The template reserves `mechfall_mech.rig.json`, `workspot` and vehicle-seat
records, but **this repository ships none of them**. Custom gait, cockpit
entry, VO and mount systems require Codeware/redscript work and in-game
verification. The shipped CET pilot uses `Game.GetTeleportationFacility():Teleport`
to lock V into a cockpit transform over vanilla records — no custom rig.

## 8. Validation checklist before any real use

1. Compile the `.reds` with redscript for patch **2.31**.
2. Validate the TweakXL YAML against patch **2.31** (`tweakxl.yaml.example`).
3. Build the `.archive` in WolvenKit and confirm all resource paths resolve.
4. Check ArchiveXL loads the resource without overriding vanilla records.
5. Verify in-game on **CP2077 2.31 + CET 1.37.1 + RED4ext 1.29/1.30**; CET
   **1.38.x** drops pre-2.5 support and must not be used.
6. Confirm no base-mod asset, texture or record is referenced anywhere.
7. Obtain written permission from the authors of Nexus mod 35041 before any
   derivative asset use; `NEXUS_PAGE.md` remains a DRAFT and must not be
   published until that is settled.

**Nothing in this repository has been in-game verified.**
