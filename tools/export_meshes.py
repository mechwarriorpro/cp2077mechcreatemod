#!/usr/bin/env python3
"""MECHFALL // FORGE 77 — export the 30 example-only full models as ORIGINAL mesh files.

    python3 tools/export_meshes.py            # write assets/original_meshes/
    python3 tools/export_meshes.py --check    # verify policy + drift, write nothing
    python3 tools/export_meshes.py --out DIR  # write elsewhere

This is the honest alternative to "ripping": this sandbox has NO Cyberpunk 2077
installation, NO .archive / .mesh / .ent / .rig files, NO WolvenKit and NO network
route to an asset host. There is nothing to extract. Instead we export the real
triangulated geometry already shipped in models.json — derived exclusively from
the 30 allowed chassis.json roster examples — as valid glTF 2.0 binary (.glb)
and Wavefront (.obj) files that a human can import into WolvenKit / Blender on
their own machine to build original .mesh resources.

STATUS: ORIGINAL GEOMETRY. NOT BUILT into an .archive. NOT INSTALLED.
NOT COMPILED. NOT IN-GAME VERIFIED. The installable path stays CET-only.
No ripped, extracted, imported, third-party or base-mod assets are read or written.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "original_meshes"
GENERATOR = "MECHFALL // FORGE 77 tools/export_meshes.py"

# glTF constants
ARRAY_BUFFER = 34962
ELEMENT_ARRAY_BUFFER = 34963
FLOAT = 5126
UNSIGNED_INT = 5125
TRIANGLES = 4

SECTION_COLORS = {
    "torso": (0.13, 0.55, 0.72, 1.0),
    "cockpit": (0.98, 0.69, 0.23, 1.0),
    "limb": (0.38, 0.62, 0.48, 1.0),
    "weapon": (0.82, 0.29, 0.27, 1.0),
    "system": (0.58, 0.43, 0.78, 1.0),
}
FALLBACK_COLOR = (0.55, 0.58, 0.62, 1.0)

BANNED_KEYS = (
    "ripped", "extracted", "imported", "importedMesh", "externalMesh",
    "baseMod", "baseModPath", "assetPath", "archivePath", "sourceFile",
    "sourceAsset", "thirdParty", "extractedFrom",
)


class ExportError(Exception):
    pass


def load_library() -> dict:
    d = json.loads((ROOT / "models.json").read_text(encoding="utf-8"))
    policy = d.get("policy", {})
    if policy.get("onlyExamplesAllowed") is not True:
        raise ExportError("models.json policy.onlyExamplesAllowed must be true")
    models = d.get("models", [])
    allowed = policy.get("allowedSourceIds", [])
    if len(models) != 30 or len(allowed) != 30 or policy.get("allowedCount") != 30:
        raise ExportError("expected exactly 30 example-only models / allowed source ids")
    if len(set(allowed)) != 30:
        raise ExportError("allowedSourceIds contains duplicates")
    # The ONLY permitted source set is the chassis.json roster.
    roster = json.loads((ROOT / "chassis.json").read_text(encoding="utf-8"))
    roster_ids = {p.get("id") for p in roster.get("roster", [])}
    missing = [a for a in allowed if a not in roster_ids]
    if missing:
        raise ExportError(f"allowedSourceIds not found in chassis.json roster: {missing}")
    for m in models:
        for k in BANNED_KEYS:
            if k in m:
                raise ExportError(f"{m.get('id')}: banned asset-source key {k!r}")
        if m.get("sourceId") not in allowed:
            raise ExportError(f"{m.get('id')}: sourceId {m.get('sourceId')!r} is not an allowed example")
        if m.get("allowed") is not True:
            raise ExportError(f"{m.get('id')}: model is not allowed")
        mesh = m.get("mesh", {})
        verts, tris, parts = mesh.get("vertices"), mesh.get("triangles"), mesh.get("parts")
        if not verts or not tris or not parts:
            raise ExportError(f"{m.get('id')}: missing shipped mesh data")
        if len(verts) != mesh.get("vertexCount") or len(tris) != mesh.get("triangleCount") \
                or len(parts) != mesh.get("partCount"):
            raise ExportError(f"{m.get('id')}: shipped mesh counts disagree with arrays")
        for v in verts:
            if len(v) != 3 or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in v):
                raise ExportError(f"{m.get('id')}: non-finite or malformed vertex")
        groups: dict[int, int] = {}
        for t in tris:
            if len(t) != 4 or not all(isinstance(i, int) for i in t):
                raise ExportError(f"{m.get('id')}: malformed triangle {t!r}")
            a, b, c, pi = t
            if not (0 <= pi < len(parts)) or min(a, b, c) < 0 or max(a, b, c) >= len(verts):
                raise ExportError(f"{m.get('id')}: triangle index out of range {t!r}")
            groups[pi] = groups.get(pi, 0) + 1
        for i, part in enumerate(parts):
            if groups.get(i, 0) != part.get("triangleCount"):
                raise ExportError(f"{m.get('id')}: part {part.get('name')} triangleCount mismatch")
        if "no imported geometry" not in mesh.get("note", "").lower():
            raise ExportError(f"{m.get('id')}: mesh provenance note is missing")
    return d


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _cross(u, v):
    return (u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0])


def _dot(u, v):
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2]


def _norm(u):
    n = math.sqrt(_dot(u, u))
    return (u[0] / n, u[1] / n, u[2] / n) if n > 1e-12 else (0.0, 1.0, 0.0)


def part_triangles(m: dict) -> list[dict]:
    """Flatten each part into outward-wound, flat-shaded triangles."""
    mesh = m["mesh"]
    verts, parts = mesh["vertices"], mesh["parts"]
    groups: dict[int, list] = {i: [] for i in range(len(parts))}
    for t in mesh["triangles"]:
        groups[t[3]].append(t[:3])
    out = []
    for i, part in enumerate(parts):
        center = part["center"]
        flat = []
        for ia, ib, ic in groups[i]:
            a, b, c = verts[ia], verts[ib], verts[ic]
            n = _cross(_sub(b, a), _sub(c, a))
            centroid = ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3,
                        (a[2] + b[2] + c[2]) / 3)
            # Orient outward from the part's box centre so WolvenKit imports
            # correct face normals instead of inside-out shells.
            if _dot(n, _sub(centroid, center)) < 0:
                b, c = c, b
                n = _cross(_sub(b, a), _sub(c, a))
            nn = _norm(n)
            flat.append((a, b, c, nn))
        out.append({"part": part, "triangles": flat})
    return out


def build_glb(m: dict) -> bytes:
    """Build a valid, deterministic glTF 2.0 binary with one mesh per mech part."""
    groups = part_triangles(m)
    blob = bytearray()
    buffer_views: list[dict] = []
    accessors: list[dict] = []
    meshes: list[dict] = []
    nodes: list[dict] = []
    materials: list[dict] = []
    mat_index: dict[str, int] = {}

    def add_view(data: bytes, target: int) -> int:
        while len(blob) % 4:
            blob.append(0)
        off = len(blob)
        blob.extend(data)
        buffer_views.append({"buffer": 0, "byteOffset": off,
                             "byteLength": len(data), "target": target})
        return len(buffer_views) - 1

    for g in groups:
        part, tris = g["part"], g["triangles"]
        if not tris:
            continue
        section = part.get("section", "system")
        if section not in mat_index:
            mat_index[section] = len(materials)
            col = SECTION_COLORS.get(section, FALLBACK_COLOR)
            materials.append({"name": f"mechfall_{section}",
                              "doubleSided": True,
                              "pbrMetallicRoughness": {
                                  "baseColorFactor": list(col),
                                  "metallicFactor": 0.65, "roughnessFactor": 0.48}})
        pos, nor = [], []
        xyz = [[], [], []]
        for a, b, c, n in tris:
            for v in (a, b, c):
                pos.extend((float(v[0]), float(v[1]), float(v[2])))
                nor.extend((float(n[0]), float(n[1]), float(n[2])))
                for k in range(3):
                    xyz[k].append(float(v[k]))
        nvert = len(tris) * 3
        pv = add_view(struct.pack(f"<{len(pos)}f", *pos), ARRAY_BUFFER)
        nv = add_view(struct.pack(f"<{len(nor)}f", *nor), ARRAY_BUFFER)
        iv = add_view(struct.pack(f"<{nvert}I", *range(nvert)), ELEMENT_ARRAY_BUFFER)
        pa = len(accessors)
        accessors.append({"bufferView": pv, "componentType": FLOAT, "count": nvert,
                          "type": "VEC3", "min": [min(x) for x in xyz],
                          "max": [max(x) for x in xyz], "name": f"{part['name']}_POSITION"})
        na = len(accessors)
        accessors.append({"bufferView": nv, "componentType": FLOAT, "count": nvert,
                          "type": "VEC3", "name": f"{part['name']}_NORMAL"})
        ia = len(accessors)
        accessors.append({"bufferView": iv, "componentType": UNSIGNED_INT, "count": nvert,
                          "type": "SCALAR", "min": [0], "max": [nvert - 1],
                          "name": f"{part['name']}_INDICES"})
        meshes.append({"name": part["name"],
                       "primitives": [{"attributes": {"POSITION": pa, "NORMAL": na},
                                       "indices": ia, "material": mat_index[section],
                                       "mode": TRIANGLES}]})
        nodes.append({"name": part["name"], "mesh": len(meshes) - 1,
                      "extras": {"section": section, "dmgId": part["name"]}})

    root = len(nodes)
    nodes.append({"name": f"mechfall_{m['id']}", "children": list(range(root))})
    doc = {
        "asset": {"version": "2.0", "generator": GENERATOR,
                  "extras": {"sourceId": m["sourceId"], "exampleId": m["id"],
                             "provenance": "original geometry derived only from the 30 allowed chassis.json examples",
                             "noRippedAssets": True, "noImportedAssets": True,
                             "notCompiled": True, "notInGameVerified": True}},
        "scene": 0,
        "scenes": [{"name": "Mechfall", "nodes": [root]}],
        "nodes": nodes, "meshes": meshes, "materials": materials,
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": buffer_views, "accessors": accessors,
        "extensionsUsed": [],
    }
    json_chunk = json.dumps(doc, separators=(",", ":"), sort_keys=True,
                            ensure_ascii=True).encode("utf-8")
    while len(json_chunk) % 4:
        json_chunk += b" "
    bin_chunk = bytes(blob)
    while len(bin_chunk) % 4:
        bin_chunk += b"\x00"
    jc = struct.pack("<I4s", len(json_chunk), b"JSON") + json_chunk
    bc = struct.pack("<I4s", len(bin_chunk), b"BIN\x00") + bin_chunk
    return struct.pack("<4sII", b"glTF", 2, 12 + len(jc) + len(bc)) + jc + bc


def parse_glb(blob: bytes, m: dict) -> dict:
    """Independently verify the GLB we just produced (spec-level, not a claim of game support)."""
    if len(blob) < 20:
        raise ExportError("GLB too short")
    magic, version, length = struct.unpack_from("<4sII", blob, 0)
    if magic != b"glTF" or version != 2 or length != len(blob):
        raise ExportError("bad GLB header (magic/version/length)")
    off, chunks = 12, {}
    while off < len(blob):
        clen, ctype = struct.unpack_from("<I4s", blob, off)
        off += 8
        if off + clen > len(blob):
            raise ExportError("GLB chunk overruns file")
        chunks[ctype] = blob[off:off + clen]
        off += clen
    if b"JSON" not in chunks or b"BIN\x00" not in chunks:
        raise ExportError("GLB missing JSON or BIN chunk")
    doc = json.loads(chunks[b"JSON"].decode("utf-8").rstrip(" "))
    if doc.get("asset", {}).get("version") != "2.0":
        raise ExportError("glTF asset.version is not 2.0")
    if doc["buffers"][0]["byteLength"] > len(chunks[b"BIN\x00"]):
        raise ExportError("glTF buffer longer than BIN chunk")
    if len(doc["meshes"]) != m["mesh"]["partCount"]:
        raise ExportError("glTF mesh count != shipped partCount")
    total = sum(a["count"] for a in doc["accessors"] if a["type"] == "SCALAR")
    if total != m["mesh"]["triangleCount"] * 3:
        raise ExportError("glTF index count != shipped triangleCount * 3")
    if doc["asset"]["extras"].get("noRippedAssets") is not True:
        raise ExportError("glTF provenance extras missing noRippedAssets")
    for a in doc["accessors"]:
        if a["type"] == "VEC3" and "min" in a and len(a["min"]) == 3:
            if not all(math.isfinite(v) for v in a["min"] + a["max"]):
                raise ExportError("non-finite accessor bounds")
    return {"meshes": len(doc["meshes"]), "accessors": len(doc["accessors"]),
            "nodes": len(doc["nodes"]), "triangles": total // 3, "bytes": len(blob)}


def build_obj(m: dict) -> str:
    groups = part_triangles(m)
    L = ["# MECHFALL // FORGE 77 — ORIGINAL example-derived geometry",
         f"# example {m['id']} / source chassis.json::{m['sourceId']}",
         "# No ripped, extracted, imported or third-party assets.",
         "mtllib mechfall.mtl", f"o mechfall_{m['id']}"]
    v_lines, vn_lines, f_lines = [], [], []
    vi = ni = 1
    for g in groups:
        part = g["part"]
        name = part["name"].replace(" ", "_").replace("/", "_")
        L.append(f"g {name}")
        L.append(f"usemtl mechfall_{part.get('section', 'system')}")
        for a, b, c, n in g["triangles"]:
            for v in (a, b, c):
                v_lines.append("v %.6f %.6f %.6f" % tuple(v))
                vn_lines.append("vn %.6f %.6f %.6f" % tuple(n))
            f_lines.append("f %d//%d %d//%d %d//%d" %
                           (vi, ni, vi + 1, ni + 1, vi + 2, ni + 2))
            vi += 3
            ni += 3
    return "\n".join(L + v_lines + vn_lines + f_lines) + "\n"


def build_mtl() -> str:
    out = ["# MECHFALL // FORGE 77 — original procedural materials (no ripped textures)"]
    for section, col in SECTION_COLORS.items():
        out.append(f"newmtl mechfall_{section}")
        out.append("Kd %.4f %.4f %.4f" % col[:3])
        out.append("Ka 0.05 0.05 0.05")
        out.append("Ks 0.25 0.25 0.25\nNs 40.0\nillum 2\nd 1.0\n")
    return "\n".join(out) + "\n"


def build_readme(version: str) -> str:
    return f"""# ORIGINAL EXAMPLE MESHES — {version}

