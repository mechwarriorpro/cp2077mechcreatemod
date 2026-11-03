# ONLINE AUTHORING OPTIONS — rigs, animations, VO, seats, mounts

> **Answer to:** *"find me an online model that can do the authoring, I can do the
> in-game verification later."*
>
> Researched 2026-11-03. **No single online model authors all five REDengine-specific
> resources.** The honest split is: browser AI models author **generic rig +
> animations**, an online TTS model authors **VO audio**, an online service authors
> **lipsync `.anims`**, and an **LLM agent with WolvenKit-backed file editing**
> authors the REDengine-side `.rig` / `.ent` / `.app` / `.anims` / `.xl` / `.yaml`
> data — which is where **seats and mounts** actually live.
>
> Nothing below was run here: this sandbox has no game, no WolvenKit, no API keys
> and no network route to these hosts. All outputs are **NOT INSTALLED ·
> NOT COMPILED · NOT IN-GAME VERIFIED** until you run them on patch **2.31**
> (CET **1.37.1** + RED4ext **1.29 / 1.30**).

## 1. The one closest to "an online model that does the authoring"

### EDGEkit / REDcode — Claude Code + WolvenKit engine

- <https://github.com/Edgemodders/EDGEkit> · <https://github.com/Edgemodders/REDcode>
- <https://www.nexusmods.com/cyberpunk2077/mods/35421> (REDcode) ·
  <https://www.nexusmods.com/cyberpunk2077/mods/35192> (EDGEkit)

EDGEkit is a Code-OSS/VS Code build with **Claude Code installed on first start**,
plus REDcode (WolvenKit's libraries via REDbridge: browse game archives, edit
CR2W files in a tree/property grid, pack, install, run), EDGEwave (sound/voice),
EDGEdeck (mod manager) and REDagent (in-game AI assistant, separate download).
The Nexus listing describes "a Claude Code modding assistant that can make your
mod for you". REDcode can edit `.ent`, `.app`, `.rig`, `.anims`, `.xl`, `.yaml`,
write TweakXL records and pack the `.archive`. **This is the closest thing to one
online AI model authoring the REDengine half**, including seat/mount components.

**Caveats:** preview status (EDGEkit 1.140.1, first release 2026-10-22),
Windows x64, needs the game installed, needs **your own Anthropic API key**,
installer unsigned (SmartScreen warning). REDcode explicitly notes *"voice lines
(.wem) cannot be imported yet"* — use the audio routes in §3 instead. It does not
replace WolvenKit; it writes WolvenKit `.cpmodproj` projects.

### Runner-up: an AI agent skill for Cyberpunk animations

