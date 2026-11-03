#!/usr/bin/env python3
"""Rebuild models.json — the closed full-model / trace library.

The ONLY inputs are the 30 example chassis in chassis.json. Every full model is
its example's complete shape vector (including its signature-part composition);
the front / side / top blueprint traces are deterministic procedural projections
of that example's own parameters. No imported / ripped / extracted geometry.

Run from anywhere:  python3 tools/build_models.py
"""

import json, math, pathlib, hashlib
root = pathlib.Path(__file__).resolve().parents[1]
ch = json.loads((root/'chassis.json').read_text())
roster = ch['roster']
lib = ch['signatureParts']

def h(*parts):
    s = '|'.join(str(p) for p in parts)
    return int(hashlib.sha256(s.encode()).hexdigest()[:8], 16) / 0xffffffff

def jitter(seed, i, amp=0.012):
    return (h(seed, i) - 0.5) * 2 * amp

def interp(ctrl, y):
    ctrl = sorted(ctrl, key=lambda p: p[0])
    if y <= ctrl[0][0]: return ctrl[0][1]
    if y >= ctrl[-1][0]: return ctrl[-1][1]
    for i in range(len(ctrl)-1):
        y0,w0 = ctrl[i]; y1,w1 = ctrl[i+1]
        if y0 <= y <= y1 and y1 > y0:
            return w0 + (w1-w0)*(y-y0)/(y1-y0)
    return ctrl[-1][1]