These files are **our own geometry**, exported from `models.json` by
`python3 tools/export_meshes.py`. The only model sources are the 30 allowed
`chassis.json` roster examples (`models.json → policy.onlyExamplesAllowed`).

**STATUS: ORIGINAL GEOMETRY. NOT BUILT into an `.archive`. NOT INSTALLED.
NOT COMPILED. NOT IN-GAME VERIFIED.** The installable path in this repository
remains CET-only (`cet_mod/.../mechfall_forge/init.lua`).

| File | Purpose |
|---|---|
| `mechfall_<id>.glb` | glTF 2.0 binary, one named mesh per destructible part, flat outward normals, per-section materials. Import with WolvenKit (`Import → glTF/GLB`) or Blender. |
| `mechfall_<id>.glb.import.json` | WolvenKit import-parameter **template** (documentation; not executed here). |
| `mechfall_<id>.obj` | Wavefront fallback for Blender, with `mechfall.mtl`. |
| `manifest.json` | SHA256 + part/triangle counts + provenance for all 30 exports. |
| `README.md` | This file. |

**No ripped, extracted, imported, third-party or base-mod assets.** This sandbox
has no game installation, no `.archive` files and no WolvenKit; there was nothing
to extract. Seats, mounts, rigs, animations, VO and compiled `.mesh`/`.ent`/`.rig`
resources still have to be authored on a machine with WolvenKit + Cyberpunk 2077
patch 2.31. See `docs/ORIGINAL_MESH_PIPELINE.md` and
`docs/integration/archivexl.archive.example.md`.

