# ArchiveXL integration — EXAMPLE / NOT INSTALLED

This file documents what a future ArchiveXL layer would need. **No `.archive`, `.xl` or mesh file
is shipped in this repository.** The installable path is CET-only.

A real release would require:

1. Original, permission-free meshes, rigs and animations authored from scratch.
2. An `.archive` with those assets and a validated `.xl` manifest (appearances, entity records,
   factory definitions).
3. Verified compatibility with the target patch (CP2077 2.31, CET 1.37.1 + RED4ext) and the base mod's dependencies
   (ArchiveXL, TweakXL, RED4ext, redscript, Codeware, AudioXL 0.9.x, CET, Vehicle Turret Core).
4. Written permission from the BT-7274 authors before any derivative asset use.
5. A compile/validation test before shipping, because a broken archive or manifest can break the
   user's game.

Until then, all browser visuals are procedural canvas wireframes in `test_build.html`, and the
CET-only in-game pilot spawns/moves **vanilla game entities by record reference** (see
`docs/INGAME_PILOT.md`). No custom mesh or archive is shipped. See `docs/AssetManifest.md`,
`docs/integration/custom_mech_entity.example.md` and `PERMISSIONS.md`.
