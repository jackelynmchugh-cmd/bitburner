function killManagedScripts(ns, cfg, newPhase, oldPhase) {
  // Never kill controller or observer
  const protectedScripts = [cfg.scripts.controller, cfg.scripts.observer, cfg.scripts.autoroot];
  
  // Determine which scripts to kill based on phase transition
  const scriptsToKill = [];
  
  if (newPhase === cfg.phases.BOOT) {
    // Kill everything except observer, autoroot, controller
    scriptsToKill.push(
      cfg.scripts.factions, cfg.scripts.jobs, cfg.scripts.university,
      cfg.scripts.stocks, cfg.scripts.backdoor, cfg.scripts.darkwebBuyer,
      cfg.scripts.darkwebDiscovery, cfg.scripts.augments, cfg.scripts.stanek,
      cfg.scripts.pservBuyer, cfg.scripts.homeUpgrader, cfg.scripts.sleeves
    );
  }
  
  // Kill rotation scripts on phase change
  scriptsToKill.push(
    cfg.scripts.crime, cfg.scripts.factions, cfg.scripts.jobs, cfg.scripts.university
  );
  
  for (const script of scriptsToKill) {
    if (script && !protectedScripts.includes(script) && isScriptRunning(ns, script)) {
      ns.kill(script, "home");
      // Also kill on pservs if needed
      const pservs = ns.cloud ? ns.cloud.getServerNames() : [];
      for (const pserv of pservs) {
        if (ns.isRunning(script, pserv)) {
          ns.kill(script, pserv);
        }
      }
    }
  }
}