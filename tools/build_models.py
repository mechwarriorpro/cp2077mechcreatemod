#!/usr/bin/env python3
"""Rebuild models.json — the closed full-model / trace / 3D-mesh library.

The ONLY inputs are the 30 example chassis in chassis.json. Every full model is
its example's complete shape vector (including its signature-part composition);
front / side / top blueprint traces are INDEPENDENT measurements from that
example's own width / depth / height parameters (not affine copies of the front
profile); and each example ships a real triangulated 3D part-soup mesh. No
imported / ripped / extracted / screenshot-traced geometry.

Run from anywhere:  python3 tools/build_models.py
"""

import json
import math
import pathlib
import hashlib

root = pathlib.Path(__file__).resolve().parents[1]
ch = json.loads((root / 'chassis.json').read_text())
roster = ch['roster']
lib = ch['signatureParts']


def h(*parts):
    s = '|'.join(str(p) for p in parts)
    return int(hashlib.sha256(s.encode()).hexdigest()[:8], 16) / 0xffffffff


def jitter(seed, i, amp=0.012):
    return (h(seed, i) - 0.5) * 2 * amp


def interp(ctrl, y):
    ctrl = sorted(ctrl, key=lambda p: p[0])
    if y <= ctrl[0][0]:
        return ctrl[0][1]
    if y >= ctrl[-1][0]:
        return ctrl[-1][1]
    for i in range(len(ctrl) - 1):
        y0, w0 = ctrl[i]
        y1, w1 = ctrl[i + 1]
        if y0 <= y <= y1 and y1 > y0:
            return w0 + (w1 - w0) * (y - y0) / (y1 - y0)
    return ctrl[-1][1]


def dims(shape, sig):
    s = shape
    frame = sig.get('frame', 'vanguard')
    quad = frame in ('spider', 'tetrapod')
    nolegs = frame in ('tank', 'hover', 'flyer')
    flying = frame in ('flyer', 'hover')
    leg = 0 if nolegs else s['upperLeg'] + s['lowerLeg']
    H = s['torsoH'] + leg + s['headScale'] * 1.25 + s['shoulderH'] * 0.4
    legH = leg / H
    t0, t1 = legH, legH + s['torsoH'] / H
    return dict(s=s, sig=sig, frame=frame, quad=quad, nolegs=nolegs,
                flying=flying, legH=legH, t0=t0, t1=t1,
                shoulderY=t1 - s['shoulderH'] / H * 0.35,
                headY=t1 + s['headScale'] * 1.1 / H, H=H)


def common_bays(D, W, n, offset=0.0, squash=1.0):
    s = D['s']
    t0, t1 = D['t0'], D['t1']
    return [
        {'name': 'REACTOR CORE', 'x': round(0.5 + offset, 4),
         'y': round(t0 + 0.42 * (s['torsoH'] / D['H']), 4), 'r': 0.045},
        {'name': 'POWER BUS', 'x': round(0.5 + offset - 0.10 * squash, 4),
         'y': round(t0 + 0.62 * (s['torsoH'] / D['H']), 4), 'r': 0.032},
        {'name': 'COOLANT LOOP', 'x': round(0.5 + offset + 0.10 * squash, 4),
         'y': round(t0 + 0.62 * (s['torsoH'] / D['H']), 4), 'r': 0.032},
        {'name': 'ECM SUITE', 'x': round(0.5 + offset, 4),
         'y': round(t1 - 0.06, 4), 'r': 0.028},
        {'name': 'SENSOR/OS', 'x': round(0.5 + offset, 4),
         'y': round(D['headY'], 4), 'r': 0.022},
        {'name': 'ACTUATORS', 'x': round(0.5 + offset, 4),
         'y': round(D['legH'] * 0.55, 4), 'r': 0.036},
    ]


def closed_outline(ctrl, W, seed, ys=22):
    """Closed symmetric outline from a half-width control profile."""
    n = lambda v: 0.5 + v / (2 * W)
    points = [i / ys for i in range(ys + 1)]
    left, right = [], []
    for i, y in enumerate(points):
        w = max(0.012, interp(ctrl, y) + jitter(seed, 100 + i, 0.018))
        left.append([round(n(-w), 4), round(y, 4)])
        right.append([round(n(w), 4), round(y, 4)])
    return left + right[::-1]


