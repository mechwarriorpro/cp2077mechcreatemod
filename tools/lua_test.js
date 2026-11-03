const fs = require('fs');
const path = require('path');
const luaparse = require('luaparse');
const F = require('fengari');
const { lua, lauxlib, lualib } = F;
const enc = F.to_luastring;
const dec = (L, idx) => F.to_jsstring(lua.lua_tolstring ? lua.lua_tostring(L, idx) : lua.lua_tostring(L, idx));
const LUA_PATH = path.join(__dirname, '..', 'cet_mod/bin/x64/plugins/cyber_engine_tweaks/mods/mechfall_forge/init.lua');
const src = fs.readFileSync(LUA_PATH, 'utf8');
try { luaparse.parse(src, { luaVersion: '5.3' }); console.log('LUA PARSE OK ·', src.length, 'bytes'); }
catch (e) { console.error('LUA PARSE FAILED:', e.message); process.exit(1); }
if (/__MF_GENERATED_DATA__/.test(src)) { console.error('stale generated-data marker'); process.exit(1); }
let L;
function errMsg() {
  const t = lua.lua_type(L,-1);
  if (t === lua.LUA_TSTRING) { try { return F.to_jsstring(lua.lua_tostring(L,-1)); } catch(e) { return '<str>'; } }
  return '<non-string error type ' + t + '>';
}
L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);

const handlers = {};
function pushValue(v) {
  if (v === null || v === undefined) lua.lua_pushnil(L);
  else if (typeof v === 'boolean') lua.lua_pushboolean(L, v ? 1 : 0);
  else if (typeof v === 'number') lua.lua_pushnumber(L, v);
  else if (typeof v === 'string') lua.lua_pushstring(L, enc(v));
  else if (Array.isArray(v)) { lua.lua_newtable(L); v.forEach((x,i)=>{ pushValue(x); lua.lua_rawseti(L,-2,i+1); }); }
  else { lua.lua_newtable(L); Object.keys(v).forEach(k=>{ lua.lua_pushstring(L,enc(k)); pushValue(v[k]); lua.lua_rawset(L,-3); }); }
}
function readArg(Lf, i) {
  const t = lua.lua_type(Lf,i);
  if (t===lua.LUA_TNUMBER) return lua.lua_tonumber(Lf,i);
  if (t===lua.LUA_TBOOLEAN) return !!lua.lua_toboolean(Lf,i);
  if (t===lua.LUA_TSTRING) return F.to_jsstring(lua.lua_tostring(Lf,i));
  return {luaType:t};
}
function cfn(n, fn) {
  return function(Lf) {
    const top = lua.lua_gettop(Lf), args=[];
    for (let i=1;i<=top;i++) args.push(readArg(Lf,i));
    let res = fn(args, Lf) || [];
    if (!Array.isArray(res)) res=[res];
    res.slice(0,n).forEach(pushValue);
    return Math.min(n, res.length);
  };
}
function setGlobal(name, n, fn) { lua.lua_pushcfunction(L, cfn(n, fn)); lua.lua_setglobal(L, enc(name)); }

setGlobal('registerForEvent', 0, (a, Lf) => {
  if (lua.lua_type(Lf,2) === lua.LUA_TFUNCTION) {
    lua.lua_pushvalue(Lf,2);
    handlers[a[0]] = lauxlib.luaL_ref(Lf, lua.LUA_REGISTRYINDEX);
  }
});
setGlobal('registerHotkey', 0, (a, Lf) => {
  if (lua.lua_type(Lf,3) === lua.LUA_TFUNCTION) { lua.lua_pushvalue(Lf,3); handlers.hotkey = lauxlib.luaL_ref(Lf, lua.LUA_REGISTRYINDEX); }
});
setGlobal('GetMod', 1, () => null);

const im = {};
const rets = { Begin:1, BeginChild:1, Button:1, Selectable:1, Checkbox:2, SliderFloat:2, SliderInt:2, Combo:2,
  End:0, EndChild:0, Separator:0, SameLine:0, Text:0, TextWrapped:0, TextColored:0, ProgressBar:0 };
