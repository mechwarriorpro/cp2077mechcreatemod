const fs = require('fs');
const path = require('path');
const luaparse = require('luaparse');
const F = require('fengari');
const { lua, lauxlib, lualib } = F;
const enc = F.to_luastring;
const LUA_PATH = path.join(__dirname, '..', 'cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua');
const src = fs.readFileSync(LUA_PATH, 'utf8');
try { luaparse.parse(src, { luaVersion: '5.3' }); console.log('LUA PARSE OK ·', src.length, 'bytes'); }
catch (e) { console.error('LUA PARSE FAILED:', e.message); process.exit(1); }
if (/__MF_GENERATED_DATA__|__MF_INGAME_LUA__/.test(src)) { console.error('stale generated-data marker'); process.exit(1); }
let L;
function errMsg() {
  const t = lua.lua_type(L, -1);
  if (t === lua.LUA_TSTRING) { try { return F.to_jsstring(lua.lua_tostring(L, -1)); } catch (e) { return '<str>'; } }
  return '<non-string error type ' + t + '>';
}
L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);

const handlers = {};
const inputRefs = {};
const hotkeys = [];
function pushValue(v) {
  if (v === null || v === undefined) lua.lua_pushnil(L);
  else if (typeof v === 'boolean') lua.lua_pushboolean(L, v ? 1 : 0);
  else if (typeof v === 'number') lua.lua_pushnumber(L, v);
  else if (typeof v === 'string') lua.lua_pushstring(L, enc(v));
  else if (Array.isArray(v)) { lua.lua_newtable(L); v.forEach((x, i) => { pushValue(x); lua.lua_rawseti(L, -2, i + 1); }); }
  else { lua.lua_newtable(L); Object.keys(v).forEach(k => { lua.lua_pushstring(L, enc(k)); pushValue(v[k]); lua.lua_rawset(L, -3); }); }
}
function readArg(Lf, i) {
  const t = lua.lua_type(Lf, i);
  if (t === lua.LUA_TNUMBER) return lua.lua_tonumber(Lf, i);
  if (t === lua.LUA_TBOOLEAN) return !!lua.lua_toboolean(Lf, i);
  if (t === lua.LUA_TSTRING) return F.to_jsstring(lua.lua_tostring(Lf, i));
  return { luaType: t };
}
function cfn(n, fn) {
  return function (Lf) {
    const top = lua.lua_gettop(Lf), args = [];
    for (let i = 1; i <= top; i++) args.push(readArg(Lf, i));
    let res = fn(args, Lf) || [];
    if (!Array.isArray(res)) res = [res];
    res.slice(0, n).forEach(pushValue);
    return Math.min(n, res.length);
  };
}
function setGlobal(name, n, fn) { lua.lua_pushcfunction(L, cfn(n, fn)); lua.lua_setglobal(L, enc(name)); }

setGlobal('registerForEvent', 0, (a, Lf) => {
  if (lua.lua_type(Lf, 2) === lua.LUA_TFUNCTION) {
    lua.lua_pushvalue(Lf, 2);
    handlers[a[0]] = lauxlib.luaL_ref(Lf, lua.LUA_REGISTRYINDEX);
  }
});
setGlobal('registerHotkey', 0, (a, Lf) => {
  if (lua.lua_type(Lf, 3) === lua.LUA_TFUNCTION) {
    lua.lua_pushvalue(Lf, 3);
    const ref = lauxlib.luaL_ref(Lf, lua.LUA_REGISTRYINDEX);
    hotkeys.push(ref);
    // The template registers the overlay toggle last; call() exercises that one.
    handlers.hotkey = ref;
  }
});
setGlobal('registerInput', 0, (a, Lf) => {
  if (lua.lua_type(Lf, 3) === lua.LUA_TFUNCTION) {
    lua.lua_pushvalue(Lf, 3);
    inputRefs[a[0]] = lauxlib.luaL_ref(Lf, lua.LUA_REGISTRYINDEX);
  }
});
setGlobal('GetMod', 1, () => null);