def panels_for(D, W, n, ctrl, count=4):
    t0 = D['t0']
    out = []
    for k in range(count):
        y = t0 + 0.10 + k * 0.11
        w = interp(ctrl, y) * 0.72
        out.append({'name': 'PANEL ' + str(k + 1),
                    'points': [[round(n(-w), 4), round(y, 4)],
                               [round(n(w), 4), round(y, 4)]]})
    return out


# ------------------------------------------------------------------ FRONT view
def front(D, seed):
    s, sig = D['s'], D['sig']
    tw, sw, hip = s['torsoW'], s['shoulderW'], s['hipW']
    stance, hs, flare = s['legStance'], s['headScale'], s['armorFlare']
    W = max(tw, sw) * (1.9 if D['flying'] else 1.25)
    n = lambda v: 0.5 + v / (2 * W)
    legH, t0, t1, sy, hy = D['legH'], D['t0'], D['t1'], D['shoulderY'], D['headY']
    ctrl = [(0.0, hip * 0.55)]
    if D['nolegs']:
        ctrl += [(0.06, tw * 0.72), (legH + 0.01, tw * 0.78)]
    else:
        ctrl += [(legH * 0.18, hip * 0.62), (legH * 0.52, hip * 0.42),
                 (legH * 0.96, tw * 0.46)]
    ctrl += [(t0 + 0.01, tw * 0.52), (t0 + s['torsoH'] / D['H'] * 0.45,
             tw * 0.52 + (sw - tw) * 0.22 * flare), (sy, sw * 0.5), (t1, tw * 0.46)]
    if sig.get('head', 'pod') != 'none':
        ctrl += [(hy - hs * 0.5 / D['H'], hs * 0.62), (hy, hs * 0.5),
                 (hy + hs * 0.5 / D['H'], hs * 0.22)]
    else:
        ctrl += [(hy, tw * 0.18)]
    if D['flying']:
        ctrl = [(y, w * 1.9 if y > 0.55 else w) for y, w in ctrl]
    if D['frame'] == 'tank':
        ctrl = [(y, w * 1.35) for y, w in ctrl]
    if D['frame'] in ('atlas', 'hunchback', 'knight'):
        ctrl = [(y, w * 1.12) for y, w in ctrl]

    parts = []
    for sgn, tag in ((-1, 'L'), (1, 'R')):
        cx = 0.5 + sgn * (sw * 0.5 + s['upperArm'] * 0.32) / (2 * W)
        aw = (s['foreArm'] * 0.22 + 0.18) / (2 * W)
        ay0, ay1 = t0 + 0.03, t1 - 0.05
        parts.append({'name': 'ARM ' + tag, 'kind': 'arm',
                      'points': [[round(cx - aw, 4), round(ay1, 4)],
                                 [round(cx + aw, 4), round(ay1, 4)],
                                 [round(cx + aw * 0.85, 4), round(ay0, 4)],
                                 [round(cx - aw * 0.85, 4), round(ay0, 4)]]})
        pw = sw * 0.30 / (2 * W)
        parts.append({'name': 'PAULDRON ' + tag, 'kind': 'armor',
                      'points': [[round(cx - sgn * pw * 0.1, 4), round(sy + 0.06, 4)],
                                 [round(cx + sgn * pw, 4), round(sy + 0.02, 4)],
                                 [round(cx + sgn * pw * 0.72, 4), round(sy - 0.05, 4)],
                                 [round(cx, 4), round(sy - 0.07, 4)]]})
    if not D['nolegs']:
        for sgn, tag in ((-1, 'L'), (1, 'R')):
            lx = 0.5 + sgn * stance * 0.5 / (2 * W)
            lw = hip * 0.20 / (2 * W)
            parts.append({'name': 'LEG ' + tag, 'kind': 'leg',
                          'points': [[round(lx - lw, 4), round(legH * 0.02, 4)],
                                     [round(lx + lw, 4), round(legH * 0.02, 4)],
                                     [round(lx + lw * 0.7, 4), round(legH * 0.98, 4)],
                                     [round(lx - lw * 0.7, 4), round(legH * 0.98, 4)]]})
        if D['quad']:
            for sgn, tag in ((-1, 'L2'), (1, 'R2')):
                lx = 0.5 + sgn * stance * 0.78 / (2 * W)
                lw = hip * 0.15 / (2 * W)
                parts.append({'name': 'EXTRA LEG ' + tag, 'kind': 'leg',
                              'points': [[round(lx - lw, 4), round(legH * 0.08, 4)],
                                         [round(lx + lw, 4), round(legH * 0.08, 4)],
                                         [round(lx + lw * 0.6, 4), round(legH * 0.9, 4)],
                                         [round(lx - lw * 0.6, 4), round(legH * 0.9, 4)]]})
    if sig.get('back') in ('etherWings', 'wings', 'boosterPack', 'missileRack', 'radiatorWings') or D['flying']:
        span = (1.0 if D['flying'] else 0.55) + flare * 0.2
        for sgn, tag in ((-1, 'L'), (1, 'R')):
            bx = 0.5 + sgn * (tw * 0.28) / (2 * W)
            ex = 0.5 + sgn * span * 0.5
            parts.append({'name': 'BACK/WING ' + tag, 'kind': 'back',
                          'points': [[round(bx, 4), round(t1 - 0.02, 4)],
                                     [round(ex, 4), round(t1 + 0.10, 4)],
                                     [round(ex * 0.98, 4), round(t1 - 0.08, 4)],
                                     [round(bx, 4), round(t1 - 0.14, 4)]]})
    if sig.get('head', 'pod') != 'none':
        hw = hs * 0.5 / (2 * W)
        parts.append({'name': 'HEAD', 'kind': 'head',
                      'points': [[round(0.5 - hw, 4), round(hy - 0.03, 4)],
                                 [round(0.5 + hw, 4), round(hy - 0.03, 4)],
                                 [round(0.5 + hw * 0.7, 4), round(hy + 0.06, 4)],
                                 [round(0.5 - hw * 0.7, 4), round(hy + 0.06, 4)]]})
    if 'antenna' in sig.get('extras', []):
        parts.append({'name': 'ANTENNA', 'kind': 'detail',
                      'points': [[0.5, round(hy + 0.05, 4)],
                                 [0.51, round(hy + 0.13, 4)]]})
    for i in range(min(3, int(s['jetCount']))):
        jx = 0.5 + (i - 1) * 0.035
        parts.append({'name': 'THRUSTER ' + str(i + 1), 'kind': 'thruster',
                      'points': [[round(jx - 0.012, 4), round(t0 + 0.05, 4)],
                                 [round(jx + 0.012, 4), round(t0 + 0.05, 4)],
                                 [round(jx, 4), round(t0 - 0.02, 4)]]})
    return {'outline': closed_outline(ctrl, W, seed), 'parts': parts,
            'panels': panels_for(D, W, n, ctrl), 'bays': common_bays(D, W, n),
            'axes': [[0.5, 0.02], [0.5, 0.98]]}


