#!/usr/bin/env python3
"""Build an optional distributable test ZIP (browser prototype + CET-only mod).

    python3 tools/build_package.py
    python3 tools/build_package.py --out dist/my-test.zip

The ZIP is a convenience artifact, never a base-mod bundle: it contains only the self-contained
HTML, docs and the CET-only Lua folder. `dist/` and `*.zip` are gitignored.
"""

from __future__ import annotations

import argparse
import hashlib
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "test_build.html", "README.md", "LICENSE.md", "PERMISSIONS.md", "CHANGELOG.md",
    "DESIGN.md", "ROSTER.md", "NEXUS_PAGE.md", "HANDOVER.md",
    "docs/REACTOR_MODEL.md", "docs/TEARDOWN_SCHEMA.md", "docs/SUBSYSTEM_MODEL.md",
    "docs/BaseModHooks.md", "docs/AssetManifest.md",
    "docs/PROCEDURAL_PILOT.md", "docs/COMPAT.md", "docs/INGAME_PILOT.md",
    "docs/FULL_MODELS.md", "docs/WEAPON_FORGE.md", "docs/DAMAGE_MODEL.md",
    "docs/ORIGINAL_MESH_PIPELINE.md", "tools/export_meshes.py",
    "models.json", "weapons.json", "damage.json",
    "docs/integration/redscript_hook.reds.example",
    "docs/integration/tweakxl.yaml.example",
    "docs/integration/archivexl.archive.example.md",
    "docs/integration/custom_mech_entity.example.md",
    "cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua",
    "cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/README.md",
]
# The four docs/integration/*.example specs ARE packaged as documentation (they are complete and
# structurally validated by tools/validate_integration.py, but are NOT installed and NOT compiled).
# Deliberately NOT packaged: the rest of tools/, the other JSON source data, .github/,
# generated bundles, and any base-mod files. tools/export_meshes.py IS packaged so the
# original mesh exports can be regenerated from models.json outside this repo.
# models.json IS packaged: it is the delivered example-only full-model / trace library.
# assets/original_meshes/ IS packaged: 30 ORIGINAL .glb/.obj exports (NOT compiled resources).
MESH_DIR = ROOT / "assets" / "original_meshes"


def package_files() -> list[str]:
    extra = sorted(p.name for p in MESH_DIR.glob("*") if p.is_file()) if MESH_DIR.is_dir() else []
    return FILES + [f"assets/original_meshes/{n}" for n in extra]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=None, help="output zip path")
    ap.add_argument("--check", action="store_true", help="verify inputs exist, write nothing")
    args = ap.parse_args()
    files = package_files()
    missing = [f for f in files if not (ROOT / f).exists()]
    if missing:
        print("Missing inputs:", missing, file=__import__("sys").stderr)
        return 1
    if args.check:
        print(f"OK: {len(files)} package inputs present")
        return 0
    out = Path(args.out) if args.out else ROOT / "dist" / f"mechfall-forge-test-{date.today().isoformat()}.zip"
    out.parent.mkdir(parents=True, exist_ok=True)
    manifest = ["MECHFALL // FORGE 77 — TEST PACKAGE MANIFEST",
                "No base-mod files. No ripped assets. CET-only mod. Browser prototype is self-contained.", ""]
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in files:
            data = (ROOT / f).read_bytes()
            z.writestr("mechfall-forge/" + f, data)
            manifest.append(f"{hashlib.sha256(data).hexdigest()}  {len(data):>9}  {f}")
        manifest += ["", f"files: {len(files)}", f"built: {date.today().isoformat()}"]
        z.writestr("mechfall-forge/MANIFEST.sha256.txt", "\n".join(manifest) + "\n")
    print(f"Wrote {out} ({out.stat().st_size:,} bytes, {len(files) + 1} entries)")
    print("SHA256 manifest included. Install only the cet_mod/.../mechfall_forge folder into CET mods/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