A GitHub PR describes `.agents/cyberpunk-2077-animations-agent-skill`: a Claude
agent skill whose `anim.py` ingests FBX/GLB/BVH, retargets in Blender onto the
game skeleton, grafts clips into an emptied vanilla `.anims` container, and emits
Photo Mode / workspot / ArchiveXL packages, with an offline round-trip proof
(`0.0°` error). **The repo currently returns 404 from the GitHub API**
(<https://github.com/frederico-kluser/cyberpunk-2077-mods/pull/101>), and the PR
itself says "no context has run in game yet". Treat it as a design reference,
**not** a downloadable tool.

## 2. Rigs + animations (browser AI models)

| Tool | What it authors | Input → Output | Licence / cost | Source |
|---|---|---|---|---|
| **Meshy Animate** (recommended) | full skeleton, AI skin weights, 600+ preset clips, Text-to-Motion | upload our `.glb`/`.obj` → rigged/animated **FBX / GLB / USDZ** | 100 free credits/mo; free tier reported CC BY 4.0, paid = yours | <https://www.meshy.ai/features/ai-auto-rigging> · <https://docs.meshy.ai/en/webapp/guides/animate> |
| Mixamo | auto-rig + huge clip library | model → FBX | free, commercial OK, **no redistribution of the files** | <https://www.mixamo.com/> |
| Cinevva Animation Library / Prompt Animations | 260 CC0 clips retargeted in-browser; text→motion BVH/GLB | rigged GLB → GLB/BVH | library clips CC0; prompt output yours | <https://app.cinevva.com/guides/ai-animation-generators-3d> |
| Anything World / 3D AI Studio / Tripo | auto-rig incl. non-humanoid rig types | GLB/FBX/OBJ → rigged GLB/FBX | mixed free/paid | <https://www.3daistudio.com/Tools/RiggingTool> |
| DeepMotion / Plask / Rokoko Vision | video mocap → animation | phone video → FBX/GLB/BVH | free tiers mostly non-commercial | <https://app.cinevva.com/guides/ai-animation-generators-3d> |
| Cascadeur | AI-assisted keyframing / physics | keyframes → FBX/DAE | free + Indie | same guide |

**Critical practical caveat for our files:** Meshy/Mixamo expect *one character
mesh in a T- or A-pose*. Our `.glb` exports are **31-part part-soup boxes with no
armature and no pose** (892 parts / 10,704 triangles total). Merge the submeshes
into a single character mesh in Blender, pose it, and *then* upload — otherwise
auto-rigging will produce garbage. Meshy's "Smart Rig" handles non-standard
creatures, but a 31-object box assembly is still an unfavourable input.

### Converting generic animation → Cyberpunk `.anims`

This step is **not** done by any browser AI model; it needs WolvenKit + the game:

* **WolvenKit 9.1.0** (released 2026-10-10): <https://github.com/WolvenKit/WolvenKit/releases>
* **WolvenKit Blender IO Suite 2.0.0 + Blender 5.0**:
  <https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/modding-tools/wolvenkit-blender-io-suite>
* Workflow: export a vanilla `.anims` to GLB → overwrite with your pose in
  Blender (NLA tracks, names must match) → Import Tool with **Target File Format
  = Anims** → ArchiveXL `.xl` / TweakXL `.yaml`:
  <https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/animations/animations/poses-animations-make-your-own>
* REDmod `import -animset=...` also imports `.re` animations into an `.anims`
  set: <https://cdn-l-cyberpunk.cdprojektred.com/REDmod-docs.pdf>
* **2.31-specific automation:** "Easy Photomode Poses" v2.3 (2026-09-20) states
  *native support for Cyberpunk 2.31* and converts `.anims` → a complete
  ArchiveXL pose pack via WolvenKit Console:
  <https://www.nexusmods.com/cyberpunk2077/mods/18719>
* **Lipsync / facial animation online:** <https://lipsync.tools/> takes audio +
  exact words and returns a real `.anims` file (free demo, up to 20 lines,
  60 s each, English only, ~30 s/job). It is explicitly **not generative AI** —
  mouth shapes are statistical averages read from CDPR's own animations — but it
  is an online service that authors game-format animation. Source/tool is MIT:
  <https://github.com/andreaolivato/cyberpunk2077-lipsync-animator> ·
  <https://www.nexusmods.com/cyberpunk2077/mods/36187> (author reports in-game
  testing on **2.31 and 2.5**, needs WolvenKit ≥ 9.1 + the game).

## 3. Voice-over

| Step | Online model / tool | Notes |
|---|---|---|
| Generate speech | **ElevenLabs** (or OpenAI TTS, OmniVoice, Kokoro) | Online TTS; used by existing CP2077 mods, e.g. <https://www.nexusmods.com/cyberpunk2077/mods/30305> and <https://www.nexusmods.com/cyberpunk2077/mods/32694>. Do **not** clone a real actor's voice. |
| Ship it (easy path) | **REDmod `customSounds`** | Plain `.wav` + `info.json` with `customSounds` entries (`type`, `file`, `gain`, `pitch`): <https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/modding-tools/redmod/audio-modding> |
| Ship it (Wwise path) | Wwise **2019.2.15** → `.wem` → WolvenKit archive | Automated by the archived <https://github.com/Zhincore/cp2077-voiceswap> (RVC + Wwise + WolvenKit, Windows, ~35 GB). **WolvenKit cannot import WAV→WEM directly** (<https://github.com/WolvenKit/WolvenKit/issues/1461>). |
| Lipsync for your new lines | `lipsync.tools` (§2) | returns `.anims`; wire into `.scene` / `.lipmap` / ArchiveXL `.xl` with the MIT tool's `scene` command. |
| Edit/browse game audio | EDGEwave (in EDGEkit) or REDcode sound browser | <https://open-vsx.org/extension/edgemodders/redcode-cyberpunk> |