# ------------------------------------------------------------------- SIDE view
# Independent profile: horizontal axis is DEPTH (torsoD / footL / backpack), not
# a squashed copy of the front width. Asymmetric: backpack bulges backwards.
def side(D, seed):
    s, sig = D['s'], D['sig']
    td, sh, hs = s['torsoD'], s['shoulderH'], s['headScale']
    foot, hip, flare = s['footL'], s['hipW'], s['armorFlare']
    back = sig.get('back', 'boosterPack')
    legH, t0, t1, sy, hy = D['legH'], D['t0'], D['t1'], D['shoulderY'], D['headY']
    depth = td * (1.15 if D['flying'] else 1.0) + (0.55 if back in ('boosterPack', 'missileRack') else 0.15)
    W = max(depth, foot * 1.3, 1.6)
    n = lambda v: 0.5 + v / (2 * W)

    ctrl = [(0.0, foot * 0.42)]
    if D['nolegs']:
        ctrl += [(0.05, depth * 0.48), (legH + 0.01, depth * 0.50)]
    else:
        ctrl += [(legH * 0.20, foot * 0.48), (legH * 0.55, foot * 0.30),
                 (legH * 0.97, hip * 0.20)]
    ctrl += [(t0 + 0.01, td * 0.52), (t0 + 0.25 * (t1 - t0), td * 0.60 + sh * 0.10),
             (sy, td * 0.55 + sh * 0.18 * flare), (t1, td * 0.46)]
    if sig.get('head', 'pod') != 'none':
        ctrl += [(hy - hs * 0.5 / D['H'], hs * 0.52), (hy, hs * 0.42),
                 (hy + hs * 0.4 / D['H'], hs * 0.18)]
    else:
        ctrl += [(hy, td * 0.15)]
    if back in ('etherWings', 'wings', 'radiatorWings'):
        ctrl = [(y, w * (1.28 if y > t0 else 1.0)) for y, w in ctrl]
    outline = closed_outline(ctrl, W, seed + 7919)
    # Backward asymmetry: push the rear half (x < 0.5) further back for packs.
    if back in ('boosterPack', 'missileRack', 'etherWings', 'radiatorWings'):
        outline = [[round(0.5 + (x - 0.5) * (1.16 if x < 0.5 else 0.94), 4), y]
                   for x, y in outline]

    parts = []
    parts.append({'name': 'TORSO DEPTH', 'kind': 'armor',
                  'points': [[round(n(-td * 0.46), 4), round(t0 + 0.02, 4)],
                             [round(n(td * 0.46), 4), round(t0 + 0.02, 4)],
                             [round(n(td * 0.52), 4), round(t1 - 0.02, 4)],
                             [round(n(-td * 0.52), 4), round(t1 - 0.02, 4)]]})
    parts.append({'name': 'REACTOR CORE', 'kind': 'reactor',
                  'points': [[round(n(td * 0.18), 4), round(t0 + 0.18, 4)],
                             [round(n(td * 0.46), 4), round(t0 + 0.18, 4)],
                             [round(n(td * 0.46), 4), round(t0 + 0.46, 4)],
                             [round(n(td * 0.18), 4), round(t0 + 0.46, 4)]]})
    parts.append({'name': 'BACKPACK / WING', 'kind': 'back',
                  'points': [[round(n(-td * 0.52), 4), round(t0 + 0.28, 4)],
                             [round(n(-depth * 0.62), 4), round(t1 - 0.02, 4)],
                             [round(n(-depth * 0.58), 4), round(t0 + 0.06, 4)],
                             [round(n(-td * 0.44), 4), round(t0 + 0.06, 4)]]})
    parts.append({'name': 'COOLANT MANIFOLD', 'kind': 'vent',
                  'points': [[round(n(td * 0.20), 4), round(t0 + 0.52, 4)],
                             [round(n(td * 0.44), 4), round(t0 + 0.52, 4)],
                             [round(n(td * 0.40), 4), round(t0 + 0.72, 4)],
                             [round(n(td * 0.20), 4), round(t0 + 0.72, 4)]]})
    if sig.get('head', 'pod') != 'none':
        parts.append({'name': 'COCKPIT CANOPY', 'kind': 'head',
                      'points': [[round(n(-hs * 0.40), 4), round(hy - 0.04, 4)],
                                 [round(n(hs * 0.38), 4), round(hy - 0.04, 4)],
                                 [round(n(hs * 0.30), 4), round(hy + 0.07, 4)],
                                 [round(n(-hs * 0.28), 4), round(hy + 0.07, 4)]]})
    if not D['nolegs']:
        for sgn, tag in ((-1, 'REAR LEG'), (1, 'FRONT LEG')):
            lx = sgn * foot * 0.32
            parts.append({'name': tag, 'kind': 'leg',
                          'points': [[round(n(lx - foot * 0.22), 4), round(legH * 0.02, 4)],
                                     [round(n(lx + foot * 0.22), 4), round(legH * 0.02, 4)],
                                     [round(n(lx * 0.5 + sgn * foot * 0.12), 4), round(legH * 0.98, 4)],
                                     [round(n(lx * 0.5 - sgn * foot * 0.12), 4), round(legH * 0.98, 4)]]})
    for i in range(min(2, int(s['jetCount']))):
        parts.append({'name': 'THRUSTER ' + str(i + 1), 'kind': 'thruster',
                      'points': [[round(n(-td * 0.30 + i * 0.08), 4), round(t0 + 0.04, 4)],
                                 [round(n(-td * 0.18 + i * 0.08), 4), round(t0 + 0.04, 4)],
                                 [round(n(-td * 0.24 + i * 0.08), 4), round(t0 - 0.04, 4)]]})
    panels = [{'name': 'DEPTH PANEL ' + str(k + 1),
               'points': [[round(n(-interp(ctrl, t0 + 0.12 + k * 0.13) * 0.8), 4),
                           round(t0 + 0.12 + k * 0.13, 4)],
                          [round(n(interp(ctrl, t0 + 0.12 + k * 0.13) * 0.8), 4),
                           round(t0 + 0.12 + k * 0.13, 4)]]} for k in range(3)]
    bays = common_bays(D, W, n, offset=-0.02, squash=0.55)
    bays.append({'name': 'CAPACITOR BANK', 'x': round(n(-td * 0.28), 4),
                 'y': round(t0 + 0.30, 4), 'r': 0.026})
    return {'outline': outline, 'parts': parts, 'panels': panels, 'bays': bays,
            'axes': [[0.5, 0.02], [0.5, 0.98]]}