Regenerate: `python3 tools/export_meshes.py` · Verify: `python3 tools/export_meshes.py --check`
"""


def build_import_template(m: dict) -> str:
    return json.dumps({
        "$comment": "WolvenKit import-parameter TEMPLATE — documentation only, NOT executed here",
        "source": f"mechfall_{m['id']}.glb",
        "target": f"source/archive/base/mechfall/meshes/mechfall_{m['id']}.mesh",
        "original": True,
        "noRippedAssets": True,
        "exampleSourceId": m["sourceId"],
        "partCount": m["mesh"]["partCount"],
        "triangleCount": m["mesh"]["triangleCount"],
        "status": "NOT COMPILED / NOT IN-GAME VERIFIED",
        "notes": [
            "Import on a machine with WolvenKit + Cyberpunk 2077 patch 2.31.",
            "Keep each named submesh as its own submesh so dmgId part bindings survive.",
            "Do NOT substitute a game-extracted or third-party .mesh here.",
        ],
    }, indent=2) + "\n"


def build_manifest(d: dict, exports: list[dict]) -> str:
    return json.dumps({
        "meta": {
            "name": "MECHFALL // FORGE 77 — original example mesh exports",
            "version": d["meta"]["version"],
            "generator": GENERATOR,
            "source": "models.json (30 chassis.json roster examples only)",
            "policy": {
                "onlyExamplesAllowed": True, "noRippedAssets": True,
                "noImportedAssets": True, "noBaseModFiles": True,
            },
            "status": "NOT COMPILED / NOT INSTALLED / NOT IN-GAME VERIFIED",
        },
        "totals": {
            "models": len(exports),
            "parts": sum(e["parts"] for e in exports),
            "triangles": sum(e["triangles"] for e in exports),
            "glbBytes": sum(e["glbBytes"] for e in exports),
        },
        "models": exports,
    }, indent=2) + "\n"


def generate(version: str) -> dict[str, bytes]:
    d = load_library()
    files: dict[str, bytes] = {}
    exports = []
    for m in d["models"]:
        glb = build_glb(m)
        info = parse_glb(glb, m)
        obj = build_obj(m).encode("utf-8")
        stem = f"mechfall_{m['id']}"
        files[f"{stem}.glb"] = glb
        files[f"{stem}.obj"] = obj
        files[f"{stem}.glb.import.json"] = build_import_template(m).encode("utf-8")
        exports.append({
            "id": m["id"], "sourceId": m["sourceId"], "glb": f"{stem}.glb",
            "obj": f"{stem}.obj", "parts": info["meshes"],
            "vertices": m["mesh"]["vertexCount"], "triangles": info["triangles"],
            "glbBytes": info["bytes"], "sha256": hashlib.sha256(glb).hexdigest(),
        })
    files["mechfall.mtl"] = build_mtl().encode("utf-8")
    files["manifest.json"] = build_manifest(d, exports).encode("utf-8")
    files["README.md"] = build_readme(version).encode("utf-8")
    return files


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="verify policy and file drift, write nothing")
    ap.add_argument("--out", default=None, help="output directory override")
    args = ap.parse_args()
    try:
        d = load_library()
        files = generate(d["meta"]["version"])
    except (ExportError, OSError, ValueError, KeyError, json.JSONDecodeError) as e:
        print(f"FAILED: {e}", file=sys.stderr)
        return 1
    out = Path(args.out) if args.out else OUT_DIR
    if args.check:
        missing = [n for n in files if not (out / n).exists()]
        drift = [n for n in files if (out / n).exists() and (out / n).read_bytes() != files[n]]
        if missing or drift:
            for n in missing:
                print(f"MISSING: {out / n}", file=sys.stderr)
            for n in drift:
                print(f"DRIFT: {out / n}", file=sys.stderr)
            print(f"FAILED: {len(missing)} missing, {len(drift)} stale; run python3 tools/export_meshes.py",
                  file=sys.stderr)
            return 1
        totals = json.loads(files["manifest.json"])["totals"]
        print(f"OK: {totals['models']} original example meshes, {totals['parts']} parts, "
              f"{totals['triangles']} triangles, {totals['glbBytes']:,} GLB bytes; "
              "no ripped / imported / base-mod assets.")
        return 0
    out.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (out / name).write_bytes(data)
    for stale in sorted(p.name for p in out.iterdir() if p.is_file() and p.name not in files):
        print(f"  note: extra file left untouched: {stale}")
    totals = json.loads(files["manifest.json"])["totals"]
    print(f"Wrote {len(files)} files to {out}")
    print(f"  {totals['models']} models | {totals['parts']} parts | {totals['triangles']} triangles "
          f"| {totals['glbBytes']:,} GLB bytes | ORIGINAL GEOMETRY, NOT COMPILED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
