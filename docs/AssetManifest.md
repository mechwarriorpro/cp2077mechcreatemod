# AssetManifest.md — what is (and is not) shipped

## Shipped assets

| Asset | Source | Format |
|---|---|---|
| All chassis silhouettes, thumbnails, exploded wireframes, combat sprites | `MF.shapeParts()` + canvas 2D API at runtime | procedural vector drawing, no file |
| Front / side / orbit views, dimension labels, grids | canvas 2D API | procedural |
| RCS polar plot, thermal map, ECM coverage ring, dependency graph, charts | canvas 2D API | procedural |
| All icons/badges/bars | CSS + Unicode text | no image files |
| Fonts | system monospace stack (`ui-monospace, Menlo, Consolas, monospace`) | no webfonts |
| Data | inline JSON in `test_build.html` and the six root `.json` files | text |
| In-game UI | CET ImGui widgets in generated `init.lua` | Lua source |

`test_build.html` is one self-contained file: inline `<style>`, one inline `<script>`, one inline
`<script type="application/json">`, canvas. **Zero** external images, fonts, stylesheets, scripts,
audio or network requests. Data URIs / `Blob` are used only for user-triggered JSON exports.

## Not shipped (by design)

- ❌ Any file from the BT-7274 base mod (Nexus 35041).
- ❌ Any mesh, texture, model, audio, logo or other asset from Titanfall, Armored Core,
  BattleTech, Mecha Break, Knights & Magic or Cyberpunk 2077.
- ❌ Any installed `.reds`, TweakXL YAML or ArchiveXL archive (`.example` templates only).
- ❌ Any CDN, Google Font, analytics, remote API or telemetry endpoint.
- ❌ Any credentials, tokens or personal data.

## Generated identifiers

Roster ids, reactor preset ids and subsystem template ids are listed in `ROSTER.md` and embedded in
the generated Lua table. Canonical spelling chosen per chassis, aliases recorded in
`chassis.json` (Earlcumber/Erlecumber, Tzendolg/Tzendolimble, Toybox/Toy Box).