# -------------------------------------------------------------------- TOP view
# Independent plan view: x = WIDTH, y = DEPTH. Wings extend laterally, legs/
# feet show fore/aft footprint. Not an affine copy of the front elevation.
def top(D, seed):
    s, sig = D['s'], D['sig']
    tw, sw, td, foot = s['torsoW'], s['shoulderW'], s['torsoD'], s['footL']
    hip, stance = s['hipW'], s['legStance']
    flare, hs = s['armorFlare'], s['headScale']
    back = sig.get('back', 'boosterPack')
    W = max(tw, sw) * (1.8 if D['flying'] else 1.35)
    n = lambda v: 0.5 + v / (2 * W)
    zc = lambda v: 0.5 + v / (2 * max(td * 1.6, foot * 2.4, 2.2))
    Dp = max(td * 1.6, foot * 2.4, 2.2)
    zc = lambda v: 0.5 + v / (2 * Dp)

    span = sw * 0.5 + s['upperArm'] * 0.35 + flare * 0.35
    nose = td * 0.55 + hs * 0.45
    tail = td * 0.55 + (0.7 if back in ('boosterPack', 'missileRack', 'etherWings', 'radiatorWings') else 0.15)
    outline = []
    for k in range(13):
        t = k / 12
        x = -span * math.sin(math.pi * t) * (0.55 + 0.45 * math.sin(math.pi * t))
        y = -tail + (tail + nose) * t
        outline.append([round(n(x), 4), round(zc(y), 4)])
    for k in range(13):
        t = 1 - k / 12
        x = span * math.sin(math.pi * t) * (0.55 + 0.45 * math.sin(math.pi * t))
        y = -tail + (tail + nose) * t
        outline.append([round(n(x), 4), round(zc(y), 4)])
    outline = [[round(min(0.98, max(0.02, x + jitter(seed, 700 + i, 0.012))), 4), y]
               for i, (x, y) in enumerate(outline)]

    parts = []
    parts.append({'name': 'TORSO PLAN', 'kind': 'armor',
                  'points': [[round(n(-tw * 0.5), 4), round(zc(-td * 0.5), 4)],
                             [round(n(tw * 0.5), 4), round(zc(-td * 0.5), 4)],
                             [round(n(tw * 0.5), 4), round(zc(td * 0.5), 4)],
                             [round(n(-tw * 0.5), 4), round(zc(td * 0.5), 4)]]})
    for sgn, tag in ((-1, 'L'), (1, 'R')):
        parts.append({'name': 'WING / POD ' + tag, 'kind': 'back',
                      'points': [[round(n(sgn * tw * 0.36), 4), round(zc(-td * 0.42), 4)],
                                 [round(n(sgn * span * 0.92), 4), round(zc(-td * 0.20), 4)],
                                 [round(n(sgn * span * 0.86), 4), round(zc(td * 0.30), 4)],
                                 [round(n(sgn * tw * 0.36), 4), round(zc(td * 0.22), 4)]]})
        if not D['nolegs']:
            parts.append({'name': 'FOOT ' + tag, 'kind': 'leg',
                          'points': [[round(n(sgn * stance * 0.5 - foot * 0.34), 4), round(zc(td * 0.42), 4)],
                                     [round(n(sgn * stance * 0.5 + foot * 0.34), 4), round(zc(td * 0.42), 4)],
                                     [round(n(sgn * stance * 0.5 + foot * 0.30), 4), round(zc(td * 0.42 + foot * 0.7), 4)],
                                     [round(n(sgn * stance * 0.5 - foot * 0.30), 4), round(zc(td * 0.42 + foot * 0.7), 4)]]})
    if sig.get('head', 'pod') != 'none':
        parts.append({'name': 'COCKPIT PLAN', 'kind': 'head',
                      'points': [[round(n(-hs * 0.42), 4), round(zc(td * 0.44), 4)],
                                 [round(n(hs * 0.42), 4), round(zc(td * 0.44), 4)],
                                 [round(n(hs * 0.34), 4), round(zc(nose * 0.9), 4)],
                                 [round(n(-hs * 0.34), 4), round(zc(nose * 0.9), 4)]]})
    parts.append({'name': 'RADIATOR ARRAY', 'kind': 'vent',
                  'points': [[round(n(-tw * 0.30), 4), round(zc(-tail * 0.82), 4)],
                             [round(n(tw * 0.30), 4), round(zc(-tail * 0.82), 4)],
                             [round(n(tw * 0.24), 4), round(zc(-td * 0.52), 4)],
                             [round(n(-tw * 0.24), 4), round(zc(-td * 0.52), 4)]]})
    panels = [{'name': 'PLAN SEAM ' + str(k + 1),
               'points': [[round(n(-tw * (0.42 - k * 0.10)), 4), round(zc(-td * 0.30), 4)],
                          [round(n(tw * (0.42 - k * 0.10)), 4), round(zc(-td * 0.30), 4)]]}
              for k in range(3)]
    bays = [
        {'name': 'REACTOR CORE', 'x': 0.5, 'y': round(zc(0), 4), 'r': 0.045},
        {'name': 'POWER BUS', 'x': round(n(-tw * 0.22), 4), 'y': round(zc(td * 0.14), 4), 'r': 0.032},
        {'name': 'COOLANT LOOP', 'x': round(n(tw * 0.22), 4), 'y': round(zc(td * 0.14), 4), 'r': 0.032},
        {'name': 'ECM SUITE', 'x': 0.5, 'y': round(zc(-td * 0.28), 4), 'r': 0.028},
        {'name': 'SENSOR/OS', 'x': 0.5, 'y': round(zc(td * 0.46), 4), 'r': 0.022},
        {'name': 'ACTUATORS', 'x': 0.5, 'y': round(zc(td * 0.62), 4), 'r': 0.036},
    ]
    return {'outline': outline, 'parts': parts, 'panels': panels, 'bays': bays,
            'axes': [[0.5, 0.02], [0.5, 0.98]]}


