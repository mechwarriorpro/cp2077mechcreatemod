# MECHFALL // FORGE 77 — HANDOVER (single consolidated file)

**Date:** 2026-11-03 (Australia/Sydney)
**Status:** Research + definition complete. **No project code written yet.** This is the only handover file.
**How to use:** Paste this entire file as the first message of the new coding chat (or attach it). It contains both the paste-ready brief and the full spec.

> **Latest user instruction (verbatim intent):** *"Condense into one file again. Emphasis is on fully customisable mechs and chassis as well as player-designed internal subsystems with power use, weight, heat generation/dissipation, radar cross sections and ECM."*
> This supersedes all earlier "add lots of other mechs" framing. Everything below is filtered through that priority.

---

## 0. PASTE-READY BRIEF (put this at the top of the new chat)

> Build **MECHFALL // FORGE 77**, a Cyberpunk 2077 addon for the **Titanfall BT-7274 (Quest and Companion)** mod (Nexus 35041). **The point is fully custom mech creation**, not a roster of famous mechs. Players must be able to design the **chassis shape and limbs** from scratch (prefab lists AND a full modeling table), tear apart example mechs and list every internal part, and **design their own internal subsystems** with explicit **power use, weight, heat generation/dissipation, radar cross section (RCS) and ECM**. A **mana reactor** is the power source: output derives from mana flow, mana growth rate, raw atmospheric mana input and mana-crystal efficiency, and **a larger crystal = more power but more unstable**. Crossover mechs (Titanfall, Armored Core, BattleTech, Mecha Break, Knights & Magic, Night City) are **prefabs / teardown source material**. Deliver a **playable test build**: one self-contained `test_build.html` (inline CSS/JS/canvas, no external assets) plus a **CET-only** CP2077 test mod. Also prepare a ready-to-push local git repo (GitHub connector was unsupported and there are no credentials). No ripped assets; base-mod permission rules apply. Full spec is in this file.

---

## 1. CANONICAL DEFINITION

> **MECHFALL // FORGE 77** is a simulation-grade **custom mech engineering sandbox**. The player authors the frame, the limbs and every internal subsystem — power, mass, thermal, signature and electronic warfare — then stress-tests that design in combat. Famous mechs exist only to be studied, torn apart and mined for parts.

**Priority:** ~75% fully custom mechs/chassis + player-designed internal subsystems · ~15% prefab/teardown library · ~10% combat test harness (exists to prove custom builds work).

**Non-negotiable emphasis:** fully customisable mechs **and** chassis; player-designed internal subsystems; **power use**, **weight**, **heat generation / dissipation**, **radar cross sections**, **ECM**. These five are first-class, visible, editable and consequential — not flavour text.

---

## 2. HARD REQUIREMENTS

