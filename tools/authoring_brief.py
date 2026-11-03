#!/usr/bin/env python3
"""Generate docs/authoring_brief.json — a job spec to hand to an ONLINE AI authoring model.

    python3 tools/authoring_brief.py            # write the brief
    python3 tools/authoring_brief.py --check    # verify drift, write nothing

This does NOT author any rig, animation, VO, seat or mount. It packages the
original example-only mesh exports, the 2.31 compatibility matrix, the four
(NOT INSTALLED) integration specs and a ready-to-paste prompt so a human can
hand the work to a browser AI model / LLM agent with WolvenKit on their own
machine. The sandbox has no game, no WolvenKit and no API keys.

STATUS: SPEC ONLY. NOT INSTALLED · NOT COMPILED · NOT IN-GAME VERIFIED.
No ripped, extracted, imported, third-party or base-mod assets.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "authoring_brief.json"
GENERATOR = "MECHFALL // FORGE 77 tools/authoring_brief.py"

TOOLCHAIN = [
    {"role": "LLM agent authoring REDengine files (.ent/.app/.rig/.anims/.xl/.yaml)",
     "name": "EDGEkit (Claude Code + REDcode + REDagent)",
     "url": "https://github.com/Edgemodders/EDGEkit",
     "notes": "Preview, Windows x64, needs the game + your own Anthropic API key. "
              "REDcode edits CR2W via WolvenKit libraries; .wem voice import not supported."},
    {"role": "Online AI auto-rigging + animation presets",
     "name": "Meshy Animate",
     "url": "https://docs.meshy.ai/en/webapp/guides/animate",
     "notes": "Upload a merged, T/A-posed GLB; export rigged FBX/GLB. 600+ humanoid clips. "
              "Check the licence for your plan (free tier reported CC BY 4.0)."},
    {"role": "CC0 animation library + text-to-motion",
     "name": "Cinevva",
     "url": "https://app.cinevva.com/guides/ai-animation-generators-3d",
     "notes": "260 CC0 retargeted clips; prompt-to-motion BVH/GLB. Library clips are CC0."},
    {"role": "Free rig + clip library (no redistribution of files)",
     "name": "Mixamo",
     "url": "https://www.mixamo.com/",
     "notes": "Commercial use in games allowed, but the exported files may not be redistributed."},
    {"role": "Online TTS for original voice-over",
     "name": "ElevenLabs",
     "url": "https://elevenlabs.io/",
     "notes": "Generate ORIGINAL speech. Do not clone a real performer. Export WAV."},
    {"role": "Online audio+text -> game-format lipsync .anims",
     "name": "lipsync.tools",
     "url": "https://lipsync.tools/",
     "notes": "Free demo: up to 20 lines, 60 s each, English only. Not generative AI; "
              "mouth shapes are averages from CDPR animations. Source tool is MIT."},
    {"role": "REDengine file authoring / conversion (local, required)",
     "name": "WolvenKit 9.1.0 + Cyberpunk Blender IO Suite 2.0.0 (Blender 5.0)",
     "url": "https://github.com/WolvenKit/WolvenKit/releases",
     "notes": "Converts GLB/FBX into .mesh/.rig/.anims, packs .archive + .archive.xl."},
    {"role": "Simple WAV voice-over shipping path",
     "name": "REDmod customSounds",
     "url": "https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/modding-tools/redmod/audio-modding",
     "notes": "WAV + info.json customSounds entries. WolvenKit cannot import WAV->WEM directly."},
    {"role": "2.31 .anims -> ArchiveXL pose pack automation",
     "name": "Easy Photomode Poses v2.3",
     "url": "https://www.nexusmods.com/cyberpunk2077/mods/18719",
     "notes": "States native support for Cyberpunk 2.31; requires .NET 8 + WolvenKit Console."},
]

REQUIRED_OUTPUTS = [
    {"type": "rig", "format": ".rig", "authoring": "WolvenKit BoneTransforms / retarget onto the game skeleton",
     "status": "NOT AUTHORED", "note": "Generic AI rigs are not REDengine .rig files; X/Y axes are flipped vs Blender."},
    {"type": "animations", "format": ".anims (+ .workspot)", "authoring": "Meshy/Mixamo/Cinevva -> Blender -> WolvenKit Import Tool (Target File Format = Anims)",
     "status": "NOT AUTHORED", "note": "Clip names must match the .anim entries; ArchiveXL .xl + TweakXL .yaml register them."},
    {"type": "voiceOver", "format": ".wav (REDmod customSounds) or .wem (Wwise)",
     "authoring": "ElevenLabs / other TTS -> WAV -> REDmod info.json, or Wwise 2019.2.15 -> WolvenKit",
     "status": "NOT AUTHORED", "note": "Optional lipsync .anims from lipsync.tools. No cloned voices, no game-extracted audio."},
    {"type": "seatsAndMounts", "format": ".ent components + .workspot",
     "authoring": "LLM agent (EDGEkit/REDcode) editing CR2W, or manual WolvenKit",
     "status": "NOT AUTHORED", "note": "vehicle_slots / entSlot / gameAttachmentSlots / workWorkspotResourceComponent. "
              "These are component data, NOT generated assets."},
    {"type": "entityAndAppearance", "format": ".ent / .app",
     "authoring": "WolvenKit + docs/integration/custom_mech_entity.example.md",
     "status": "NOT AUTHORED", "note": "Bind each named GLB submesh to its dmgId destructible part."},
    {"type": "archive", "format": ".archive + .archive.xl",
     "authoring": "WolvenKit pack + ArchiveXL registration",
     "status": "NOT BUILT", "note": "Then install and verify in game on patch 2.31."},
]

PROMPT = """You are authoring the REDengine-side resources for MECHFALL // FORGE 77,
a Cyberpunk 2077 patch 2.31 mod. Work ONLY from the 30 ORIGINAL example-only
meshes in assets/original_meshes/ (see docs/authoring_brief.json for paths and
SHA256). Do not import, extract, rip or redistribute any CDPR, base-mod or
third-party asset. The only allowed model sources are the 30 chassis.json roster
examples listed in models.json -> policy.allowedSourceIds.

