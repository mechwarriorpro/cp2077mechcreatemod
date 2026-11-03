# AssetManifest.md — what is (and is not) shipped

## Shipped assets

| Asset | Source | Format |
|---|---|---|
| All chassis views (TEARDOWN, HANGAR thumbnails, MECH FORGE front/side/orbit, baked COMBAT sprite) | `MF.shapeParts()` + `MF.sigGeometry()` + `MF.draw.mech()` + canvas 2D API | original procedural **sleek mech wireframe**: tapered/wedge hulls, domes, pods, swept blades, rings, cell racks, chamfered joint rings, radiator fins and nozzle bells from the 20 shape params **plus a mixable 7-slot signature-part composition** |
| Internals mounting bays + power/heat routing | `MF.draw.mech()` + `MF.sim.fitBalance()` + canvas 2D API | procedural bay markers, bus trunks, heat runs and coolant loops |
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
- ❌ Any imported, traced or extracted third-party model, texture or silhouette (all geometry is drawn procedurally).
- ❌ Any installed `.reds`, TweakXL YAML or ArchiveXL archive (`.example` templates only).
- ❌ Any CDN, Google Font, analytics, remote API or telemetry endpoint.
- ❌ Any credentials, tokens or personal data.

## Generated identifiers

Roster ids, reactor preset ids and subsystem template ids are listed in `ROSTER.md` and embedded in
the generated Lua table. Canonical spelling chosen per chassis, aliases recorded in
`chassis.json` (Earlcumber/Erlecumber, Tzendolg/Tzendolimble, Toybox/Toy Box).

## Signature-part library

Original procedural **signature-part library** (`chassis.json → signatureParts`, 7 slots / 59 part types). Each of the 30 prefabs and 7 shape presets ships a unique `shape.sig` composition, and MECH FORGE lets the player mix them: cockpit pods, cranial skulls, reverse-joint and splayed legs, tetrapod skirts, ether wings, booster fins, missile racks, blade arms, shields, crests, hover discs, tracked siege hulls and legless flight frames. These are original **component TYPES** drawn with canvas geometry — no ripped models, textures, traced silhouettes or base-mod files.


## In-game CET pilot (0.1.5-test)

`docs/INGAME_PILOT.md` is the authoritative manifest for the in-game layer. It ships **no files**:
`compat.json → ingamePilot` contains TweakDB record ids and `.ent` depot paths that already exist
in the player's Cyberpunk 2077 installation. `tools/lua_ingame.part` spawns/moves/despawns those
entities at runtime with CET's `exEntitySpawner`, `WorldTransform`, `registerInput`, `onUpdate` and
`Game.GetTeleportationFacility`. No mesh, rig, texture, animation, VO, `.archive`, base-mod file or
ripped franchise asset is added. Honest limitation: scripted pilot over vanilla entities, not a new
custom mech asset; verified only by Lua/JS tests, not in-game.


## Full model / trace library (0.1.6-test)

| Asset | Origin | Ships in package? |
|---|---|---|
| `models.json` — 30 complete shape vectors + signature compositions | `chassis.json` roster examples, verbatim | yes (data); also embedded in `test_build.html` |
| 90 blueprint traces (front / side / top per example) | deterministic projection of each example's own parameters in `tools/build_models.py` | embedded in `test_build.html` |
| 30 full 3D meshes | runtime `MF.mesh3d.fromShape()` over the example shape + signature parts | runtime only, no files |
| 30 trace thumbnails | runtime canvas drawing in `tools/src/26_models.js` | runtime only, no files |

**No** `.mesh`, `.ent`, `.archive`, texture, image, screenshot, rig, animation, VO, base-mod file or
third-party model is included or generated. The **only** allowed full-model / trace sources are the
30 example chassis. See `docs/FULL_MODELS.md`.


---

## 0.1.7-test additions

Reactor / energy design is **more forgiving** (outputScale 56, derate 0.26, `moduleDrawScale`
0.72, `bulkModuleDiscount` 0.42, relaxed brownout / thermal / mass thresholds) so a maximum
module loadout stays powered. **WEAPON FORGE** adds eight player-authored weapon / shield
categories (energy, ballistic, missile, melee, energy missiles, energy melee, energy shielding,
ballistic shielding). **DAMAGE CONTROL** makes every individual part destructible with a pilot
emergency eject (`X`); cockpit > 70% or aggregate torso > 90% damage triggers FULL DESTRUCTION.
See `docs/WEAPON_FORGE.md`, `docs/DAMAGE_MODEL.md` and `README.md` section 8. No imported assets
or in-game meshes are added; the 2.31 CET matrix and the 30-example-only model policy are
unchanged.


---

## 0.1.8-test

Real shipped 3D meshes + independent side/top traces for all 30 example-only models; designed
weapons now fire (with destructible, regenerating shields); 10 CET ImGui tabs; example-model-driven
in-game part layout; generated reactor/threshold data with a CET↔browser parity harness; four
complete (still NOT installed / compiled / in-game verified) integration specs;
`build_hooks_appendix()` wired into ROSTER. See `README.md` §9 and `CHANGELOG.md`.
