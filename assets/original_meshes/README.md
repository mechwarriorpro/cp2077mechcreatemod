# ORIGINAL EXAMPLE MESHES — 0.1.9-test

These files are **our own geometry**, exported from `models.json` by
`python3 tools/export_meshes.py`. The only model sources are the 30 allowed
`chassis.json` roster examples (`models.json → policy.onlyExamplesAllowed`).

**STATUS: ORIGINAL GEOMETRY. NOT BUILT into an `.archive`. NOT INSTALLED.
NOT COMPILED. NOT IN-GAME VERIFIED.** The installable path in this repository
remains CET-only (`cet_mod/.../mechfall_forge/init.lua`).

| File | Purpose |
|---|---|
| `mechfall_<id>.glb` | glTF 2.0 binary, one named mesh per destructible part, flat outward normals, per-section materials. Import with WolvenKit (`Import → glTF/GLB`) or Blender. |
| `mechfall_<id>.glb.import.json` | WolvenKit import-parameter **template** (documentation; not executed here). |
| `mechfall_<id>.obj` | Wavefront fallback for Blender, with `mechfall.mtl`. |
| `manifest.json` | SHA256 + part/triangle counts + provenance for all 30 exports. |
| `README.md` | This file. |

**No ripped, extracted, imported, third-party or base-mod assets.** This sandbox
has no game installation, no `.archive` files and no WolvenKit; there was nothing
to extract. Seats, mounts, rigs, animations, VO and compiled `.mesh`/`.ent`/`.rig`
resources still have to be authored on a machine with WolvenKit + Cyberpunk 2077
patch 2.31. See `docs/ORIGINAL_MESH_PIPELINE.md` and
`docs/integration/archivexl.archive.example.md`.

**Next step (NOT done here):** `docs/ONLINE_AUTHORING.md` and
`docs/authoring_brief.json` list online AI models / LLM agents that can author
rigs, animations, VO, seats and mounts on a machine with WolvenKit + the game.

Regenerate: `python3 tools/export_meshes.py` · Verify: `python3 tools/export_meshes.py --check`