# --------------------------------------------------- real triangulated 3D mesh
# A part-soup box mesh: 8 vertices + 12 triangles per physical part. Vertices
# are in the example's own world units (metres), derived only from shape params.
def build_mesh(shape, sig):
    s = shape
    D = dims(shape, sig)
    th, tw, td = s['torsoH'], s['torsoW'], s['torsoD']
    hs, sw, sh = s['headScale'], s['shoulderW'], s['shoulderH']
    hip, stance, foot = s['hipW'], s['legStance'], s['footL']
    ul, ll = s['upperLeg'], s['lowerLeg']
    leg = 0 if D['nolegs'] else ul + ll
    baseY = leg
    boxes = []

    def add(name, section, c, half):
        boxes.append({'name': name, 'section': section,
                      'center': [round(v, 3) for v in c],
                      'half': [round(max(0.02, v), 3) for v in half]})

    add('TORSO HULL', 'torso', [0, baseY + th * 0.5, 0], [tw * 0.5, th * 0.5, td * 0.5])
    add('COCKPIT CANOPY', 'cockpit', [0, baseY + th + hs * 0.5, 0], [hs * 0.45, hs * 0.42, hs * 0.45])
    add('SENSOR SUITE', 'cockpit', [0, baseY + th + hs * 0.42, td * 0.45], [hs * 0.22, hs * 0.15, hs * 0.12])
    add('EW BACKPACK', 'torso', [0, baseY + th * 0.62, -td * 0.5 - 0.22],
        [tw * 0.30, th * 0.24, 0.26])
    add('REACTOR CORE', 'torso', [0, baseY + th * 0.42, td * 0.5 + 0.16],
        [tw * 0.21, th * 0.16, 0.18])
    add('POWER BUS SPINE', 'torso', [0, baseY + th * 0.50, 0.05],
        [tw * 0.12, th * 0.28, td * 0.20])
    add('CAPACITOR BANK', 'torso', [0, baseY + th * 0.26, td * 0.26],
        [tw * 0.15, th * 0.10, td * 0.15])
    add('COOLANT MANIFOLD', 'torso', [0, baseY + th * 0.26, -td * 0.26],
        [tw * 0.15, th * 0.10, td * 0.15])
    add('HIP ASSEMBLY', 'torso', [0, baseY, 0], [hip * 0.5, 0.22, td * 0.34])
    for sgn, tag in ((-1, 'L'), (1, 'R')):
        sx = sgn * (tw * 0.5 + sw * 0.26)
        add('SHOULDER ' + tag, 'torso', [sx, baseY + th * 0.78, 0],
            [sw * 0.28, sh * 0.5, td * 0.42])
        add('UPPER ARM ' + tag, 'limb', [sx + sgn * sw * 0.18, baseY + th * 0.50, 0],
            [s['upperArm'] * 0.16, s['upperArm'] * 0.42, s['upperArm'] * 0.16])
        add('FOREARM ' + tag, 'limb', [sx + sgn * sw * 0.22, baseY + th * 0.16, 0],
            [s['foreArm'] * 0.17, s['foreArm'] * 0.42, s['foreArm'] * 0.17])
        add('WEAPON MOUNT ' + tag, 'weapon',
            [sgn * s['weaponX'], baseY + s['weaponY'], td * 0.30],
            [0.24, 0.20, 0.34])
        if not D['nolegs']:
            lx = sgn * stance * 0.5
            add('UPPER LEG ' + tag, 'limb', [lx, baseY - ll - ul * 0.5, 0],
                [hip * 0.16, ul * 0.5, hip * 0.16])
            add('LOWER LEG ' + tag, 'limb', [lx, baseY - ll * 0.5, 0],
                [hip * 0.14, ll * 0.5, hip * 0.14])
            add('FOOT ' + tag, 'limb', [lx, baseY - 0.10, foot * 0.22],
                [foot * 0.30, 0.12, foot * 0.5])
            add('KNEE JOINT ' + tag, 'limb', [lx, baseY - ll, 0],
                [0.16, 0.16, 0.16])
        add('RADIATOR ' + tag, 'system', [sgn * tw * 0.34, baseY + th * 0.72, -td * 0.5 - 0.30],
            [0.14, th * 0.22, 0.10])
    for i in range(min(4, int(s['jetCount']))):
        add('THRUSTER ' + str(i + 1), 'system',
            [(i - (min(4, int(s['jetCount'])) - 1) / 2) * 0.28,
             baseY + th * 0.30, -td * 0.5 - 0.42],
            [s['thrusterSize'] * 0.18, s['thrusterSize'] * 0.24, s['thrusterSize'] * 0.20])
    for j in range(min(3, int(s['jumpJetCount']))):
        add('JUMP JET ' + str(j + 1), 'system',
            [(j - 1) * 0.34, baseY + th * 0.92, -td * 0.5 - 0.18],
            [0.13, 0.18, 0.13])
    if 'antenna' in sig.get('extras', []):
        add('ANTENNA MAST', 'system', [0, baseY + th + hs * 1.3, -hs * 0.2],
            [0.03, hs * 0.42, 0.03])

    verts, tris, meta = [], [], []
    for pi, b in enumerate(boxes):
        c, q = b['center'], b['half']
        v0 = len(verts)
        for dx in (-1, 1):
            for dy in (-1, 1):
                for dz in (-1, 1):
                    verts.append([round(c[0] + dx * q[0], 3),
                                  round(c[1] + dy * q[1], 3),
                                  round(c[2] + dz * q[2], 3)])
        # 8 corners: index = dx*4 + dy*2 + dz with -1 -> 0, +1 -> 1
        I = lambda dx, dy, dz: v0 + (1 if dx > 0 else 0) * 4 + (1 if dy > 0 else 0) * 2 + (1 if dz > 0 else 0)
        faces = [
            ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1)),
            ((-1, -1, 1), (-1, 1, 1), (1, 1, 1), (1, -1, 1)),
            ((-1, -1, -1), (-1, 1, -1), (-1, 1, 1), (-1, -1, 1)),
            ((1, -1, -1), (1, -1, 1), (1, 1, 1), (1, 1, -1)),
            ((-1, -1, -1), (-1, -1, 1), (1, -1, 1), (1, -1, -1)),
            ((-1, 1, -1), (1, 1, -1), (1, 1, 1), (-1, 1, 1)),
        ]
        t0 = len(tris)
        for a, bb, cc, dd in faces:
            A, B, C, Dd = I(*a), I(*bb), I(*cc), I(*dd)
            # Wound outward from the box centre so every consumer (browser 3D,
            # glTF/OBJ export, a future WolvenKit .mesh) sees correct normals.
            tris.append([A, C, B, pi])
            tris.append([A, Dd, C, pi])
        meta.append({'name': b['name'], 'section': b['section'],
                     'center': b['center'], 'half': b['half'],
                     'vertexStart': v0, 'triangleStart': t0,
                     'vertexCount': 8, 'triangleCount': 12})
    return {'units': 'metres (example shape vector)', 'parts': meta,
            'vertices': verts, 'triangles': tris,
            'partCount': len(meta), 'vertexCount': len(verts),
            'triangleCount': len(tris),
            'note': 'Indexed triangulated part-soup mesh generated only from the example shape vector; no imported geometry.'}