| # | Requirement |
|---|---|
| R1 | Targets the real BT-7274 mod (Nexus 35041) as an optional companion layer; never bundles or edits its files. |
| R2 | **Fully custom chassis + limbs:** parametric shape editor, front/side/drag-to-orbit wireframe, baked silhouette rendered in combat. Both **prefab lists** and **full modeling table** modes required. |
| R3 | **Player-designed internal subsystems:** blank-slate authoring (name a subsystem, set its parameters, save as a reusable component), not just picking from a list. Every subsystem exposes **powerDraw, mass, heatGen, heatDiss, RCS contribution, ECM contribution**. |
| R4 | Explicit simulation of **power budget**, **weight/CoM/inertia**, **heat generation vs dissipation**, **radar cross section by aspect angle**, and **ECM / jamming / decoys / ECCM**, with live gauges, trade-off warnings and combat consequences. |
| R5 | **Mana reactor** is the power source: `manaFlow`, `manaGrowthRate`, `rawAtmosphericManaInput`, `manaCrystalEfficiency`, `crystalSize`; bigger crystal = more power but non-linearly more unstable; biome-dependent ambient mana. |
| R6 | **Teardown Table:** exploded wireframe of any prefab, step-through separation, per-part **INTERNALS** tree (with the six attributes above), salvage, blueprints, reactor telemetry. |
| R7 | Prefab library (~30 chassis, 6 factions) used as deployable examples, teardown sources and shape/part templates. `UNLOCK ALL (TEST MODE)`. |
| R8 | Hostile mechs, boss waves, hangar/chassis selector, salvage/XP progression — but only as the test harness. |
| R9 | `test_build.html` tabs: **HANGAR · TEARDOWN · REACTOR LAB · INTERNAL SYSTEMS · MECH FORGE · COMBAT TEST · DOSSIER · SETTINGS**. |
| R10 | "Full test mod" = (A) playable browser prototype + (B) **CET-only** `init.lua`. Redscript/TweakXL/ArchiveXL stay as `.example` templates only. |
| R11 | Local git repo `mechfall-forge` (README, `.gitignore`, Actions workflow, `push_to_github.sh`, `git bundle`). GitHub connector unsupported / no credentials → remote repo cannot be created here. |
| R12 | No ripped IP assets, no redistributed base-mod files, honest disclaimer about what a browser+CET prototype can and cannot do. |

---

## 3. CORE SYSTEMS SPEC

### 3.1 Fully custom chassis & limbs
Player-editable shape parameters: `torsoW, torsoH, torsoD, headScale, shoulderW, shoulderH, upperArm, foreArm, upperLeg, lowerLeg, hipW, footL, weaponX, weaponY, legStance, armorFlare, jetCount, style (angular|rounded|knight|spider|tetrapod)`.
- Front elevation + side elevation + **drag-to-orbit 3D wireframe** with grid and dimension labels.
- Presets (Atlas, Reverse-Joint, Knight, Spider, Tetrapod, Corpo), `RANDOMIZE`, `RESET`, `BAKE SHAPE`.
- Baked shape **drives the combat sprite** — the player sees their own silhouette fight.
- Prefab assembly mode (pick a frame/limb set) and full modeling table mode must both exist.

### 3.2 Player-designed internal subsystems — TOP EMPHASIS
Each subsystem is authored by the player and saved as a reusable component. Suggested categories:

| Subsystem | Player-editable params | Derived outputs |
|---|---|---|
| **Power bus / mana distribution** | bus capacity, conduit gauge, voltage, routing redundancy, fuse limit, capacitor bank, grounding | `powerDraw`, brownout threshold, surge tolerance, transmission loss |
| **Mana reactor** | see §3.3 | `netOutput`, `instability`, `heat`, `crystalSignature` (adds to RCS) |
| **Thermal loop** | coolant type, pump rate, radiator area, heat-pipe count, phase-change mass, vent threshold, insulation | `heatDiss`, `thermalMass`, hotspots, overheat timer |
| **Mass / structure** | frame material, armour density, counterweights, payload hardpoints, CoM offset, bracing | `totalMass`, inertia, sprint speed, dash cost, structural stress |
| **Signature / RCS** | facet angle, RAM coating, edge alignment, cavity shielding, emitter placement, panel gaps | `rcsFront/Side/Rear`, detection range, missile lock time |
| **ECM / EW** | jammer power, antenna gain, band coverage, decoy count, LPI mode, ECCM resistance, chaff, spoofing, EMCON | `jamStrength`, lock-break chance, quickhack resist, **self-emissions** |
| **Sensors / OS** | radar aperture, optical grade, passive/listen mode, targeting solver, AI assist | detection range, lock speed, cooldown multiplier, power draw |
| **Actuators / limbs** | servo count, myomer layers, gear ratio, damper stiffness, joint range | speed, dodge, heat-per-move, mass, moving RCS |

Every part in the Forge and every sub-component in the Teardown Table shows: **power use · weight · heat generated · heat dissipated · RCS contribution · ECM contribution**.