const im = {};
const rets = { Begin: 1, BeginChild: 1, Button: 1, Selectable: 1, Checkbox: 2, SliderFloat: 2, SliderInt: 2, Combo: 2,
  End: 0, EndChild: 0, Separator: 0, SameLine: 0, Text: 0, TextWrapped: 0, TextColored: 0, ProgressBar: 0 };
Object.keys(rets).forEach(k => {
  im[k] = () => {
    if (k === 'Begin' || k === 'BeginChild') return [true];
    if (k === 'Button' || k === 'Selectable') return [false];
    if (k === 'Checkbox') return [false, false];
    if (k === 'SliderFloat' || k === 'SliderInt') return [1, false];
    if (k === 'Combo') return [0, false];
    return [];
  };
});
lua.lua_newtable(L);
Object.keys(im).forEach(k => {
  lua.lua_pushstring(L, enc(k));
  lua.lua_pushcfunction(L, cfn(rets[k], im[k]));
  lua.lua_rawset(L, -3);
});
lua.lua_setglobal(L, enc('ImGui'));

/* A faithful Lua-side stub of the CET game APIs used by the IN-GAME PILOT.
   These are NOT shipped in the mod; they only let us execute init.lua here. */
const STUBS = `
Vector4 = { new = function(x,y,z,w) return {x=x or 0,y=y or 0,z=z or 0,w=w or 1} end }
EulerAngles = { new = function(r,p,y)
  return { roll=r or 0, pitch=p or 0, yaw=y or 0,
    ToQuat=function(self) return self end, ToEulerAngles=function(self) return self end }
end }
function ToVector4(t) return Vector4.new(t.x,t.y,t.z,t.w) end
function ToEulerAngles(t) return EulerAngles.new(t.roll,t.pitch,t.yaw) end
WorldTransform = { new = function()
  return { position=nil, orientation=nil,
    SetPosition=function(self,v) self.position=v end,
    SetOrientationEuler=function(self,v) self.orientation=v end,
    SetOrientation=function(self,v) self.orientation=v end }
end }
_stubEntities, _stubNext, _stubTeleports, _stubDespawns = {}, 0, 0, 0
function _stubEntity(id)
  local e = { id=id, tr=WorldTransform.new(),
    GetWorldTransform=function(self) return self.tr end,
    SetWorldTransform=function(self,t) self.tr=t end,
    GetWorldPosition=function(self) return self.tr.position or Vector4.new(100,200,0,1) end,
    GetWorldOrientation=function(self) return EulerAngles.new(0,0,45) end,
    GetWorldForward=function(self) return Vector4.new(0.7071,0.7071,0,1) end,
    GetWorldYaw=function(self) return 0.785398163 end }
  return e
end
function _stubSpawn(rec)
  _stubNext = _stubNext + 1
  local id = { hash=_stubNext, record=tostring(rec) }
  _stubEntities[tostring(_stubNext)] = _stubEntity(id)
  return id
end
function GetVersion() return "v1.37.1" end
_stubPlayer = _stubEntity({hash=0})
_stubPlayer.tr:SetPosition(Vector4.new(100,200,0,1))
Game = {
  GetPlayer=function() return _stubPlayer end,
  FindEntityByID=function(id) return _stubEntities[tostring(id and id.hash or id)] end,
  GetTeleportationFacility=function()
    return { Teleport=function(self,p,pos,rot) _stubTeleports=_stubTeleports+1; return true end }
  end,
  GetSystemRequestsHandler=function()
    return { IsPreGame=function() return false end, IsGamePaused=function() return false end }
  end,
  GetCameraSystem=function()
    return { GetActiveCameraWorldTransform=function(self,c) end }
  end,
  GetStaticEntitySystem=function() return nil end,
  AddToInventory=function() end
}
exEntitySpawner = {
  SpawnRecord=function(rec,tr,app) return _stubSpawn(rec) end,
  Spawn=function(path,tr,app) return _stubSpawn(path) end,
  Despawn=function(e) _stubDespawns=_stubDespawns+1 end
}
`;
let s0 = lauxlib.luaL_loadstring(L, enc(STUBS));
if (s0 !== lua.LUA_OK) { console.error('STUB LOAD ERROR', errMsg()); process.exit(1); }
if (lua.lua_pcall(L, 0, 0, 0) !== lua.LUA_OK) { console.error('STUB RUNTIME ERROR', errMsg()); process.exit(1); }