## 4. Seats and mounts — the honest answer

**No generative model authors these.** They are not meshes or audio; they are
REDengine component data inside `.ent` (and `.workspot` / `.app`):

* `vehicle_slots` / `entSlot` entries (`VehiclePowerWeaponLeftSlotA`, …) and
  `gameAttachmentSlots` are copied/positioned in the `.ent`:
  <https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/vehicles/weaponizing-vehicles> ·
  <https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/vehicles/weaponizing-vehicles/windows-and-doors-opening-+-mountedweapons-clue>
* Seating/posing uses `workWorkspotResourceComponent` in an `.ent` pointing at a
  `.workspot` with `workAnimClip` / `idleName` / `animName`:
  <https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/animations/animations/abusing-workspots>
* A custom `.rig` is authored by editing `BoneTransforms` in WolvenKit (X/Y
  flipped vs Blender); generating a brand-new rig from a GLB is still a manual
  process per the wiki:
  <https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/npcs/rig-deforming-for-v>

**The online-model route:** an LLM agent that can read/write CR2W — i.e.
**EDGEkit's Claude Code + REDcode** (§1) — can author these JSON/CR2W edits from
a template. That is exactly what the four `docs/integration/*.example` specs and
`docs/authoring_brief.json` are for: give the agent the template, the 30 example
ids and the `dmgId` submesh names, and ask it to fill in the slot components.
It still needs **your game install + WolvenKit** to resolve/validate the records.

## 5. Compatibility and licensing warnings (read before shipping)

* **2.31:** Easy Photomode Poses states native 2.31 support; Lipsync Animator was
  tested in-game on 2.31 and 2.5; WolvenKit 9.1.0 is the current stable. Some
  newer tooling tracks patch **2.5** (e.g. `update_2.5` branches), and the
  animation wiki's prerequisites are older (WolvenKit ≥ 8.18.1, Blender 5.0).
  **You will be the first to verify these on 2.31** — which is the in-game
  verification you said you'd handle.
* **Licences matter even for a private mod, because this repo is public**
  (`private: false`). Meshy's free tier is reported as CC BY 4.0 (attribution);
  Mixamo forbids redistributing its files; Cinevva's Animation Library clips are
  CC0; DeepMotion's free tier is non-commercial. Check each plan's terms before
  committing outputs. <https://app.cinevva.com/guides/ai-animation-generators-3d>
* `lipsync.tools` is "not generative AI": its mouth shapes are derived from the
  game's own animations. Output `.anims` is yours, but it is game-format data —
  review it before putting it in this public repo.
* **Do not feed game-extracted meshes/rigs/animations into these services** and
  do not commit extracted CDPR/third-party assets here. Only the 30
  `chassis.json` roster examples remain allowed model sources
  (`models.json → policy.onlyExamplesAllowed`).

## 6. What is in this repo to hand to the online model

| File | Use |
|---|---|
| `docs/authoring_brief.json` | Machine-readable job spec: 30 original `.glb` paths + SHA256, part/triangle counts, required outputs, toolchain URLs, 2.31 matrix, constraints, and a ready-to-paste prompt. |
| `assets/original_meshes/*.glb` | 30 ORIGINAL example-only meshes (one named submesh per destructible part, `section`/`dmgId` extras). NOT COMPILED. |
| `docs/integration/archivexl.archive.example.md` | WolvenKit project layout + `.archive.xl` registration. |
| `docs/integration/custom_mech_entity.example.md` | `.ent` spawn spec, `dmgId` bindings, model/weapon/damage hooks. |
| `docs/integration/redscript_hook.reds.example` | Runtime damage / eject / repair structs. |
| `docs/integration/tweakxl.yaml.example` | 8 original weapon records + balance/damage/model policy. |
| `docs/ORIGINAL_MESH_PIPELINE.md` | Why nothing was ripped; how to import the GLBs. |

Regenerate the brief: `python3 tools/authoring_brief.py` ·
verify: `python3 tools/authoring_brief.py --check`.

**Status of everything in this document: research + handoff spec only.
NOT INSTALLED · NOT COMPILED · NOT BUILT INTO AN ARCHIVE · NOT IN-GAME VERIFIED.**
The shipped install path remains CET-only over vanilla TweakDB records.