#### Derived model (expose the equations in the UI)
```
powerUsed    = Σ subsystem.powerDraw
powerMargin  = reactor.netOutput - powerUsed              // <0 => BROWNOUT
totalMass    = frame.mass + Σ part.mass + payload
speed        = baseSpeed * (1 - k1*totalMass/massRef) * (1 - k2*structuralStress)
heatGen      = reactor.heat + Σ part.heatGen + movementHeat + ecmHeat
heatDiss     = Σ radiator.area * coolantFlow * efficiency
netHeat      = heatGen - heatDiss
temperature += netHeat * dt / thermalMass                // >1 => DERATE / VENT / MELTDOWN
rcs          = shapeFactor(facets, torsoW, limbStance) * materialFactor(RAM, coating)
             + crystalSignature(S, η) + activeEmissions(jammer, radar, charge)
detectRange  = k * sqrt(rcs) * enemySensorFactor
jamStrength  = jammerPower * antennaGain / (dist^2 * enemyECCM)
lockBreak    = clamp(jamStrength - enemyLockQuality, 0, 1)
selfEmissions= jammerPower * (LPI and 0.25 or 1.0)      // jamming makes you visible
```

#### Trade-offs that must be visible
- Radiator area ↓ heat but ↑ RCS and mass.
- RAM / stealth coating ↓ RCS but ↑ mass and traps heat.
- Larger mana crystal ↑ power, ↑ instability, ↑ heat, ↑ RCS (resonance signature).
- Active ECM ↑ power draw, ↑ heat, ↑ self-emissions; passive/EMCON is quiet but weak.
- Heavy armour ↑ mass, inertia and heat retention; stealth shaping constrains limb geometry.
- Power deficit causes brownouts (abilities fail, HUD flicker); heat saturation derates weapons and forces vents; high RCS makes hostile mechs detect and lock faster; ECM breaks locks but can paint you as a target.

#### Validation states
`BROWNOUT`, `THERMAL SATURATION`, `OVER MASS`, `COM OFFSET`, `STRUCTURAL STRESS`, `RCS EXPOSURE`, `ECM SELF-DETECTION`, `MANA STARVATION`, `LATTICE OVERFLOW`, `CRYSTAL RESONANCE`, `CONTAINMENT FAILURE`, `HARDPOINT OVERFLOW`. Allow deployment anyway in TEST MODE with penalties.

#### INTERNAL SYSTEMS LAB UI
Sliders per subsystem, live **power budget bar**, **mass/CoM readout**, **thermal map**, **RCS polar plot (0–360° aspect)**, **ECM coverage ring**, dependency graph, trade-off matrix, validation list. Buttons: `CREATE NEW SUBSYSTEM`, `SAVE`, `EXPORT SUBSYSTEM JSON`, `GENERATE CET LUA`, `SEND TO FORGE`, `STRESS TEST`.

### 3.3 Mana reactor (the power source, one subsystem among many)
Inputs: `manaFlow F`, `manaGrowthRate G`, `rawAtmosphericManaInput A`, `manaCrystalEfficiency η`, `crystalSize S`, `crystalGrade Q`, `containment C`, `coolantFlow W`, `filtration L`.
```
rawHarvest   = A * biomeMultiplier * L
growthPool  += (G - F) * dt
throughput   = min(F, growthPool + rawHarvest)
grossOutput  = throughput * η * (S^0.85) * (1 + 0.08*(Q-1))
instability  = (S/S_ref)^1.6 * (F/F_ref)^1.2 * (1-η) * (1-C) * (1+heatLoad)
netOutput    = grossOutput * (1 - min(instability,1)*0.45)
heatLoad     = (grossOutput / max(W,0.05)) * (1-η)
meltdown     = instability > 1.0
```
**Rule:** doubling `S` ≈ 1.8× power but ≈ 3× instability. Biome multipliers for `A`: Night City 0.6 · Badlands 1.0 · Corite/Marcens 1.6 · Ether rift 2.2 · indoors 0.25 · orbit 0.1. Presets from teardown telemetry: Ikaruga Twin Ether Reactor, Corite Corixium Core, Coral Reactor, Clan XL Fusion, Militech RTG, Vanguard Link Shard. Live 30 s chart + crystal-size-vs-power-vs-stability curve. High instability → surges, misfires, shield flicker, forced vent, meltdown/eject.