let st = lauxlib.luaL_loadstring(L, enc(src));
if (st !== lua.LUA_OK) { console.error('LOAD ERROR', errMsg()); process.exit(1); }
st = lua.lua_pcall(L, 0, 1, 0);
if (st !== lua.LUA_OK) { console.error('RUNTIME LOAD ERROR status=' + st + ' top=' + lua.lua_gettop(L) + ' ' + errMsg()); process.exit(1); }
// The module returns its MF table (a local in the file); expose it as a global for this harness.
lua.lua_setglobal(L, enc('MF'));
console.log('LUA module loaded OK · in-game input bindings:', Object.keys(inputRefs).length, '· hotkeys:', hotkeys.length);

function call(name, args) {
  const ref = handlers[name];
  if (!ref) { console.log('  no handler for', name); return; }
  lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, ref);
  (args || []).forEach(pushValue);
  const s = lua.lua_pcall(L, (args || []).length, 0, 0);
  if (s !== lua.LUA_OK) { console.error('HANDLER ERROR', name, 'status=' + s, errMsg()); process.exit(1); }
  if (!args) console.log('  handler', name, 'OK');
}
function press(slug, down) {
  const ref = inputRefs[slug];
  if (!ref) { console.error('MISSING INPUT BINDING', slug); process.exit(1); }
  lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, ref);
  lua.lua_pushboolean(L, down ? 1 : 0);
  const s = lua.lua_pcall(L, 1, 0, 0);
  if (s !== lua.LUA_OK) { console.error('INPUT ERROR', slug, errMsg()); process.exit(1); }
}
call('onInit');
// Open the overlay then exercise every ImGui tab.
lauxlib.luaL_loadstring(L, enc('MF.visible = true')); lua.lua_pcall(L, 0, 0, 0);
for (let tab = 1; tab <= 7; tab++) {
  lauxlib.luaL_loadstring(L, enc('MF.tab = ' + tab)); lua.lua_pcall(L, 0, 0, 0);
  call('onDraw');
}
call('hotkey');

// Exercise the IN-GAME PILOT: deploy, continuous input, per-frame update, undeploy.
press('mechfall_ig_deploy', true);
press('mechfall_ig_deploy', false);
call('onUpdate', [0.033]);
press('mechfall_ig_forward', true);
press('mechfall_ig_right', true);
for (let i = 0; i < 30; i++) call('onUpdate', [0.033]);
press('mechfall_ig_forward', false);
press('mechfall_ig_right', false);
press('mechfall_ig_jump', true); press('mechfall_ig_jump', false);
press('mechfall_ig_vent', true); press('mechfall_ig_vent', false);
press('mechfall_ig_camera', true); press('mechfall_ig_camera', false);
press('mechfall_ig_autodrive', true); press('mechfall_ig_autodrive', false);
press('mechfall_ig_fire', true); press('mechfall_ig_fire', false);
for (let i = 0; i < 10; i++) call('onUpdate', [0.033]);

