#!/usr/bin/env python3
"""Structural validation of the (NOT INSTALLED) integration templates.

These files are complete specifications, not compiled resources. This checks
that they are internally consistent, cross-reference the same weapon / damage /
model vocabulary as the shipped JSON, and contain no base-mod references.

    python3 tools/validate_integration.py
Called by tools/validate.py --strict and npm test.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / "docs" / "integration"
errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def read(name: str) -> str:
    p = D / name
    if not p.exists():
        err(f"missing integration template {name}")
        return ""
    return p.read_text(encoding="utf-8")


REDS = "redscript_hook.reds.example"
YAML = "tweakxl.yaml.example"
ARCHIVE = "archivexl.archive.example.md"
ENTITY = "custom_mech_entity.example.md"

CATS = {
    "energy_weapon": "EnergyWeapon",
    "ballistic_weapon": "BallisticWeapon",
    "missile_weapon": "MissileWeapon",
    "melee_weapon": "MeleeWeapon",
    "energy_missile": "EnergyMissile",
    "energy_melee": "EnergyMelee",
    "energy_shield": "EnergyShield",
    "ballistic_shield": "BallisticShield",
}

FORBIDDEN = ("Items.BT7274", "bt_quest", "bt_skill_trees", "q003_militech_mech",
             "ArchiveXL/BaseMod", "Nexus 35041 asset")


def main() -> int:
    reds = read(REDS)
    yaml = read(YAML)
    archive = read(ARCHIVE)
    entity = read(ENTITY)

    # ------------------------------------------------------------ completeness
    for name, text, minimum in ((REDS, reds, 4000), (YAML, yaml, 2500),
                                (ARCHIVE, archive, 2500), (ENTITY, entity, 2500)):
        if len(text) < minimum:
            err(f"{name} is still a stub ({len(text)} chars, expected >= {minimum})")
        if "NOT INSTALLED" not in text.upper() and "NOT INSTALLED" not in text:
            err(f"{name} must state it is NOT INSTALLED")
        if "2.31" not in text or "1.37.1" not in text:
            err(f"{name} must target patch 2.31 / CET 1.37.1")

    # ------------------------------------------------------------- redscript
    for opener, closer in (("{", "}"), ("(", ")")):
        if reds.count(opener) != reds.count(closer):
            err(f"{REDS}: unbalanced {opener}{closer}")
    for token in ("module Mechfall.Forge", "MechfallSixAttributes", "MechfallWeaponDesign",
                  "MechfallPartState", "MechfallForgeRuntime", "ValidateExampleOnly",
                  "SectionDamage", "ShieldPool", "ApplyDamage", "EvaluateDestruction",
                  "FullDestruction", "EmergencyEject", "RepairAll", "Describe"):
        if token not in reds:
            err(f"{REDS} missing {token}")
    for snake, pascal in CATS.items():
        if pascal not in reds:
            err(f"{REDS} missing weapon category {snake} ({pascal})")
    if "return 0.70" not in reds or "return 0.90" not in reds:
        err(f"{REDS} must encode the 70% cockpit / 90% torso thresholds")

    # ------------------------------------------------------------------ YAML
    for snake in CATS:
        key = {
            "energy_weapon": "Mechs.Mechfall_Weapon_Energy:",
            "ballistic_weapon": "Mechs.Mechfall_Weapon_Ballistic:",
            "missile_weapon": "Mechs.Mechfall_Weapon_Missile:",
            "melee_weapon": "Mechs.Mechfall_Weapon_Melee:",
            "energy_missile": "Mechs.Mechfall_Weapon_EnergyMissile:",
            "energy_melee": "Mechs.Mechfall_Weapon_EnergyMelee:",
            "energy_shield": "Mechs.Mechfall_Shield_Energy:",
            "ballistic_shield": "Mechs.Mechfall_Shield_Ballistic:",
        }[snake]
        if key not in yaml:
            err(f"{YAML} missing original record for {snake}")
    for key in ("outputScale: 56.0", "moduleDrawScale: 0.72", "bulkModuleDiscount: 0.42",
                "cockpitDestruction: 0.70", "torsoDestruction: 0.90",
                "onlyExamplesAllowed: true", "ships3DMesh: true",
                "game_2_31_cet: \"1.37.1\""):
        if key not in yaml:
            err(f"{YAML} missing {key}")
    # crude YAML indentation / key sanity
    for line in yaml.splitlines():
        if line and not line.startswith((" ", "#", "\t")) and not line.endswith(":"):
            # allow continuation scalar lines only if indented
            err(f"{YAML} has an unexpected top-level scalar line: {line[:60]!r}")

    # --------------------------------------------------------------- archive
    for token in (".archive.xl", ".ent", ".mesh", ".app", ".rig", "models.json",
                  "WolvenKit", "onlyExamplesAllowed", "not shipped", "2.31",
                  "tools/export_meshes.py", "assets/original_meshes", "no ripped"):
        if token.lower() not in archive.lower():
            err(f"{ARCHIVE} missing {token}")

    # ---------------------------------------------------------------- entity
    for token in ("SpawnRecord", "pcall", "exampleSourceId", "cockpitDestruction",
                  "torsoDestruction", "energy_missile", "energy_melee",
                  "ballistic_shield", "dmgId", "IG.weaponProfile", "parity_test.js"):
        if token not in entity:
            err(f"{ENTITY} missing {token}")

    # ------------------------------------ exporter is original, not a ripped asset
    exp_path = ROOT / "tools/export_meshes.py"
    if exp_path.exists():
        etxt = exp_path.read_text(encoding="utf-8")
        for token in ("onlyExamplesAllowed", "noRippedAssets", "BANNED_KEYS", "--check"):
            if token not in etxt:
                err(f"tools/export_meshes.py missing {token}")
        if "ripped" in etxt.lower() and "no ripped" not in etxt.lower():
            err("tools/export_meshes.py must state it exports no ripped assets")

    # ------------------------------------------------------- no base-mod refs
    for name, text in ((REDS, reds), (YAML, yaml), (ARCHIVE, archive), (ENTITY, entity)):
        for bad in FORBIDDEN:
            if bad in text:
                err(f"{name} references a base-mod / vanilla record: {bad}")

    # ------------------------------------- cross-reference shipped JSON ids
    models = json.loads((ROOT / "models.json").read_text())
    allowed = set(models["policy"]["allowedSourceIds"])
    if len(allowed) != 30:
        err("models.json allowedSourceIds must be exactly 30")
    if "bt7274" not in entity:
        err(f"{ENTITY} must cite one of the 30 allowed example ids")
    weapons = json.loads((ROOT / "weapons.json").read_text())
    if set(weapons["categories"]) != set(CATS):
        err("weapons.json categories must match the integration template vocabulary")

    if errors:
        print(f"INTEGRATION TEMPLATES FAILED ({len(errors)} errors):", file=sys.stderr)
        for e in errors:
            print("  x " + e, file=sys.stderr)
        return 1
    print("OK: 4 complete integration templates, 8 weapon categories, "
          "destruction thresholds and 2.31 patch matrix consistent; no base-mod refs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