Deliver, for one example at a time (start with bt7274):
1. A WolvenKit 9.1 project following docs/integration/archivexl.archive.example.md.
2. An original .rig and .anims set retargeted from a rigged GLB/FBX produced by
   an online auto-rigger (Meshy/Mixamo/Cinevva). Merge our 31 part-soup submeshes
   into one T/A-posed character mesh first; keep the submesh names as dmgId keys.
3. An original .ent / .app with seat + mount components (vehicle_slots,
   gameAttachmentSlots, workWorkspotResourceComponent) and the spawn record from
   docs/integration/custom_mech_entity.example.md.
4. TweakXL records from docs/integration/tweakxl.yaml.example (8 original
   weapon/shield records) and redscript runtime hooks from
   docs/integration/redscript_hook.reds.example (cockpit > 0.70 OR torso > 0.90
   destruction, emergency eject, repairs, shields).
5. Optional original VO: WAV + REDmod info.json; optional lipsync .anims from
   lipsync.tools. No cloned voices.
6. A packed .archive + .archive.xl, plus a short report of every file you created
   and the licence of every third-party clip or model you used.

Say explicitly which outputs are NOT COMPILED and NOT IN-GAME VERIFIED. The
human owner will do in-game verification on patch 2.31 (CET 1.37.1 +
RED4ext 1.29/1.30). Do not claim a CET-only Lua mod can conjure these resources.
"""


def build() -> dict:
    compat = json.loads((ROOT / "compat.json").read_text(encoding="utf-8"))
    models = json.loads((ROOT / "models.json").read_text(encoding="utf-8"))
    manifest = json.loads((ROOT / "assets/original_meshes/manifest.json").read_text(encoding="utf-8"))
    assert models["policy"]["onlyExamplesAllowed"] is True
    assert len(models["models"]) == 30
    by_id = {m["id"]: m for m in manifest["models"]}
    inputs = []
    for m in models["models"]:
        rec = by_id[m["id"]]
        parts = [p["name"] for p in m["mesh"]["parts"]]
        sections: dict[str, int] = {}
        for p in m["mesh"]["parts"]:
            sections[p["section"]] = sections.get(p["section"], 0) + 1
        inputs.append({
            "id": m["id"], "sourceId": m["sourceId"],
            "glb": "assets/original_meshes/" + rec["glb"],
            "obj": "assets/original_meshes/" + rec["obj"],
            "sha256": rec["sha256"], "parts": rec["parts"],
            "triangles": rec["triangles"], "sections": sections,
            "dmgIds": parts,
            "provenance": "ORIGINAL example-derived geometry; no imported assets",
        })
    return {
        "meta": {
            "name": "MECHFALL // FORGE 77 — online authoring handoff brief",
            "version": compat["meta"]["version"],
            "generator": GENERATOR,
            "status": "SPEC ONLY / NOT INSTALLED / NOT COMPILED / NOT BUILT INTO AN ARCHIVE / NOT IN-GAME VERIFIED",
            "note": "No online service was called from this sandbox. This is a job spec for a human to hand to a browser AI model or an LLM agent with WolvenKit.",
        },
        "target": {
            "game": "Cyberpunk 2077", "patch": "2.31", "cet": "1.37.1",
            "red4ext": ["1.29", "1.30"],
            "frameworks": {"ArchiveXL": "1.26", "TweakXL": "1.11.1", "Codeware": "1.18"},
            "note": "Some newer authoring tools track patch 2.5; in-game verification on 2.31 is the human owner's step.",
        },
        "constraints": {
            "onlyExamplesAllowed": True,
            "allowedSourceCount": 30,
            "noRippedAssets": True, "noExtractedAssets": True,
            "noImportedAssets": True, "noBaseModFiles": True,
            "noClonedVoices": True,
            "installablePathStaysCetOnly": True,
            "repoVisibility": "public (private: false) — third-party licences matter",
        },
        "inputs": inputs,
        "requiredOutputs": REQUIRED_OUTPUTS,
        "toolchain": TOOLCHAIN,
        "integrationSpecs": [
            "docs/integration/archivexl.archive.example.md",
            "docs/integration/custom_mech_entity.example.md",
            "docs/integration/redscript_hook.reds.example",
            "docs/integration/tweakxl.yaml.example",
        ],
        "referenceDocs": ["docs/ONLINE_AUTHORING.md", "docs/ORIGINAL_MESH_PIPELINE.md"],
        "prompt": PROMPT,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="verify drift, write nothing")
    args = ap.parse_args()
    try:
        data = json.dumps(build(), indent=2, sort_keys=False) + "\n"
    except (OSError, KeyError, AssertionError, json.JSONDecodeError) as e:
        print(f"FAILED: {e}", file=sys.stderr)
        return 1
    if args.check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != data:
            print(f"FAILED: {OUT} missing or stale; run python3 tools/authoring_brief.py", file=sys.stderr)
            return 1
        doc = json.loads(data)
        print(f"OK: authoring brief for {len(doc['inputs'])} original example meshes, "
              f"{len(doc['requiredOutputs'])} required outputs, {len(doc['toolchain'])} tools, "
              "no ripped assets / no compiled resources.")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(data, encoding="utf-8")
    doc = json.loads(data)
    print(f"Wrote {OUT} — {len(doc['inputs'])} inputs, {len(doc['requiredOutputs'])} outputs, "
          f"{len(doc['toolchain'])} tools, {len(data):,} bytes (SPEC ONLY)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
