# ArchiveXL integration — EXAMPLE / NOT INSTALLED

This file documents what a future ArchiveXL layer would need. **No `.archive`, `.xl` or mesh file
is shipped in this repository.** The installable path is CET-only.

A real release would require:

1. Original, permission-free meshes, rigs and animations authored from scratch.
2. An `.archive` with those assets and a validated `.xl` manifest (appearances, entity records,
   factory definitions).
3. Verified compatibility with CP2077 2.5 + Phantom Liberty and the base mod's dependencies
   (ArchiveXL, TweakXL, RED4ext, redscript, Codeware, AudioXL 0.9.x, CET, Vehicle Turret Core).
4. Written permission from the BT-7274 authors before any derivative asset use.
5. A compile/validation test before shipping, because a broken archive or manifest can break the
   user's game.

Until then, all visuals in this project are procedural canvas wireframes in `test_build.html`, and
the in-game surface is an ImGui overlay. See `docs/AssetManifest.md` and `PERMISSIONS.md`.
