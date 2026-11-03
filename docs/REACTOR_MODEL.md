# REACTOR_MODEL.md — the mana reactor

The reactor is the **sole power source** and is itself one subsystem among many. Its heat, mass,
parasitic power draw, crystal RCS and ECM damping feed the same six-attribute budget as every
player-authored component.

## Inputs

| Symbol | Key | Meaning | Range |
|---|---|---|---|
| `F` | `manaFlow` | Requested mana flow | 0–12 mana/s |
| `G` | `manaGrowthRate` | Growth coil regeneration | 0–12 mana/s |
| `A` | `rawAtmosphericManaInput` | Raw ambient mana intake | 0–12 mana/s |
| `η` | `manaCrystalEfficiency` | Crystal conversion efficiency | 0.05–0.99 |
| `S` | `crystalSize` | Crystal size in `S_ref` units | 0.2–3.2 |
| `Q` | `crystalGrade` | Grade 1–5 | 1–5 |
| `C` | `containment` | Containment lattice quality | 0–0.98 |
| `W` | `coolantFlow` | Coolant flow | 0.05–4 |
| `L` | `filtration` | Inlet filtration | 0–1 |

## Equations (implemented in `tools/src/10_sim.js`, mirrored in the CET `init.lua`)

```
rawHarvest   = A * biomeMultiplier * L
growthPool  += (G - F) * dt
throughput   = min(F, growthPool + rawHarvest)
grossMana    = throughput * η * (S^sizeExponent) * (1 + gradeBonus*(Q-1))
grossOutput  = grossMana * outputScale              // mana/s -> kW
heatLoad     = (throughput / max(W,0.05)) * η * (1-η) * heatLoadFactor * (1+gradeBonus*(Q-1))
instability  = (S/S_ref)^instabilitySizeExponent * (F/F_ref)^instabilityFlowExponent
               * (1-η) * (1-C) * (1+heatLoad)
netOutput    = grossOutput * (1 - min(instability,1)*derateFactor)
crystalSig   = signatureFactor * S^(instabilitySizeExponent*0.75) * (1-η*0.45)
               + resonanceFactor * S^(instabilitySizeExponent*0.6) * (F/F_ref) * 0.35
heat         = grossOutput*(1-η)*0.12 + heatLoad*8 + instability*5
parasitic    = 3.5 + grossOutput*0.045 + W*1.6 + C*2
meltdown     = instability > 1.0
```

**Unit note.** `outputScale` (default 34) converts mana throughput to kW so the reactor can feed
kW-scale subsystem draws. `heatLoad` is the *size-independent* flow/regulator duty — a larger
crystal raises power and resonance, not coolant-loop duty. That keeps the nominal rule exact:

```
2^sizeExponent            = 2^0.85 ≈ 1.80   → doubling S ≈ 1.8× GROSS power
2^instabilitySizeExponent = 2^1.6  ≈ 3.03   → doubling S ≈ 3× instability
```

`netOutput` after the derate is lower than 1.8× — this is the visible trade-off, not a bug.
All exponents and constants live in `reactors.json` and are editable in **SETTINGS → REACTOR MODEL
EXPONENTS**; nothing is hard-coded in the UI.

## Biome multipliers for `A`

| Biome | Multiplier | Note |
|---|---|---|
| Night City | 0.6 | Smog and arcology shielding |
| Badlands | 1.0 | Baseline open atmosphere |
| Corite / Marcens | 1.6 | Corixium-rich strata |
| Ether rift | 2.2 | Knights & Magic style ether storm |
| Indoors | 0.25 | Shielded interiors |
| Orbit | 0.1 | Near-vacuum; harvest collapses |

`MANA STARVATION` triggers when harvest + growth pool cannot sustain `F`. Low ambient mana crushes
`rawHarvest`; orbit/indoors builds must raise `G`, `L` or lower `F`.

## Presets (from teardown telemetry)

| id | Name | Character |
|---|---|---|
| `ikaruga_twin_ether` | Ikaruga Twin Ether Reactor | Twin ether crystals, high flow, strong containment |
| `corite_corixium` | Corite Corixium Core | Dense crystal, aggressive flow, runs hot |
| `coral_reactor` | Coral Reactor | Compact, resonant, huge surge margin |
| `clan_xl_fusion` | Clan XL Fusion | Fusion-assisted lattice; stable but massive |
| `militech_rtg` | Militech RTG | Low output, very low signature, near-zero instability |
| `vanguard_link_shard` | Vanguard Link Shard | Balanced companion-grade baseline |

## Failure modes

- High `instability` → surges, misfires, shield flicker, core loss and HUD glitch in combat.
- `CRYSTAL RESONANCE` (>0.55) → extra RCS from the crystal's resonance signature.
- `LATTICE OVERFLOW` (>0.72) → containment lattice driven beyond design flux.
- `CONTAINMENT FAILURE` (>0.95) / `meltdown` → forced vent, Protocol 3 eject; a repeat failure
  while the eject cooldown is active ends the combat test.
- `crystalSignature` is added to RCS: a bigger crystal is easier to detect even with RAM coating.

## UI

**REACTOR LAB** exposes all nine sliders, biome selector, presets, live 30 s chart
(`netOutput`, `instability×20`, `temperature×20`, `heat`), the crystal-size-vs-power-vs-stability
curve, live equation substitution and warnings. `SAVE AS SUBSYSTEM` makes the current tuning a
reusable component; `SEND TO FORGE` applies it to the active design.


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


---

## 0.1.9-test — original mesh exports, no ripped assets

`tools/export_meshes.py` exports the 30 example-only `models.json` meshes as
**original** glTF 2.0 `.glb` + `.obj` geometry into `assets/original_meshes/`
(892 parts / 10,704 triangles), with SHA256 provenance and a `--check` drift
test wired into `validate.py --strict`. Box triangles are now outward-wound.
**No ripped, extracted, imported, third-party or base-mod assets** — this sandbox
has no game install, no archives, no WolvenKit and no asset-host route, and this
GitHub repo is public. Exports are **NOT INSTALLED / NOT COMPILED / NOT BUILT
INTO AN ARCHIVE / NOT IN-GAME VERIFIED**; CET-only install path over vanilla
records is unchanged. See `docs/ORIGINAL_MESH_PIPELINE.md`.