const checks = [
  ['return #(MF.data.roster or {})', 'roster count'],
  ['return #MF.subsystems', 'subsystem templates'],
  ['return #MF.tabs', 'CET ImGui tabs'],
  ['local t=MF.compute("bt7274"); return string.format("%.2f|%.0f|%.2f|%.2f|%d",t.powerMargin,t.totalMass,t.rcsFront,t.jamStrength,#t.validation)', 'compute(bt7274)'],
  ['local t=MF.compute("my_frame_01"); return string.format("%.2f|%.0f",t.powerMargin,t.totalMass)', 'compute(custom)'],
  ['local r=MF.reactorModel(MF.reactor); return string.format("%.2f|%.3f",r.netOutput,r.instability)', 'reactorModel'],
  ['MF.optionalLinkShard(); MF.optionalRestartQuest(); MF.optionalTitanPoints(); return "hooks-ok"', 'optional hooks'],
  ['local c=MF.compatEncodeCoat(); return tostring(string.sub(c,1,5))', 'CCP1 share code'],
  ['local c=MF.compatParseCoat("CCP1;P=C81E3C;S=202024;L=200;N=Night Runner"); return tostring(c.primary).."|"..tostring(c.name)', 'parse CCP1 example'],
  ['MF.compatHandoffWaypoint(40,10); MF.compatSyncCrystalCoat(); MF.compatProbe(); return "compat-ok"', 'compat bridges'],
  ['return tostring(MF.ingame.spawner)', 'in-game spawner probe'],
  ['return tostring(MF.ingame.active) .. "|" .. tostring(MF.ingame.phantom) .. "|" .. tostring(#MF.ingame.parts)', 'in-game deploy state'],
  ['return tostring(MF.ingame.core ~= nil) .. "|" .. string.format("%.2f", MF.ingame.pos.x) .. "|" .. string.format("%.2f", MF.ingame.pos.z)', 'in-game core resolved + moved'],
  ['return tostring(_stubTeleports > 0) .. "|" .. tostring(_stubDespawns >= 0) .. "|" .. tostring(MF.ingame.cameraMode)', 'cockpit teleport + camera'],
  ['MF.ingame.spawnHostile(); local n=#MF.ingame.hostiles; local ok=MF.ingame.fire(); return tostring(n) .. "|" .. tostring(ok) .. "|" .. tostring(#MF.ingame.hostiles)', 'RCS hostile spawn + ECM/salvo lock break'],
  ['MF.ingame.setWaypoint(50,20); MF.ingame.cycleCamera(); MF.ingame.vent(); MF.ingame.jump(); return tostring(MF.ingame.waypoint.x)', 'in-game pilot actions'],
  ['MF.ingame.undeploy(); return tostring(MF.ingame.active) .. "|" .. tostring(_stubDespawns) .. "|" .. tostring(MF.ingame.status)', 'emergency undeploy despawns all'],
  ['return tostring(#MF.ingame.cfg.controls) .. "|" .. tostring(#MF.ingame.cfg.coreRecords) .. "|" .. tostring(#MF.ingame.cfg.partRecords)', 'generated in-game config'],
  ['return MF.ingame.patch .. "|" .. MF.ingame.cetVersion .. "|" .. MF.ingame.expectedCet .. "|" .. tostring(MF.ingame.patchInfo().red4ext)', 'patch 2.31 + CET version detection'],
  ['return tostring(#MF.ingame.records()) .. "|" .. tostring(MF.ingame.hasPL) .. "|" .. tostring(MF.ingame.hostileRec())', 'PL records skipped by default'],
  ['MF.ingame.setHasPL(true); local n=#MF.ingame.records(); local h=MF.ingame.hostileRec(); MF.ingame.setHasPL(false); return tostring(n).."|"..tostring(h)', 'PL enabled adds signature records'],
  ['MF.ingame.setPatch("2.5"); local p=MF.ingame.patch; MF.ingame.setPatch("2.31"); return tostring(p).."|"..tostring(MF.ingame.patch)', 'game patch switching'],
  ['return tostring(MF.data.models.onlyExamplesAllowed) .. "|" .. tostring(MF.data.models.allowedCount) .. "|" .. tostring(#MF.data.models.allowedSourceIds)', 'example-only full model policy in CET data']
];
for (const [code, label] of checks) {
  const s1 = lauxlib.luaL_loadstring(L, enc(code));
  if (s1 !== lua.LUA_OK) { console.error('COMPILE ERROR', label, errMsg()); process.exit(1); }
  const s2 = lua.lua_pcall(L, 0, 1, 0);
  if (s2 !== lua.LUA_OK) { console.error('RUNTIME ERROR', label, errMsg()); process.exit(1); }
  const t = lua.lua_type(L, -1);
  const out = t === lua.LUA_TNUMBER ? lua.lua_tonumber(L, -1) : errMsg();
  lua.lua_pop(L, 1);
  console.log('  ', label, '=>', out);
}
console.log('*** LUA RUNTIME TEST PASSED ***');