def silhouette(shape, sig, seed, view):
    """Full closed outline for front/side/top, driven by the example's own shape + sig."""
    tw = shape['torsoW']; th = shape['torsoH']; td = shape['torsoD']
    sw = shape['shoulderW']; sh = shape['shoulderH']
    ul = shape['upperLeg']; ll = shape['lowerLeg']; hip = shape['hipW']
    hs = shape['headScale']; flare = shape['armorFlare']; stance = shape['legStance']
    frame = sig.get('frame','vanguard'); head = sig.get('head','pod')
    back = sig.get('back','boosterPack'); arms = sig.get('arms','standard')
    legs = sig.get('legs','braced'); extras = sig.get('extras',[])
    quad = frame in ('spider','tetrapod'); nolegs = frame in ('tank','hover','flyer')
    flying = frame in ('flyer','hover')

    H = th + (0 if nolegs else ul+ll) + hs*1.25 + sh*0.4
    legH = 0 if nolegs else (ul+ll)/H
    torso0 = legH
    torso1 = legH + th/H
    shoulderY = torso1 - sh/H*0.35
    headY = torso1 + hs*1.1/H
    W = max(tw, sw) * (1.55 if flying else 1.25)
    if view == 'side': W = td * 1.9
    if view == 'top':  W = max(tw, sw) * 1.55
    n = lambda v: 0.5 + v/(2*W)   # world x -> 0..1

    # half-width control profile (y, halfwidth-in-world-units)
    ctrl = [(0.0, hip*0.55)]
    if nolegs:
        ctrl += [(0.06, tw*0.72), (legH+0.01, tw*0.78)]
    else:
        ctrl += [(legH*0.18, hip*0.62), (legH*0.52, hip*0.42), (legH*0.96, tw*0.46)]
    ctrl += [(torso0+0.01, tw*0.52), (torso0+th/H*0.45, tw*0.52+(sw-tw)*0.22*flare),
             (shoulderY, sw*0.5), (torso1, tw*0.46)]
    if head != 'none': ctrl += [(headY-hs*0.5/H, hs*0.62), (headY, hs*0.5), (headY+hs*0.5/H, hs*0.22)]
    else: ctrl += [(headY, tw*0.18)]
    if flying:
        ctrl = [(y, w*(1.9 if y>0.55 else 1.0)) for y,w in ctrl]
    if frame == 'tank': ctrl = [(y, w*1.35) for y,w in ctrl]
    if frame in ('atlas','hunchback','knight'): ctrl = [(y, w*1.12) for y,w in ctrl]

    ys = [i/22 for i in range(23)]
    left, right = [], []
    for i,y in enumerate(ys):
        w = interp(ctrl, y) + jitter(seed, 100+i, 0.02)
        w = max(0.012, w)
        left.append([round(n(-w),4), round(y,4)])
        right.append([round(n(w),4), round(y,4)])
    outline = left + right[::-1]

    parts = []
    # arms / weapon pods, shoulder pauldrons, head, backpack/wings, legs, thrusters
    for sgn, tag in ((-1,'L'),(1,'R')):
        cx = 0.5 + sgn*(sw*0.5 + shape['upperArm']*0.32)/(2*W)
        aw = (shape['foreArm']*0.22 + 0.18)/(2*W)
        ay0, ay1 = torso0+0.03, torso1-0.05
        if arms in ('blade','claw','saw'):
            poly = [[cx-sgn*aw*0.4,ay1],[cx+sgn*aw*1.6,ay1+0.06],[cx+sgn*aw*0.5,ay0],[cx-sgn*aw*0.3,ay0+0.04]]
        elif nolegs:
            poly = [[cx-aw,ay1],[cx+aw,ay1],[cx+aw*0.7,ay0],[cx-aw*0.7,ay0]]
        else:
            poly = [[cx-aw,ay1],[cx+aw,ay1],[cx+aw*0.85,ay0],[cx-aw*0.85,ay0]]
        parts.append({'name':'ARM '+tag,'points':[[round(x,4),round(y,4)] for x,y in poly],'kind':'arm'})
        # pauldron
        py = shoulderY
        pw = (sw*0.30)/(2*W)
        parts.append({'name':'PAULDRON '+tag,'points':[[round(cx-sgn*pw*0.1,4),round(py+0.06,4)],
            [round(cx+sgn*pw,4),round(py+0.02,4)],[round(cx+sgn*pw*0.72,4),round(py-0.05,4)],
            [round(cx,4),round(py-0.07,4)]],'kind':'armor'})
    if not nolegs:
        for sgn,tag in ((-1,'L'),(1,'R')):
            lx = 0.5 + sgn*stance*0.5/(2*W)
            lw = hip*0.20/(2*W)
            parts.append({'name':'LEG '+tag,'points':[[round(lx-lw,4),round(legH*0.02,4)],
                [round(lx+lw,4),round(legH*0.02,4)],[round(lx+lw*0.7,4),round(legH*0.98,4)],
                [round(lx-lw*0.7,4),round(legH*0.98,4)]],'kind':'leg'})
        if quad:
            for sgn,tag in ((-1,'L2'),(1,'R2')):
                lx = 0.5 + sgn*stance*0.78/(2*W)
                lw = hip*0.15/(2*W)
                parts.append({'name':'EXTRA LEG '+tag,'points':[[round(lx-lw,4),round(legH*0.08,4)],
                    [round(lx+lw,4),round(legH*0.08,4)],[round(lx+lw*0.6,4),round(legH*0.9,4)],
                    [round(lx-lw*0.6,4),round(legH*0.9,4)]],'kind':'leg'})
    if back in ('etherWings','wings','boosterPack','missileRack','radiatorWings') or flying:
        span = (1.0 if flying else 0.55) + flare*0.2
        for sgn,tag in ((-1,'L'),(1,'R')):
            bx = 0.5 + sgn*(tw*0.28)/(2*W)
            ex = 0.5 + sgn*span/(2*W)*W
            by = torso1-0.02
            parts.append({'name':'BACK/WING '+tag,'points':[[round(bx,4),round(by,4)],
                [round(ex,4),round(by+0.12,4)],[round(ex*0.98,4),round(by-0.06,4)],
                [round(bx,4),round(by-0.12,4)]],'kind':'back'})
    if head != 'none':
        hw = hs*0.5/(2*W)
        parts.append({'name':'HEAD','points':[[round(0.5-hw,4),round(headY-0.03,4)],
            [round(0.5+hw,4),round(headY-0.03,4)],[round(0.5+hw*0.7,4),round(headY+0.06,4)],
            [round(0.5-hw*0.7,4),round(headY+0.06,4)]],'kind':'head'})
    if 'antenna' in extras:
        parts.append({'name':'ANTENNA','points':[[0.5,round(headY+0.05,4)],[round(0.5+0.01,4),round(headY+0.13,4)]],'kind':'detail'})
    for i in range(min(3, int(shape['jetCount']))):
        jx = 0.5 + (i-1)*0.035
        parts.append({'name':'THRUSTER '+str(i+1),'points':[[round(jx-0.012,4),round(torso0+0.05,4)],
            [round(jx+0.012,4),round(torso0+0.05,4)],[round(jx,4),round(torso0-0.02,4)]],'kind':'thruster'})

    panels = []
    for k in range(4):
        y = torso0 + 0.10 + k*0.11
        w = interp(ctrl, y)*0.72
        panels.append({'name':'PANEL '+str(k+1),'points':[[round(n(-w),4),round(y,4)],[round(n(w),4),round(y,4)]]})
    bays = [
        {'name':'REACTOR CORE','x':0.5,'y':round(torso0+0.42*(th/H),4),'r':0.045},
        {'name':'POWER BUS','x':round(n(-tw*0.22),4),'y':round(torso0+0.62*(th/H),4),'r':0.032},
        {'name':'COOLANT LOOP','x':round(n(tw*0.22),4),'y':round(torso0+0.62*(th/H),4),'r':0.032},
        {'name':'ECM SUITE','x':0.5,'y':round(torso1-0.06,4),'r':0.028},
        {'name':'SENSOR/OS','x':0.5,'y':round(headY,4),'r':0.022},
        {'name':'ACTUATORS','x':0.5,'y':round(legH*0.55,4),'r':0.036},
    ]
    if view == 'side':
        outline = [[round(0.5+(x-0.5)*0.62,4), y] for x,y in outline]
        parts = [{'name':p['name'],'kind':p['kind'],'points':[[round(0.5+(x-0.5)*0.62,4),y] for x,y in p['points']]} for p in parts]
        panels = [{'name':p['name'],'points':[[round(0.5+(x-0.5)*0.62,4),y] for x,y in p['points']]} for p in panels]
        bays = [dict(b, x=round(0.5+(b['x']-0.5)*0.62,4)) for b in bays]
    if view == 'top':
        outline = [[round(0.5+(x-0.5)*0.85,4), round(0.5+(y-0.5)*0.42,4)] for x,y in outline]
        parts = [{'name':p['name'],'kind':p['kind'],'points':[[round(0.5+(x-0.5)*0.85,4),round(0.5+(y-0.5)*0.42,4)] for x,y in p['points']]} for p in parts]
        panels = [{'name':p['name'],'points':[[round(0.5+(x-0.5)*0.85,4),round(0.5+(y-0.5)*0.42,4)] for x,y in p['points']]} for p in panels]
        bays = [dict(b, x=round(0.5+(b['x']-0.5)*0.85,4), y=round(0.5+(b['y']-0.5)*0.42,4)) for b in bays]
    return {'outline': outline, 'parts': parts, 'panels': panels, 'bays': bays,
            'axes': [[0.5,0.02],[0.5,0.98]]}

