# ORIGINAL MESH PIPELINE — why we did not "rip", and what shipped instead

> **STATUS: NOT INSTALLED · NOT COMPILED · NOT BUILT INTO AN `.archive` ·
> NOT IN-GAME VERIFIED.** The installable path in this repository remains
> **CET-only** (`cet_mod/.../mechfall_forge/init.lua`).
> **NO RIPPED ASSETS · NO EXTRACTED ASSETS · NO IMPORTED ASSETS ·
> NO THIRD-PARTY ASSETS · NO BASE-MOD FILES.**
> Target: Cyberpunk 2077 patch **2.31** → CET **1.37.1** + RED4ext **1.29 / 1.30**.

## 1. The honest answer to "rip those next"

The request was to extract the missing custom in-game resources (meshes, rigs,
animations, VO, seats, mounts) from the game or another mod. That was **not
possible and was not done**, for concrete reasons rather than a policy shrug:

| Blocker | Verified fact |
|---|---|
| No source | `find /home/user` returns **0** `.archive`, `.mesh`, `.ent`, `.app`, `.rig`, `.anims`, `.glb` or `.fbx` files. There is no Cyberpunk 2077 installation in the sandbox. |
| No extractor | No `WolvenKit` / `WolvenKit.CLI`, no REDengine tooling, no asset compiler. |
| No network route | Outbound access is restricted to `github.com`, `npmjs.org` and `pypi.org`. `nexusmods.com` fails TLS (`SSL_ERROR_SYSCALL`). No depot, no mod page, no asset host. |
| Not actually private | `gh api repos/mechwarriorpro/cp2077mechcreatemod` reports `"private": false`, `"visibility": "public"`. Committing extracted CDPR or another modder's files here would be redistribution, not private use. |
| No engine verification | Even with files present, rigs / animations / VO / seats / mounts must be authored and tested inside the engine. This sandbox cannot launch the game. |

A "private mod" does not create files that do not exist, and shipping fabricated
"extracted" assets would be a false claim about the mod. **Only the 30
`chassis.json` roster examples remain the allowed model sources**
(`models.json → policy.onlyExamplesAllowed`), exactly as you specified.

## 2. What shipped instead: real, importable ORIGINAL geometry

`tools/export_meshes.py` converts the real triangulated 3D mesh already shipped
in `models.json` into standard interchange formats:

```
assets/original_meshes/
├─ mechfall_<id>.glb                 30 × glTF 2.0 binary (WolvenKit / Blender import)
├─ mechfall_<id>.glb.import.json     30 × WolvenKit import-parameter TEMPLATE (docs only)
├─ mechfall_<id>.obj                 30 × Wavefront fallback
├─ mechfall.mtl                     original per-section materials (no textures)
├─ manifest.json                    SHA256 + part/triangle counts + provenance
└─ README.md                        status + regeneration commands
```

| Metric | Value |
|---|---|
| Models | **30** (one per allowed `chassis.json` example) |
| Named destructible part submeshes | **892** |
| Triangles | **10,704** |
| GLB bytes | **1,606,076** |
| Sources | `models.json` → `chassis.json` roster only |

Each `.glb` is a valid glTF 2.0 binary (`glTF` magic, version 2, `JSON` + `BIN`
chunks, correct bufferViews/accessors, POSITION bounds, one mesh per part,
outward-wound flat normals, per-section PBR materials, a root node named
`mechfall_<id>`). Each part node carries `extras.section` and `extras.dmgId`
so the damage model's 28 CET parts / 51 browser parts can be bound to named
submeshes later. `parse_glb()` in the exporter re-reads every generated file and
verifies chunk structure, mesh count, index count and provenance extras.

The exporter also refuses to run if `models.json` ever contains an unapproved
`sourceId`, a disallowed model, or asset-source keys such as `ripped`,
`extracted`, `imported`, `baseMod`, `assetPath`, `archivePath`, `sourceFile`.

## 3. Commands

```bash
python3 tools/export_meshes.py            # regenerate all 93 files
python3 tools/export_meshes.py --check    # verify policy + drift (called by validate.py --strict)
python3 tools/export_meshes.py --out DIR  # write to another directory
python3 tools/validate.py --strict        # full suite incl. the export check
```

`tools/export_meshes.py --check` regenerates every file in memory and
byte-compares it against the committed copy, so a stale `models.json` cannot
silently ship mismatched `.glb` files.

## 4. How to turn these into actual in-game resources (on your machine)

This is the part that **requires a machine with WolvenKit and Cyberpunk 2077
2.31**; none of the following was executed here:

1. Copy `assets/original_meshes/mechfall_<id>.glb` into a WolvenKit project's
   `source/raw/mechs/`.
2. Import it with WolvenKit (glTF/GLB → `.mesh`). Use the matching
   `mechfall_<id>.glb.import.json` as a parameter reference; **keep each named
   submesh separate** so the `dmgId` part bindings survive.
3. Build the original `.ent`, `.app`, `.rig`, appearances and `.archive.xl`
   registration exactly as specified in
   `docs/integration/archivexl.archive.example.md` and
   `docs/integration/custom_mech_entity.example.md`. The shipped
   `docs/integration/redscript_hook.reds.example` and
   `tweakxl.yaml.example` define the runtime damage / weapon / balance records.
4. Pack the `.archive`, install with ArchiveXL, then **verify in game** on patch
   2.31 (CET 1.37.1 + RED4ext 1.29/1.30). Spawn / transform / teleport are
   optional and must stay `pcall`-wrapped as the CET pilot does.
5. Only then replace the vanilla-record spawn strings in `lua_ingame.part` with
   the new original record. Until step 5 succeeds, the shipped CET pilot keeps
   using vanilla TweakDB record references.

The project layout and record names are documented in the four integration
specs; **they are documentation, not compiled resources**.

## 5. What is still NOT shipped

* No `.archive`, `.archive.xl` binary, `.mesh`, `.ent`, `.app` or `.rig` resource.
* No custom rig, skeleton, animation, voice-over, seat or mount.
* No game-extracted texture, mesh, sound or third-party mod file.
* No in-game verification of any kind.
* No claim that pure CET Lua can conjure those resources — it cannot, which is
  why the installable path remains CET-only over vanilla records.

The exports are **original geometry you own**, produced from your own 30 allowed
examples. They are the legitimate first half of the resource pipeline; the
second half needs WolvenKit + the game, which this environment does not have.