# --------------------------------------------------------------------- assembly
models = []
for i, c in enumerate(roster):
    shape = {k: c['shape'][k] for k in ch['shapeKeys']}
    sig = c['shape']['sig']
    D = dims(shape, sig)
    seed = h(c['id'], sig, i)
    models.append({
        'id': c['id'], 'sourceId': c['id'], 'name': c['name'],
        'faction': c['faction'], 'archetype': c['archetype'], 'role': c['role'],
        'bodyPlan': sig.get('frame', 'vanguard'),
        'sig': sig,
        'shape': dict(shape, sig=sig),
        'trace': {
            'front': front(D, seed),
            'side': side(D, seed + 977),
            'top': top(D, seed + 1954),
        },
        'mesh': build_mesh(shape, sig),
        'sourceNote': 'Full model, three independent orthographic traces and a triangulated 3D mesh '
                      'derived only from example chassis ' + c['id'] + ' (chassis.json roster). '
                      'No imported mesh, texture or third-party asset.',
        'allowed': True,
    })

doc = {
    'meta': {
        'name': 'MECHFALL // FORGE 77 — full model / trace / 3D mesh library',
        'version': json.loads((root / 'compat.json').read_text())['meta']['version'],
        'note': 'The ONLY allowed full models and traces are the 30 example chassis below. Each is a complete '
                'procedural model (20-parameter shape vector + signature-part composition), three INDEPENDENT '
                'front / side / top blueprint traces, and a real indexed triangulated 3D part-soup mesh — derived '
                'exclusively from that example. No ripped, imported, extracted, traced-from-screenshot or '
                'base-mod geometry is used.'
    },
    'policy': {
        'onlyExamplesAllowed': True,
        'allowedSourceIds': [c['id'] for c in roster],
        'allowedCount': len(roster),
        'rejectGenericHulls': True,
        'customDesignsMustUseExampleParts': True,
        'independentOrthographicViews': True,
        'ships3DMesh': True,
        'note': 'A chassis is allowed only when its signature-part composition comes from the example library '
                '(7 slots / 59 original procedural part types). Generic untyped hulls, numeric-only scaling and '
                'any model source outside these 30 examples are rejected. Players still mix example parts freely.'
    },
    'models': models,
}


def rnd(o):
    if isinstance(o, float):
        return round(o, 3)
    if isinstance(o, list):
        return [rnd(x) for x in o]
    if isinstance(o, dict):
        return {k: rnd(v) for k, v in o.items()}
    return o


doc = rnd(doc)
(root / 'models.json').write_text(json.dumps(doc, separators=(',', ':'), ensure_ascii=False) + '\n')
print('models.json:', len(models), 'models;',
      sum(len(m['trace']['front']['parts']) for m in models), 'front part polygons;',
      len(set(json.dumps(m['trace']['front']['outline']) for m in models)), 'distinct front outlines;',
      sum(m['mesh']['triangleCount'] for m in models), '3D triangles;',
      len(set(json.dumps(m['trace']['side']['outline']) for m in models)), 'distinct side outlines;',
      len(set(json.dumps(m['trace']['top']['outline']) for m in models)), 'distinct top outlines')
