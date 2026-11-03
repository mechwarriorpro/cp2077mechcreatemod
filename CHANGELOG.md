# CHANGELOG.md

## 2026-11-03 — initial test build (0.1.0-test)

**From zero project code to a playable prototype + CET-only test mod.**

- Data layer as single source of truth: `simulation.json`, `reactors.json`, `subsystems.json`,
  `chassis.json` (30 prefabs / 6 factions), `components.json`, `teardowns.json`.
- `tools/generate.py` emits `test_build.html`, `ROSTER.md` and the CET `init.lua`; `--check` detects
  drift. All generated outputs are committed so the deliverable needs no build step.
- **INTERNAL SYSTEMS LAB** built first (the emphasis): blank-slate subsystem authoring, 9 categories
  incl. `freeform`, live six-attribute derivation, power budget bar, mass/CoM/inertia, thermal map,
  0–360° RCS polar plot, ECM coverage ring, dependency graph, trade-off matrix, validation list,
  equations with live substitutions, `STRESS TEST`, `EXPORT SUBSYSTEM JSON`, `GENERATE CET LUA`,
  `SEND TO FORGE`.
- **REACTOR LAB**: mana equations, 6 teardown presets, 6 biomes, live 30 s chart, crystal-size vs
  power vs stability curve, configurable exponents, surges / forced vents / containment failure.
- **MECH FORGE**: 18 shape sliders, 5 styles, 6 shape presets, front + side + drag-to-orbit 3D
  wireframes with grid and dimension labels, `RANDOMIZE` / `RESET` / `BAKE SHAPE`, prefab assembly
  mode, subsystem hookup, internals tree.
- **TEARDOWN TABLE**: exploded procedural wireframe, step-through separation, clickable parts,
  INTERNALS trees (shoulder actuator, reactor core, leg, EW suite, etc.), salvage / blueprints /
  reactor telemetry, `COMPARE`.
- **COMBAT TEST**: player-baked silhouette, WASD + mouse, Q/E/R, Shift dash, V vent, 1–4 companion
  orders, waves + bosses, Protocol 3, XP/salvage, and live consequences for power, mass, heat, RCS,
  ECM and reactor instability.
- HANGAR, DOSSIER, SETTINGS (all coefficients/exponents editable, import/export all state).
- CET-only ImGui mod with hangar/systems/forge/reactor/settings, pcall-wrapped optional hooks,
  hotkey toggle; redscript/TweakXL/ArchiveXL remain `.example` templates.
- `tools/validate.py`, `tools/build_package.py`, `tools/smoke_test.js`, `tools/lua_test.js`,
  `.github/workflows/validate.yml`, `push_to_github.sh`, `.gitignore`.
- Balance: `outputScale` converts mana throughput to kW; `heatLoad` is a size-independent flow duty
  so doubling crystal size gives ≈1.8× gross power and ≈3× instability exactly; reactor heat and
  crystal RCS are counted once. Browser and CET telemetry agree within rounding.
- No ripped assets, no base-mod files, honest capabilities disclaimer.

## Open questions (defaults chosen, change in SETTINGS/data if needed)

1. Franchise names are canonical textual references; shipped shapes are original procedural ones.
2. Repo name / visibility / license: `mechfall-forge`, public, CC BY-NC-SA 4.0 (carve-outs).
3. GitHub auth: provided by the Arena connection; `push_to_github.sh` also checks `gh auth status`.
4. Meltdown: Protocol 3 auto-eject with a 20 s test cooldown; repeat failure ends the test.
5. Exponents for `S`, `F`, RCS and ECM: config in `reactors.json` / `simulation.json`.
6. Target patch: CP2077 2.5 + Phantom Liberty (current base mod).
