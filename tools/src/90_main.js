/* Boot + animation loop. */

(function boot() {
  MF.syncReactorSubsystem();
  /* Rebuild per-part damage after ALL modules (incl. MF.weapons) are loaded. */
  if (MF.damage && MF.damage.ensure) MF.damage.ensure(true);
  if (!MF.tabs[MF.state.tab]) MF.state.tab = "systems";
  // Render every tab lazily on first visit; the initial tab is rendered now.
  MF.refresh();
  if (MF.state.tab === "combat") MF.combat.onEnter();
  if (MF.state.tab === "pilot" && MF.pilot) MF.pilot.onEnter();
  if (MF.state.tab === "models" && MF.models) MF.models.onEnter();
  MF.toast("FORGE 77 online · INTERNAL SYSTEMS LAB is the emphasis — author a subsystem, then build your frame.", "ok");

  let lastTick = 0, resizeTimer = null;
  function frame(ts) {
    if (ts - lastTick > 100) {           // ~10 Hz reactor lab integration
      MF.reactorLab.tick();
      lastTick = ts;
    }
    MF.combat.loop(ts);
    if (MF.pilot && MF.pilot.loop) MF.pilot.loop(ts);
    if (window.requestAnimationFrame) window.requestAnimationFrame(frame);
    else setTimeout(() => frame(ts + 16), 16);
  }
  if (window.requestAnimationFrame) window.requestAnimationFrame(frame);
  else setTimeout(() => frame(0), 16);

  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const t = MF.tabs[MF.state.tab];
      if (t && t.update) t.update($("tab-" + MF.state.tab));
    }, 120);
  });

  // Small convenience for automated smoke tests / power users.
  MF.health = function () {
    const t = MF.sim.compute(MF.activeDesign());
    return {
      tabs: Object.keys(MF.tabs), data: Object.keys(DATA),
      design: MF.activeDesign().name, subsystems: MF.state.subsystems.length,
      installed: MF.state.installed.length, powerMargin: t.powerMargin,
      totalMass: t.totalMass, netHeat: t.netHeat, rcsFront: t.rcsFront,
      jamStrength: t.jamStrength, validation: t.validation.map((v) => v.code)
    };
  };
})();