### 3.4 Teardown / internals catalogue
Exploded wireframe → click part → **INTERNALS** tree. Actions: `TEAR DOWN`, `SCAN INTERNALS`, `EXTRACT TO INVENTORY`, `USE AS TEMPLATE`, `COMPARE`, `REASSEMBLE`.
Example internals:
- Shoulder actuator → servo motor ×2, myomer bundle ×4, coolant capillary ×6, mana conduit ×2, crystal shard ×1, logic chip ×1, bolts ×8 — each with power/mass/heat/RCS/ECM values.
- Reactor core → mana crystal, containment lattice, atmospheric inlet filter, flow regulator, growth coil, vent stack, dampening-field emitter, backup capacitor, resonance dampers ×4.
- Leg → upper/lower actuator, knee damper, mana bus, foot pad, ankle gyro, armour plates.
- EW suite → jammer array, antenna, decoy dispenser, LPI modulator, ECCM filter.
Teardown yields salvage, blueprints, reactor telemetry and subsystem templates. Procedural wireframes only in the test build.

### 3.5 Combat test consequences
`WASD` + mouse, `Q/E/R` abilities, `Shift` dash, `1–4` companion orders, waves + bosses, salvage/XP, Protocol 3, HUD bars. Custom chassis **and** custom subsystems deploy together:
- power margin → ability reliability / core charge / weapon damage
- mass → speed, dash, jump, screen shake
- heat → weapon derate, forced vent, meltdown
- RCS → enemy detection range, aggro, missile lock time
- ECM → lock breaks, decoys, quickhack resistance, but higher self-emissions
- reactor instability → surges, glitches, eject

### 3.6 Prefab library (source material, not the headline)
| Faction | Examples | Role |
|---|---|---|
| Titanfall | BT-7274, Ion, Tone, Northstar, Ronin, Scorch, Legion, Monarch | Baseline, Vanguard Link Shard, 4 companion orders, Protocol 3 |
| Knights & Magic | Ikaruga, Toybox, Kaldatoah, Tyrantor, Tzendolg | **Canonical ether/mana reactor lore**; teardown goldmine |
| Mecha Break | Falcon, Tricera, Narukami, Panther, Welkin, Stego | Corite/Corixium + MindBridge reactor presets, Striker limbs |
| Armored Core | Raven-RJ, Tetrapod, Balteus, IBIS | Coral reactor, reverse-joint / tetrapod limbs |
| BattleTech | Atlas, Timber Wolf, Jenner, Marauder | Heat sinks, myomer actuators, fusion internals |
| Night City | Militech "Behemoth", Arasaka "Oni", MaxTac "RAM" | Original permission-free hostile/boss frames |

Spelling varies across wikis (Earlcumber/Erlecumber, Tzendolg/Tzendolimble, Toybox/Toy Box) — pick one canonical name per chassis and record aliases.

---

## 4. BASE MOD CONTEXT (condensed)

