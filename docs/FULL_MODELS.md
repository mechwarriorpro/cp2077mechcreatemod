# FULL MODELS & TRACES — examples only

`0.1.6-test` adds a closed **full-model / trace library** and a tenth browser tab, **MODEL LIBRARY**.
The requirement is literal: **the 30 example chassis are the only allowed full models and traces.**
No other model source is accepted.

## 1. What counts as an allowed full model

| Rule | Enforcement |
|---|---|
| Only the 30 `chassis.json` roster examples | `models.json → policy.onlyExamplesAllowed`, `allowedSourceIds` (exactly the 30 roster ids), `allowedCount: 30` |
| Every model must carry that example's **complete** shape vector | each `models[].shape` equals `chassis.json → roster[].shape`, including `shape.sig` |
| Every model must carry its example's signature-part composition | each `models[].sig` equals `chassis.json → roster[].shape.sig` |
| Generic untyped hulls rejected | `policy.rejectGenericHulls` + `MF.models.isAllowed()` in `tools/src/26_models.js` |
| Numeric-only scaling rejected | `isAllowed()` requires all six signature slots (frame / head / shoulders / back / arms / legs) **and** every accent to be an id from `chassis.json → signatureParts` |
| Custom designs must use example parts | `policy.customDesignsMustUseExampleParts`; BAKE SHAPE and DEPLOY in MECH FORGE refuse a shape that fails `isAllowed()` |
| No imported / ripped / extracted / screenshot-traced / third-party / base-mod geometry | `models.json` is generated **only** from `chassis.json` by `tools/build_models.py`; `validate.py` compares every shape and sig back to its source example |

Players can still **mix example parts freely**, redesign every numeric parameter and design all internals
from scratch. The restriction is on *where full-model geometry may come from*, not on customisation.

## 2. What each of the 30 entries contains

`models.json` (regenerate with `python3 tools/build_models.py`):

```
meta.version                      0.1.6-test
policy.onlyExamplesAllowed        true
policy.allowedSourceIds           [30 chassis.json roster ids]
models[] (30)
  id / sourceId / name / faction / archetype / role / bodyPlan
  sig                            complete signature-part composition (7 slots)
  shape                          complete 20-parameter shape vector + shape.sig
  trace.front / side / top
    outline                      closed full-model silhouette, ~46 points
    parts[]                      every signature component polygon (~10 per view)
    panels[]                     panel / armour seam lines
    bays[]                       physical internal mounting bays with names + radii
    axes                         centre axis
  sourceNote / allowed
```

The **internal mounting bays** are the physical placement side of the engineering sandbox: reactor,
power bus, capacitor bank, coolant loop, ECM suite, sensor mast and actuator clusters. They are
derived from the example's own parameters (torso width / height / depth, shoulder width, hip width,
leg stance, style, signature frame) — never from an external blueprint.

All 30 front outlines are distinct (`30 distinct front outlines` at generation time). The side and
top views are **deterministic affine projections of that example's front profile** (not independent
measurements) — the model library makes no claim to be an extracted game mesh, a rig, an animation,
a texture, or a CAD file.

## 3. Browser MODEL LIBRARY tab

`tools/src/26_models.js` renders:

* a **full 3D model** per example — `MF.mesh3d.fromShape(model.shape)` + `MF.mesh3d.render(...)`,
  driven by that example's own shape vector and signature parts, rotatable with **ROTATE MODEL**;
* a **full blueprint trace** — FRONT / SIDE / TOP switch, outline, component polygons, panel lines
  and labelled internal bays;
* a **30-card gallery**, one trace thumbnail per allowed example;
* **LOAD INTO FORGE** (copies the example's full shape + sig into MECH FORGE), **DEPLOY IN PILOT**
  (bakes the example's silhouette into the procedural pilot), and **VALIDATE ACTIVE DESIGN**
  (reports whether the current custom shape is example-derived);
* the example-only policy, the allowed-source count and the no-imported-assets declaration.

## 4. CET / data coverage

`tools/generate.py` embeds `models.json` as the ninth HTML data section and puts the example-only
policy into `MF.data.models` inside the generated CET `init.lua`. `tools/validate.py --strict`
checks: 30 models, allowed ids equal to the roster, every shape/sig equal to its example, complete
front/side/top traces with bays, and 30 distinct front outlines. `tools/smoke_test.js` renders the
new tab, rejects a generic hull, switches trace views, rotates the model and counts 30 thumbnails.

## 5. Generation & provenance

```
chassis.json (30 examples, 20 shape keys, 59 signature parts)
        │
        ▼  python3 tools/build_models.py   (hashlib-seeded, deterministic, no network)
models.json (30 full models + 90 blueprint traces)
        │
        ▼  python3 tools/generate.py
test_build.html · ROSTER.md · CET init.lua
```

`tools/build_models.py` reads exactly one input file and writes exactly one output file. There is no
asset import step, no image input, no mesh download, no base-mod file and no `.archive` / `.mesh` /
`.ent` / `.reds` generated here. This is procedural model data derived from examples, not game
content.

## 6. Honest limits

* The traces are **blueprints**, not rips. They are generated from the example parameters, not
  traced from screenshots, extracted from game archives or copied from a third-party model.
* The full 3D model uses the sandbox's existing procedural triangulated mesh. It is **not** a
  custom in-game mesh/rig. The installable CET path still references **vanilla game records only**;
  see `docs/INGAME_PILOT.md`.
* Nothing here is verified inside Cyberpunk 2077. Custom meshes, rigs, animations, VO, vehicle
  seats and mount systems still need ArchiveXL / TweakXL / Codeware / redscript work and, where
  derivative assets are involved, permission from the original authors.