Object.keys(rets).forEach(k => {
  im[k] = () => {
    if (k==='Begin'||k==='BeginChild') return [true];
    if (k==='Button'||k==='Selectable') return [false];
    if (k==='Checkbox') return [false,false];
    if (k==='SliderFloat'||k==='SliderInt') return [1,false];
    if (k==='Combo') return [0,false];
    return [];
  };
});
lua.lua_newtable(L);
Object.keys(im).forEach(k => {
  lua.lua_pushstring(L,enc(k));
  lua.lua_pushcfunction(L, cfn(rets[k], im[k]));
  lua.lua_rawset(L,-3);
});
lua.lua_setglobal(L, enc('ImGui'));
lua.lua_newtable(L); lua.lua_setglobal(L, enc('Game'));

let st = lauxlib.luaL_loadstring(L, enc(src));
if (st !== lua.LUA_OK) { console.error('LOAD ERROR', errMsg()); process.exit(1); }
st = lua.lua_pcall(L,0,1,0);
if (st !== lua.LUA_OK) { console.error('RUNTIME LOAD ERROR status=' + st + ' top=' + lua.lua_gettop(L) + ' ' + errMsg()); process.exit(1); }
// The module returns its MF table (a local in the file); expose it as a global for this harness.
lua.lua_setglobal(L, enc('MF'));
console.log('LUA module loaded OK');

function call(name) {
  const ref = handlers[name];
  if (!ref) { console.log('  no handler for', name); return; }
  lua.lua_rawgeti(L, lua.LUA_REGISTRYINDEX, ref);
  const s = lua.lua_pcall(L, 0, 0, 0);
  if (s !== lua.LUA_OK) { console.error('HANDLER ERROR', name, 'status=' + s, errMsg()); process.exit(1); }
  console.log('  handler', name, 'OK');
}
call('onInit');
// Open the overlay then exercise every ImGui tab.
lauxlib.luaL_loadstring(L, enc('MF.visible = true')); lua.lua_pcall(L,0,0,0);
for (let tab=1; tab<=5; tab++) {
  lauxlib.luaL_loadstring(L, enc('MF.tab = ' + tab)); lua.lua_pcall(L,0,0,0);
  call('onDraw');
}
call('hotkey');

const checks = [
  ['return #(MF.data.roster or {})', 'roster count'],
  ['return #MF.subsystems', 'subsystem templates'],
  ['local t=MF.compute("bt7274"); return string.format("%.2f|%.0f|%.2f|%.2f|%d",t.powerMargin,t.totalMass,t.rcsFront,t.jamStrength,#t.validation)', 'compute(bt7274)'],
  ['local t=MF.compute("my_frame_01"); return string.format("%.2f|%.0f",t.powerMargin,t.totalMass)', 'compute(custom)'],
  ['local r=MF.reactorModel(MF.reactor); return string.format("%.2f|%.3f",r.netOutput,r.instability)', 'reactorModel'],
  ['MF.optionalLinkShard(); MF.optionalRestartQuest(); MF.optionalTitanPoints(); return "hooks-ok"', 'optional hooks']
];
for (const [code,label] of checks) {
  const s1 = lauxlib.luaL_loadstring(L, enc(code));
  if (s1 !== lua.LUA_OK) { console.error('COMPILE ERROR', label, errMsg()); process.exit(1); }
  const s2 = lua.lua_pcall(L,0,1,0);
  if (s2 !== lua.LUA_OK) { console.error('RUNTIME ERROR', label, errMsg()); process.exit(1); }
  const t = lua.lua_type(L,-1);
  const out = t===lua.LUA_TNUMBER ? lua.lua_tonumber(L,-1) : errMsg();
  lua.lua_pop(L,1);
  console.log('  ', label, '=>', out);
}
console.log('*** LUA RUNTIME TEST PASSED ***');