- **Titanfall BT-7274 v1.2.0 (Quest and Companion)**, Nexus 35041, by **whatmynickname & sdh0**, for **CP2077 2.5 + Phantom Liberty**, updated 27 Oct 2026. Standalone (not passthrough), ~460 MB.
- Requirements: ArchiveXL, TweakXL, RED4ext, redscript, Codeware, AudioXL 0.9.x, CET, Vehicle Turret Core; AMM / Mod Settings optional.
- Features to mirror: Badlands prologue *"Prologue: A Friend From Beyond"*, Vanguard Link Shard, orbital Titanfall drop, 1st/3rd-person cockpit, XO-16 / Multi-Target Missiles / Vortex Shield / Electric Smoke, Jet Jump / Dash / Punch, **4 AI orders** (`Follow & Fight`, `Follow & Hold Fire`, `Hold Position`, `Wait`), **Protocol 3** auto-eject + 2-min cooldown, **TITAN tree** (5 weapons, Burst Core, Protocols, Flight Strike, Target Designator), MaxTac RAM at 4–5 stars.
- Optional CET hooks (all `pcall`-wrapped, never required): `Game.AddToInventory("Items.BT7274_LinkShard", 1)`, `GetMod("bt_quest").Restart()`, `GetMod("bt_skill_trees").TitanPoints(5)`. Mod Settings page = "Standby for".
- Controls: `NumPad 9` call, `NumPad 8` home, `F` hold embark, `NumPad 0` cycle order, `LMB` fire, `G` missiles, `V` vortex, `B` smoke, `Space` jump, `LCtrl` dash, `Q` view.
- **⚠️ Permissions:** the page says you must get permission before using or modifying its assets, forbids re-uploading elsewhere and forbids Donation Points on derivative asset use. **Do not bundle, edit or redistribute base-mod files.** Also do not rip Titanfall / Armored Core / BattleTech / Mecha Break / Knights & Magic models.

---

## 5. DELIVERABLES / FILE TREE

```
/home/user/mechfall-forge/
├── HANDOVER.md                 # copy of this single file
├── README.md
├── LICENSE.md                  # CC BY-NC-SA 4.0 for original code, IP carve-outs
├── DESIGN.md · NEXUS_PAGE.md (DRAFT) · PERMISSIONS.md · CHANGELOG.md
├── chassis.json · components.json · reactors.json · teardowns.json · subsystems.json
├── test_build.html             # MAIN PLAYABLE DELIVERABLE (inline CSS/JS/canvas)
├── test_build.template.html
├── tools/generate.py           # single source of truth -> html / lua / docs
├── tools/validate.py · tools/build_package.py · tools/init.lua.template
├── cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua
├── docs/REACTOR_MODEL.md · docs/TEARDOWN_SCHEMA.md · docs/SUBSYSTEM_MODEL.md
├── docs/integration/*.example  # redscript / TweakXL / ArchiveXL — NOT installed
├── docs/BaseModHooks.md · docs/AssetManifest.md
├── .github/workflows/validate.yml
├── push_to_github.sh
└── mechfall-forge.bundle
```
`tools/generate.py` emits `test_build.html`, the Lua table and `ROSTER.md` from the JSON files so nothing drifts. CET mod shows hangar + subsystem/forge UI (ImGui bars; the browser owns the visual modeling table). Custom designs export/import as JSON; `GENERATE CET LUA` emits a snippet for `customDesigns`.

---

## 6. GITHUB STATUS

- `list_connector_tools("github")` returned **`unsupported`** in the earlier chat — no GitHub tool available; do not retry that slug there.
- `GITHUB_TOKEN` / `GH_TOKEN` / `GIT_TOKEN` / `GITHUB_PAT` unset; `gh` CLI absent; no `~/.git-credentials`. Network egress works (`git ls-remote https://github.com/git/git.git HEAD` succeeded), git 2.47.3 / node / python3 available.
- **No remote repo can be created from that chat.** Deliver: `git init` + initial commit, `push_to_github.sh` (checks `gh auth status`; if OK runs `gh repo create mechfall-forge --public --source=. --remote=origin --push`), `.github/workflows/validate.yml`, `git bundle create mechfall-forge.bundle --all`, and manual steps. Prefilled link: `https://github.com/new?name=mechfall-forge&visibility=public`.
- In the new chat ask the user to connect the GitHub app, run `gh auth login`, or supply a fine-grained PAT. **Never echo a token.**

---

## 7. GUARDRAILS & HONESTY