models = []
for i,c in enumerate(roster):
    shape = {k:c['shape'][k] for k in ch['shapeKeys']}
    sig = c['shape']['sig']
    seed = h(c['id'], sig, i)
    views = {v: silhouette(shape, sig, seed+{'front':1,'side':2,'top':3}[v]*977, v)
             for v in ('front','side','top')}
    models.append({
        'id': c['id'], 'sourceId': c['id'], 'name': c['name'],
        'faction': c['faction'], 'archetype': c['archetype'], 'role': c['role'],
        'bodyPlan': sig.get('frame','vanguard'),
        'sig': sig,
        'shape': dict(shape, sig=sig),
        'trace': views,
        'sourceNote': 'Full model + front/side/top trace derived only from example chassis '
                      + c['id'] + ' (chassis.json roster). No imported mesh, texture or third-party asset.',
        'allowed': True
    })

doc = {
  'meta': {
    'name': 'MECHFALL // FORGE 77 — full model / trace library',
    'version': '0.1.6-test',
    'note': 'The ONLY allowed full models and traces are the 30 example chassis below. Each is a complete procedural model and a front/side/top blueprint trace derived exclusively from that example\'s own shape vector + signature-part composition in chassis.json. No ripped, imported, extracted, traced-from-screenshot or base-mod geometry is used.'
  },
  'policy': {
    'onlyExamplesAllowed': True,
    'allowedSourceIds': [c['id'] for c in roster],
    'allowedCount': len(roster),
    'rejectGenericHulls': True,
    'customDesignsMustUseExampleParts': True,
    'note': 'A chassis is allowed only when its signature-part composition comes from the example library (7 slots / 59 original procedural part types). Generic untyped hulls, numeric-only scaling and any model source outside these 30 examples are rejected. Players still mix example parts freely — the emphasis stays fully customisable chassis + player-designed internals.'
  },
  'models': models
}
def rnd(o):
    if isinstance(o, float): return round(o, 3)
    if isinstance(o, list): return [rnd(x) for x in o]
    if isinstance(o, dict): return {k: rnd(v) for k, v in o.items()}
    return o

doc = rnd(doc)
lib_out = doc['models']
(root/'models.json').write_text(json.dumps(doc, separators=(',', ':'), ensure_ascii=False) + '\n')
print('models.json:', len(lib_out), 'models;',
      sum(len(m['trace']['front']['parts']) for m in lib_out), 'front part polygons;',
      len(set(json.dumps(m['trace']['front']['outline']) for m in lib_out)), 'distinct front outlines')
