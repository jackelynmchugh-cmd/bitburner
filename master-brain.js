/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const startedAt = Date.now();

  const cfg = {
    pollMs: 3000,
    targets: ["n00dles", "foodnstuff", "joesguns"],
    homeReserveGb: 8,
    pservReservePct: 0.25,
    phases: { EARLY_INFRA: "EARLY_INFRA", MID_INFRA: "MID_INFRA", HOME_SCALING: "HOME_SCALING", SINGULARITY: "SINGULARITY" },
    scripts: {
      observer: "observer.js", controller: "controller.js", autoroot: "autoroot.js",
      buyTor: "buy-tor.js", darkwebBuyer: "darkweb-buyer.js", darkwebDiscovery: "darkweb-discovery.js",
      backdoor: "backdoor.js", jobs: "jobs.js", factions: "faction-work.js",
      sleeves: "sleeves.js", stocks: "stocks.js", stanek: "stanek.js",
      augments: "augment-manager.js", pservBuyer: "pserv-buyer.js",
      homeUpgrader: "home-upgrade.js", university: "university-hacking.js",
      crime: "crime-mug.js"
    },
    singularityRotation: ["jobs", "factions", "stocks", "sleeves", "stanek"] // cycles in phase 4
  };

  let lastPhase = "";
  let rotationIndex = 0;
  let lastRotation = Date.now();

  while (true) {
    const world = scanWorld(ns);
    const phase = derivePhase(cfg, world);

    if (phase !== lastPhase) {
      killManagedScripts(ns, cfg, false); // Do NOT kill controller on phase change
      ns.print(`[TRANSITION] ${lastPhase || "BOOT"} → ${phase}`);
      lastPhase = phase;
    }

    await ensureObserver(ns, cfg);
    await ensureController(ns, cfg, phase);
    await runPhaseWork(ns, cfg, phase, world, () => { rotationIndex = (rotationIndex + 1) % cfg.singularityRotation.length; });

    writeRegistry(ns, { meta: { ts: Date.now(), uptimeMs: Date.now() - startedAt }, bootstrap: { phase, transition: `${lastPhase} → ${phase}` } /* ... more fields as before */ });

    if (phase === cfg.phases.SINGULARITY && Date.now() - lastRotation > 1800000) { // 30 min rotation
      lastRotation = Date.now();
    }

    await maybeInstallAugments(ns, cfg, phase);
    await ns.sleep(cfg.pollMs);
  }
}

// (rest of helper functions from original + updates for persistence)
function killManagedScripts(ns, cfg, includeController = false) { /* ... */ }
// ... (full helpers as in your original, but controller protected)