- Arena preview iframe is sandboxed (`allow-scripts`, no network) → inline CSS/JS, canvas, data URIs; no CDN/fonts/images. `localStorage` may throw → `try/catch` with in-memory fallback.
- Do **not** put unvalidated `.reds` or TweakXL YAML in the installable path: redscript compiles `r6/scripts` at launch and a syntax error breaks the user's game.
- Be explicit: browser prototype + CET UI is **testable**; a full 3D pilotable-mech release needs meshes, rigs, animations, VO, the game itself and private base-mod APIs.
- Still **zero project code** — only this handover file exists at time of writing.

---

## 8. BUILD ORDER

1. `reactors.json`, `teardowns.json`, `subsystems.json`, `components.json`, `chassis.json`, `tools/generate.py`.
2. **INTERNAL SYSTEMS LAB** — power / mass / heat / RCS / ECM model, gauges, polar RCS plot, dependency graph, validation. *(This is the emphasis: build it first.)*
3. **REACTOR LAB** — mana equations, charts, presets, instability.
4. **MECH FORGE** — fully custom chassis/limb modeling table + prefab assembly + subsystem hookup + internals trees.
5. **TEARDOWN TABLE** — exploded wireframes, internals catalogue, salvage/blueprints.
6. **COMBAT TEST** deploying the player-authored chassis + subsystems with brownout / heat / RCS / ECM / instability effects.
7. Hangar, prefab roster, hostile waves, progression.
8. CET Lua, docs, git repo, bundle, push script, validation.

---

## 9. OPEN QUESTIONS (ask only if blocking)

1. Real franchise names/models vs original homage names for shipped assets?
2. Repo name / visibility / license? (suggested `mechfall-forge`, public, CC BY-NC-SA 4.0 with IP carve-outs)
3. GitHub auth method: connect app / `gh auth login` / PAT?
4. Meltdown severity: destroy frame, or just Protocol 3 eject?
5. Exponents for `S`, `F`, RCS and ECM — expose as config, don't hard-code.
6. Target patch: CP2077 2.5 (current base mod) — confirm.
   > **CONFIRMED (0.1.6-test): this project targets CP2077 patch 2.31** → CET 1.37.1 + RED4ext 1.29/1.30. The 2.5 line refers to the external base mod only.

---

## 10. SOURCES

| Source | Used for |
|---|---|
| https://www.nexusmods.com/cyberpunk2077/mods/35041 | Base mod: features, controls, CET hooks, requirements, permissions |
| https://www.dsogaming.com/mods/cyberpunk-2077-gets-a-titanfall-inspired-mod-with-a-rideable-titan/ | Base mod coverage |
| https://www.shango.media/la-creme-du-gaming-cyberpunk-2077-le-robot-culte-de-titanfall-2-debarque-a-night-city-et-vous-pouvez-meme-le-piloter-11981308 | TITAN tree / packages |
| https://en.wikipedia.org/wiki/Titanfall_2 | Titan roster |
| https://titanfall2.fandom.com/wiki/Titanfall_2_Titans | Titan abilities |
| https://en.wikipedia.org/wiki/Mecha_Break | Striker roster, Corite/Corixium, MindBridge |
| https://mecha-break.fandom.com/wiki/Strikers | Striker list |
| https://digitsguide.com/mecha-break-all-mechs-guide/ | Striker roles/kits |
| https://mmecha.fandom.com/wiki/Mecha_and_Monsters_from_Knights_and_Magic | Silhouette Knight list |
| https://knights-and-magic.fandom.com/wiki/Category:Silhouette_Knights | Silhouette Knight names |
| https://knights-and-magic.fandom.com/wiki/Ikaruga | Ikaruga ether reactor specs — mana lore basis |
| https://www.reddit.com/r/gaming/comments/1xam2ny/bt7274_from_titanfall_2_in_cyberpunk_2077_mod/ | Community context |
| https://www.nexusmods.com/cyberpunk2077/mods/1511?tab=files | redscript 0.5.32 for patch 2.5 |
