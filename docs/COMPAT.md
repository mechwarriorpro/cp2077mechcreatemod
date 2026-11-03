# COMPAT.md — Autodrive + Crystal Coat compatibility

`compat.json` is the single source of truth. This is an **optional compatibility layer**: shared public
concepts, key names and the Crystal Coat share-code format, plus `pcall`-wrapped `GetMod` detection in
CET. It **does not** bundle, patch, require or control any other mod, and it does not redistribute
any base-mod or third-party files.

## Autodrive

- Cyberpunk 2077 **2.3** added vanilla Auto Drive (drive to a tracked map pin, `V` key). Community
  mods: **Auto drive** by nobo (Nexus 14680), **Auto Drive Enhanced** (Nexus 23157), and the
  **Auto Drive CET hotkey for Wander** add-on (Nexus 19309).
- Browser: `MF.compat.autodrive.steer()` is a deterministic waypoint/obstacle-avoidance solver used by
  the `PILOT TEST` autopilot (`T`). Works with no mods installed. `GENERATE CET LUA` emits the link
  state.
- CET (`init.lua`): `MF.compatProbe()` tries `GetMod()` for the names in
  `compat.autodrive.modNames`, wrapped in `pcall`. `MF.compatHandoffWaypoint(x, z)` only calls a
  function if the detected table actually exposes one of the documented method names, also inside
  `pcall`. If nothing is detected it logs the browser fallback and returns `false`. No mod is ever
  required.

## Crystal Coat

- CrystalCoat™ is the native **2.2+** dynamic vehicle paint: a primary colour, a secondary colour, a
  light hue, and paint aspects (metallic / glossy), opened by holding `Y` while seated.
  **Crystal Coat Picker — Hex Codes and Color Library** (Nexus 35571) adds exact hex entry and
  one-line share codes such as `CCP1;P=C81E3C;S=202024;L=200;N=Night Runner`.
- Mechs are **not vehicles**, so FORGE 77 implements a procedural equivalent: `MF.compat.clampCoat()`,
  `encodeCoat()` / `decodeCoat()` (CCP1 format, extended with `A/M/R/F/W/E/D/B` fields for the
  procedural shading parameters), six coat presets, and `MF.mesh3d.coatMaterials()` which shades
  every generated triangle from those values — no textures, no image files.
- The `PILOT TEST` side panel edits primary/secondary hex, aspect, light hue, metallic, roughness,
  flake, wear and emission live; `APPLY CODE` / `COPY CODE` / `SYNC FROM CET` round-trip the share code.
- CET: `MF.compatProbe()` detects the picker with `pcall(GetMod)`, `MF.compatSyncCrystalCoat()` reads
  colours only if the table exposes a known getter, and `MF.compatParseCoat()` /
  `MF.compatEncodeCoat()` handle the CCP1 code. The `COMPAT` ImGui tab exposes all of this.

## CET inter-mod communication

`GetMod()` is CET's documented mechanism for communication between mods, and should be called after
CET has initialized all installed mods (i.e. in `onInit`). All our probes are `pcall`-wrapped, the
module loads cleanly when `GetMod` returns `nil`, and `tools/lua_test.js` verifies the module, its
`onInit`/`onDraw` handlers and the compat functions under a stub where no mods are present.

## What compatibility does **not** mean

It does not make a 3D mech driveable inside Cyberpunk 2077, does not apply real CrystalCoat materials
to a game vehicle entity, does not call private base-mod APIs, and does not ship, modify or
redistribute anyone else's files. In-game piloting still needs meshes, rigs, animations, VO, the
game itself and private base-mod APIs.
