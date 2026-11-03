#!/usr/bin/env python3
"""MECHFALL // FORGE 77 — data integrity, generated-output drift and packaging checks.

Run:  python3 tools/validate.py           (warnings are reported but do not fail)
      python3 tools/validate.py --strict  (warnings also fail)
Used by .github/workflows/validate.yml.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILES = ("simulation.json", "reactors.json", "subsystems.json", "chassis.json",
              "components.json", "teardowns.json", "compat.json")
SIX = ("powerDraw", "mass", "heatGen", "heatDiss", "rcs", "ecm")
SHAPE_KEYS = ("torsoW", "torsoH", "torsoD", "headScale", "shoulderW", "shoulderH", "upperArm",
              "foreArm", "upperLeg", "lowerLeg", "hipW", "footL", "weaponX", "weaponY",
              "legStance", "armorFlare", "jetCount", "thrusterSize", "jumpJetCount", "style")
ANCHORS = {"torso", "head", "sensor", "backpack", "reactor", "bus", "capacitor", "coolant",
           "shoulderL", "shoulderR", "upperArmL", "upperArmR", "foreArmL", "foreArmR",
           "weaponL", "weaponR", "hip", "upperLegL", "upperLegR", "lowerLegL", "lowerLegR",
           "footL", "footR", "jetL", "jetR", "flareL", "flareR", "extraLegL", "extraLegR",
           "crest", "shield", "thrusterL", "thrusterR", "jumpJet", "radiatorL", "radiatorR",
           "sigHead", "sigShoulderL", "sigShoulderR", "sigBackL", "sigBackR",
           "sigArmL", "sigArmR", "sigLegL", "sigLegR", "sigExtra",
           "sigExtra2", "sigExtra3",
           "ventL", "ventR", "jointL", "jointR", "kneeL", "kneeR"}
TABS = ("HANGAR", "TEARDOWN", "REACTOR LAB", "INTERNAL SYSTEMS", "MECH FORGE", "COMBAT TEST",
        "PILOT TEST", "DOSSIER", "SETTINGS")

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def load(name: str):
    p = ROOT / name
    if not p.exists():
        err(f"missing data file {name}")
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        err(f"{name} is not valid JSON: {e}")
        return {}


def check_num(obj, keys, where):
    for k in keys:
        v = obj.get(k)
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            err(f"{where}: {k} must be numeric, got {v!r}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="treat warnings as failures")
    args = ap.parse_args()
    d = {n[:-5]: load(n) for n in DATA_FILES}

    # ---------------------------------------------------------------- simulation
    sim = d["simulation"]
    for key in ("sixAttributes", "coefficients", "validationThresholds", "validationStates", "equations", "tradeoffs"):
        if key not in sim:
            err(f"simulation.json missing {key}")
    if [a["key"] for a in sim.get("sixAttributes", [])] != list(SIX):
        err("simulation.json sixAttributes must be exactly the six first-class attributes")
    if len(sim.get("validationStates", [])) < 12:
        err("simulation.json must define at least the 12 core validation states")
    for k, c in sim.get("coefficients", {}).items():
        check_num(c, ("min", "max", "step", "value"), f"simulation.coefficients.{k}")
        if c.get("min") >= c.get("max"):
            err(f"coefficient {k}: min >= max")
    for k in ("rcsShapeExponent", "rcsMaterialExponent", "detectionExponent", "ecmFalloffExponent", "k1", "k2"):
        if k not in sim.get("coefficients", {}):
            err(f"simulation.json missing exposed coefficient {k}")

    # ---------------------------------------------------------------- reactors
    rx = d["reactors"]
    presets = rx.get("presets", [])
    if len(presets) != 6:
        err(f"reactors.json must have 6 teardown presets, got {len(presets)}")
    pids = {p["id"] for p in presets}
    if len(pids) != len(presets):
        err("duplicate reactor preset ids")
    params = {p["key"] for p in rx.get("parameters", [])}
    for p in presets:
        if set(p.get("params", {})) != params:
            err(f"reactor preset {p['id']} has wrong parameter set")
    if len(rx.get("biomes", {})) != 6:
        err("reactors.json must define 6 biome multipliers")
    m = rx.get("model", {})
    for k in ("sizeExponent", "instabilitySizeExponent", "instabilityFlowExponent", "outputScale",
              "derateFactor", "gradeBonus", "S_ref", "F_ref", "heatLoadFactor"):
        if not isinstance(m.get(k), (int, float)):
            err(f"reactors.model.{k} must be a configurable number")
    if m.get("sizeExponent") and m.get("instabilitySizeExponent"):
        p = 2 ** m["sizeExponent"]
        i = 2 ** m["instabilitySizeExponent"]
        if not (1.6 < p < 2.0 and 2.5 < i < 3.5):
            warn(f"nominal doubling rule off: 2^sizeExponent={p:.2f}, 2^instability={i:.2f}")

    # ---------------------------------------------------------------- subsystems
    ss = d["subsystems"]
    cats = ss.get("categories", {})
    if "freeform" not in cats:
        err("subsystems.json must include a freeform/blank-slate category")
    for cid, cat in cats.items():
        if not cat.get("params"):
            err(f"category {cid} has no editable params")
        for p in cat.get("params", []):
            check_num(p, ("min", "max", "step", "default"), f"category {cid}.{p.get('key')}")
            if p.get("min") >= p.get("max"):
                err(f"category {cid}.{p.get('key')}: min >= max")
    templates = ss.get("templates", [])
    tids = {t["id"] for t in templates}
    if len(tids) != len(templates):
        err("duplicate subsystem template ids")
    for t in templates:
        if t.get("category") not in cats:
            err(f"template {t['id']} has unknown category {t.get('category')}")
        else:
            allowed = {p["key"] for p in cats[t["category"]]["params"]}
            extra = set(t.get("params", {})) - allowed
            if extra:
                err(f"template {t['id']} has params not in its schema: {sorted(extra)}")
    if not any(t.get("category") == "mana_reactor" for t in templates):
        err("a mana reactor subsystem template is required")
    if len(ss.get("dependencyGraph", {}).get("nodes", [])) < 8:
        err("dependency graph must cover all subsystem families")

    # ---------------------------------------------------------------- chassis
    ch = d["chassis"]
    roster = ch.get("roster", [])
    if len(roster) != 30:
        err(f"chassis.json must contain 30 prefabs, got {len(roster)}")
    if len(ch.get("factions", {})) != 6:
        err("chassis.json must define 6 factions")
    ids = [c["id"] for c in roster]
    names = [c["name"] for c in roster]
    if len(set(ids)) != len(ids) or len(set(names)) != len(names):
        err("duplicate chassis id or canonical name")
    if tuple(ch.get("shapeKeys", ())) != SHAPE_KEYS:
        err("chassis.shapeKeys must be the 20 canonical shape parameters")
    for c in roster:
        where = f"chassis {c['id']}"
        if not set(SHAPE_KEYS).issubset(c.get("shape", {})):
            err(f"{where}: shape must have all 20 parameters")
        if c.get("shape", {}).get("style") not in ch.get("styles", []):
            err(f"{where}: unknown style")
        if c.get("reactorId") not in pids:
            err(f"{where}: unknown reactorId {c.get('reactorId')}")
        for sid in c.get("subsystems", []):
            if sid not in tids:
                err(f"{where}: unknown subsystem id {sid}")
        if not isinstance(c.get("aliases"), list) or not c["aliases"]:
            err(f"{where}: aliases must be recorded")
        if c.get("internalsProfile") not in ("biped", "reversejoint", "knight", "spider", "tetrapod", "corpo"):
            err(f"{where}: unknown internalsProfile")
    for a, preset in ch.get("presets", {}).items():
        if not set(SHAPE_KEYS).issubset(preset):
            err(f"shape preset {a} must have all 20 parameters")

    # signature part library: each prefab must have a distinct composition
    spl = ch.get("signatureParts", {})
    for slot in ("frame", "head", "shoulders", "back", "arms", "legs", "extras"):
        if not spl.get(slot):
            err(f"chassis.signatureParts missing slot {slot}")
    sigmap = {}
    for c0 in roster:
        g = c0["shape"].get("sig") or {}
        for slot in ("frame", "head", "shoulders", "back", "arms", "legs"):
            ids = {x["id"] for x in spl.get(slot, [])}
            if g.get(slot) not in ids:
                err(f"chassis {c0['id']}: unknown signature {slot} {g.get(slot)!r}")
        for x in g.get("extras", []):
            if x not in {e["id"] for e in spl.get("extras", [])}:
                err(f"chassis {c0['id']}: unknown signature extra {x!r}")
        sigmap[c0["id"]] = json.dumps(g, sort_keys=True)
    if len(set(sigmap.values())) < 28:
        err("signature part compositions must make at least 28 of the 30 prefabs visually distinct")
    for c0 in roster:
        if len((c0["shape"].get("sig") or {}).get("extras", [])) > 3:
            err(f"chassis {c0['id']}: at most 3 signature accents")
    frames_used = {(c0["shape"].get("sig") or {}).get("frame") for c0 in roster}
    if len(frames_used) < 6:
        err(f"roster must use at least 6 distinct body/frame plans, got {len(frames_used)}")
    for required in ("spider", "tetrapod", "hover", "tank", "flyer"):
        if required not in frames_used:
            err(f"roster missing body plan: {required}")
    if not ({"vanguard", "wedge", "slim", "knight", "atlas", "hunchback"} & frames_used):
        err("roster missing a biped / knight body plan")
    if not ch.get("signatureNote"):
        err("chassis.signatureNote must state the original procedural / no-import policy")
    for a, preset in ch.get("presets", {}).items():
        g = preset.get("sig")
        if not g:
            err(f"shape preset {a} missing signature composition")
            continue
        for slot in ("frame", "head", "shoulders", "back", "arms", "legs"):
            ids = {x["id"] for x in spl.get(slot, [])}
            if g.get(slot) not in ids:
                err(f"shape preset {a}: unknown signature {slot} {g.get(slot)!r}")

    # ---------------------------------------------------------------- compat / procedural pilot
    cp = d["compat"]
    for key in ("meta", "autodrive", "crystalCoat", "coatings", "pilot", "ingamePilot", "disclaimer"):
        if key not in cp:
            err(f"compat.json missing {key}")
    ad, cc = cp.get("autodrive", {}), cp.get("crystalCoat", {})
    if not ad.get("modNames") or not ad.get("handoffMethods") or ad.get("probe") != "GetMod":
        err("compat.autodrive must list mod names, hand-off methods and use GetMod")
    if not cc.get("modNames") or not cc.get("syncMethods") or "CCP1" not in cc.get("codeFormat", ""):
        err("compat.crystalCoat must list mod names, sync methods and a CCP1 code format")
    if not all(x in cc.get("fields", {}) for x in ("primary", "secondary", "lightHue", "aspect", "metallic")):
        err("compat.crystalCoat.fields must expose primary/secondary/lightHue/aspect/metallic")
    if len(cp.get("coatings", [])) < 5:
        err("compat.coatings must define at least 5 procedural coat presets")
    for c0 in cp.get("coatings", []):
        for k in ("primary", "secondary"):
            if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(c0.get(k, ""))):
                err(f"coating {c0.get('id')}: {k} must be a 6-digit hex colour")
    pl = cp.get("pilot", {})
    for k in ("terrain", "physics", "camera", "waves", "controls"):
        if k not in pl:
            err(f"compat.pilot missing {k}")
    if not cp.get("disclaimer") or "private base-mod APIs" not in cp["disclaimer"]:
        err("compat.disclaimer must state the in-game piloting limitation")

    # ---------------------------------------------------------------- in-game CET pilot
    ig = cp.get("ingamePilot", {})
    for key in ("note", "since", "requirements", "sources", "coreRecords", "partRecords",
                "entityTemplates", "controls", "physics", "cameraModes", "disclaimer"):
        if key not in ig:
            err(f"compat.ingamePilot missing {key}")
    if len(ig.get("coreRecords", [])) < 3:
        err("compat.ingamePilot.coreRecords must list at least 3 vanilla in-game mech records")
    if not any("q003_militech_mech" in x.get("id", "") for x in ig.get("coreRecords", [])):
        err("compat.ingamePilot must reference the vanilla Militech Minotaur record")
    if len(ig.get("partRecords", [])) < 5:
        err("compat.ingamePilot.partRecords must populate the signature-part anchors")
    slots = {x.get("slot") for x in ig.get("partRecords", [])}
    if not {"sigHead", "sigArmL", "sigArmR"}.issubset(slots):
        err("compat.ingamePilot.partRecords must map to signature-part anchors")
    actions = {x.get("action") for x in ig.get("controls", [])}
    for a in ("deploy", "reset", "forward", "back", "left", "right", "jump", "vent", "fire", "autodrive"):
        if a not in actions:
            err(f"compat.ingamePilot.controls missing action {a}")
    slugs = [x.get("slug") for x in ig.get("controls", [])]
    if len(slugs) != len(set(slugs)):
        err("compat.ingamePilot.controls has duplicate CET binding slugs")
    for k in ("spawnDistance", "updateHz", "maxParts", "walkSpeed", "turnRate", "jumpImpulse",
              "gravity", "cockpitHeight", "chaseDistance", "threatInterval", "maxHostiles"):
        if not isinstance(ig.get("physics", {}).get(k), (int, float)):
            err(f"compat.ingamePilot.physics.{k} must be numeric")
    if "no meshes" not in ig.get("disclaimer", "").lower() and "does not add" not in ig.get("disclaimer", "").lower():
        err("compat.ingamePilot.disclaimer must state that no custom mesh/rig is shipped")
    if not (ROOT / "tools/lua_ingame.part").exists():
        err("tools/lua_ingame.part (CET in-game pilot module) missing")

    # ---------------------------------------------------------------- components
    comp = d["components"]
    for part in comp.get("parts", []):
        check_num(part, SIX, f"component {part.get('id')}")
        if part.get("type") not in comp.get("types", []):
            err(f"component {part.get('id')} has unknown type")

    # ---------------------------------------------------------------- teardowns
    td = d["teardowns"]
    catalog = td.get("internalsCatalog", {})
    if len(catalog) < 18:
        err("teardowns.json needs at least 18 internals assemblies")
    for key in ("thruster", "jump_jet", "radiator_bank", "capacitor_bank", "coolant_loop",
                "power_bus", "arm_actuator", "sensor_suite", "vent_panel"):
        if key not in catalog:
            err(f"teardowns.internalsCatalog missing mech part assembly {key}")
    for key, asm in catalog.items():
        for i, internal in enumerate(asm.get("internals", [])):
            check_num(internal, SIX, f"internalsCatalog.{key}[{i}] {internal.get('name')}")
            if not isinstance(internal.get("qty"), int) or internal["qty"] < 1:
                err(f"internalsCatalog.{key}[{i}] qty must be a positive integer")
    for arch, parts in td.get("partSets", {}).items():
        if arch not in ("biped", "reversejoint", "knight", "spider", "tetrapod", "corpo"):
            err(f"unknown teardown archetype {arch}")
        for p in parts:
            if p.get("anchor") not in ANCHORS:
                err(f"teardown {arch}: unknown anchor {p.get('anchor')}")
            if p.get("internalsKey") not in catalog:
                err(f"teardown {arch}: unknown internalsKey {p.get('internalsKey')}")
    for act in ("TEAR DOWN", "SCAN INTERNALS", "EXTRACT TO INVENTORY", "USE AS TEMPLATE", "COMPARE", "REASSEMBLE"):
        if act not in td.get("actions", []):
            err(f"teardowns.json missing action {act}")
    # Sleek mech wireframe + internals fit + power/heat transfer balancing.
    if td.get("defaultViewMode") != "wireframe":
        err("teardowns.defaultViewMode must be 'wireframe'")
    view = td.get("view", {})
    modes = {m.get("id") for m in view.get("modes", [])}
    if not {"wireframe", "internals", "flows"}.issubset(modes):
        err("teardowns.view.modes must include wireframe, internals and flows")
    geo = view.get("geometry", {})
    if len(geo.get("primitives", [])) < 6:
        err("teardowns.view.geometry.primitives must list the sleek hull primitives")
    fitcfg = view.get("fit", {})
    for k in ("buses", "loops", "busCapacityPct", "coolantFlowPct",
              "transferLossPerUnit", "hotSpotTolerance"):
        if k not in fitcfg:
            err(f"teardowns.view.fit missing {k}")
    if "balance" not in view.get("note", "").lower():
        warn("teardowns.view.note should state that balance is the only design limit")
    new_states = {v["code"] for v in d["simulation"].get("validationStates", [])}
    for code in ("BUS OVERDRAW", "COOLANT SATURATION", "HOT SPOT", "TRANSFER LOSS"):
        if code not in new_states:
            err(f"simulation.validationStates missing fit flag {code}")
    ckeys = {x["id"] for x in d["components"]["parts"]}
    for x in ("thruster_vector", "jumpjet_burst", "radiator_fins", "capacitor_stack", "sensor_lidar"):
        if x not in ckeys:
            err(f"components.json missing mech part {x}")

    # ---------------------------------------------------------------- generated outputs
    gen = subprocess.run([sys.executable, str(ROOT / "tools/generate.py"), "--check"],
                         cwd=str(ROOT), capture_output=True, text=True)
    if gen.returncode != 0:
        err("generated outputs are stale:\n" + gen.stdout.strip() + "\n" + gen.stderr.strip())

    html = ROOT / "test_build.html"
    if not html.exists():
        err("test_build.html missing")
    else:
        text = html.read_text(encoding="utf-8")
        for bad in ("<script src=", "<link ", "<img ", "<iframe ", "@import", "url(http", "fetch(", "XMLHttpRequest"):
            if bad in text:
                err(f"test_build.html is not self-contained: found {bad!r}")
        for marker in ("__MF_CSS__", "__MF_BODY__", "__MF_DATA__", "__MF_JS__", "__MF_GENERATED_DATA__"):
            if marker in text:
                err(f"test_build.html contains unreplaced marker {marker}")
        for tab in TABS:
            if tab not in text:
                err(f"test_build.html missing tab {tab}")
        for token in ("<canvas", "<style>", "application/json", "powerDraw", "heatDiss", "rcsPolar", "jamStrength"):
            if token not in text:
                err(f"test_build.html missing expected content {token!r}")
        for token in ("MF.draw.mech", "SLEEK MECH WIREFRAME", "FIT & TRANSFER BALANCE",
                      "AUTO ROUTE", "APPLY FIT", "JUMP JET POD", "thrusterSize", "jumpJetCount",
                      "BUS OVERDRAW", "COOLANT SATURATION", "SIGNATURE PARTS", "MF.sigGeometry",
                      "Vanguard cockpit pod", "Atlas cranial skull", "Tracked siege hull",
                      "Legless flight frame", "SIGNATURE PART COMPOSITION",
                      "PROCEDURAL 3D PILOT", "MF.mesh3d.fromShape", "MF.mesh3d.render",
                      "MF.compat.autodrive", "MF.compat.encodeCoat", "AUTODRIVE (T)",
                      "CRYSTAL COAT (PROCEDURAL)", "CCP1", "NEW TERRAIN SEED",
                      "IN-GAME PILOT (CET)", "MF.ingame.luaSnippet", "MF.ingame.checklistHTML",
                      "exEntitySpawner.SpawnRecord", "Character.q003_militech_mech",
                      "GENERATE IN-GAME CET LUA", "DEPLOY CHECKLIST", "EMERGENCY UNDEPLOY"):
            if token not in text:
                err(f"test_build.html missing expected content {token!r}")
        if "MF.draw.matrix" in text or "NO FRANCHISE GEOMETRY" in text:
            err("test_build.html still contains the obsolete abstract-matrix restriction")
        if text.count("<script") < 2:
            err("test_build.html must contain the data script and the app script")
        print(f"  test_build.html: {len(text):,} bytes, self-contained")

    lua = ROOT / "cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua"
    if not lua.exists():
        err("generated CET init.lua missing")
    else:
        code = lua.read_text(encoding="utf-8")
        if "__MF_GENERATED_DATA__" in code:
            err("CET init.lua has unreplaced generated data marker")
        if "registerForEvent" not in code or "pcall" not in code:
            err("CET init.lua must register events and pcall-wrap optional hooks")
        for token in ("MF.compatProbe", "MF.compatHandoffWaypoint", "MF.compatSyncCrystalCoat",
                      "MF.compatParseCoat", "MF.compatEncodeCoat", "COMPAT", "GetMod"):
            if token not in code:
                err(f"CET init.lua missing optional compat bridge {token!r}")
        for token in ("IN-GAME PILOT", "function IG.deploy", "function IG.undeploy", "function IG.update",
                      "registerInput", "onUpdate", "SpawnRecord", "exEntitySpawner.Despawn",
                      "Game.FindEntityByID", "SetWorldTransform", "SetOrientationEuler",
                      "Game.GetTeleportationFacility", "WorldTransform.new", "Character.q003_militech_mech"):
            if token not in code:
                err(f"CET init.lua missing in-game pilot API {token!r}")
        if "Game.AddToInventory" in code and "pcall(function()" not in code:
            err("optional base-mod hooks must be pcall-wrapped")
        if code.count("pcall") < 20:
            err("in-game pilot game calls must be pcall-wrapped")

    # Installable path must be CET-only.
    mod_dir = ROOT / "cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge"
    forbidden = [p for p in mod_dir.rglob("*") if p.is_file() and p.suffix in (".reds", ".yaml", ".yml", ".archive", ".xl")]
    if forbidden:
        err(f"non-CET files in installable path: {[str(p.relative_to(ROOT)) for p in forbidden]}")
    installed = sorted(p.name for p in mod_dir.iterdir() if p.is_file())
    if installed != ["README.md", "init.lua"]:
        warn(f"unexpected files in CET mod folder: {installed}")

    for f in ("README.md", "LICENSE.md", "DESIGN.md", "PERMISSIONS.md", "CHANGELOG.md", "HANDOVER.md",
              "ROSTER.md", "NEXUS_PAGE.md", "push_to_github.sh", ".gitignore",
              ".github/workflows/validate.yml", "tools/build_package.py", "test_build.template.html"):
        if not (ROOT / f).exists():
            err(f"missing deliverable {f}")
    for f in ("docs/REACTOR_MODEL.md", "docs/TEARDOWN_SCHEMA.md", "docs/SUBSYSTEM_MODEL.md",
              "docs/BaseModHooks.md", "docs/AssetManifest.md",
              "docs/PROCEDURAL_PILOT.md", "docs/COMPAT.md", "docs/INGAME_PILOT.md"):
        if not (ROOT / f).exists():
            err(f"missing doc {f}")
    examples = list((ROOT / "docs/integration").glob("*.example*"))
    if len(examples) < 3:
        err("expected 3 .example integration templates")

    # ---------------------------------------------------------------- report
    print(f"\nChecked: {len(roster)} prefabs, {len(templates)} subsystem templates, "
          f"{len(presets)} reactor presets, {len(catalog)} internals assemblies, "
          f"{len(comp.get('parts', []))} assembly components.")
    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for w in warnings:
            print("  ! " + w)
    if errors:
        print(f"\nFAILED ({len(errors)} errors):", file=sys.stderr)
        for e in errors:
            print("  x " + e, file=sys.stderr)
        return 1
    if args.strict and warnings:
        print("\nFAILED (--strict: warnings present)", file=sys.stderr)
        return 1
    print("\nOK: all validation checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
