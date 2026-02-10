** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const startedAt = Date.now();

  const cfg = {
    pollMs: 3000,
    targets: ["n00dles", "foodnstuff", "joesguns"],
    homeReserveGb: 8,
    pservReservePct: 0.25,
    phases: {
      EARLY_INFRA: "EARLY_INFRA",
      MID_INFRA: "MID_INFRA",
      HOME_SCALING: "HOME_SCALING",
      SINGULARITY: "SINGULARITY",
    },
    scripts: {
      observer: "observer.js",
      controller: "controller.js",
      autoroot: "autoroot.js",
      buyTor: "buy-tor.js",
      darkwebBuyer: "darkweb-buyer.js",
      darkwebDiscovery: "darkweb-discovery.js",
      backdoor: "backdoor.js",
      jobs: "jobs.js",
      factions: "faction-work.js",
      sleeves: "sleeves.js",
      stocks: "stocks.js",
      stanek: "stanek.js",
      augments: "augment-manager.js",
      pservBuyer: "pserv-buyer.js",
      homeUpgrader: "home-upgrade.js",
      university: "university-hacking.js",
      crime: "crime-mug.js",
    },
  };

  let lastPhase = "";
  let lastTransition = "BOOT";

  while (true) {
    const world = scanWorld(ns);
    const phase = derivePhase(cfg, world);

    if (phase !== lastPhase) {
      killManagedScripts(ns, cfg, true);
      logTransition(ns, lastPhase, phase);
      lastTransition = `${lastPhase || "BOOT"} -> ${phase}`;
      lastPhase = phase;
    }

    await ensureObserver(ns, cfg);
    await ensureController(ns, cfg, phase);
    await runPhaseWork(ns, cfg, phase);

    writeRegistry(ns, {
      meta: {
        ts: Date.now(),
        uptimeMs: Date.now() - startedAt,
      },
      bootstrap: {
        phase,
        transition: lastTransition,
        nextTransition: nextTransitionHint(phase),
      },
      infra: {
        homeRam: world.homeRam,
        homeCores: world.homeCores,
        torOwned: world.torOwned,
        pservs: world.pservs,
        backdoors: world.backdoors.length,
      },
      controller: {
        host: world.controllerHost,
        mode: world.controllerHost && world.controllerHost !== "home" ? "PSERV_ONLY" : "HOME_FALLBACK",
        targets: cfg.targets,
      },
      singularity: {
        unlocked: world.singularityUnlocked,
        factions: world.factions.length,
        augments: world.augments.length,
      },
      economy: {
        cash: ns.getServerMoneyAvailable("home"),
      },
    });

    await maybeInstallAugments(ns, cfg, phase);
    await ns.sleep(cfg.pollMs);
  }
}

function scanWorld(ns) {
  const pservs = ns.cloud.getServerNames();
  const pservRams = pservs.map((h) => ns.getServerMaxRam(h));
  const backdoors = scanAll(ns).filter((h) => ns.getServer(h).backdoorInstalled);

  return {
    torOwned: ns.getPlayer().tor,
    darkwebPrograms: [
      "BruteSSH.exe",
      "FTPCrack.exe",
      "relaySMTP.exe",
      "HTTPWorm.exe",
      "SQLInject.exe",
      "ServerProfiler.exe",
      "DeepscanV1.exe",
      "DeepscanV2.exe",
      "AutoLink.exe",
      "Formulas.exe",
    ].filter((f) => ns.fileExists(f, "home")),
    homeRam: ns.getServerMaxRam("home"),
    homeCores: ns.getServer("home").cpuCores,
    pservs: {
      count: pservs.length,
      minRam: pservRams.length > 0 ? Math.min(...pservRams) : 0,
      maxRam: pservRams.length > 0 ? Math.max(...pservRams) : 0,
      limit: ns.cloud.getServerLimit(),
    },
    backdoors,
    csecBackdoored: ns.serverExists("CSEC") ? ns.getServer("CSEC").backdoorInstalled : false,
    factions: ns.getPlayer().factions,
    augments: ns.singularity?.getOwnedAugmentations ? ns.singularity.getOwnedAugmentations(true) : [],
    bitnode: ns.getResetInfo ? ns.getResetInfo().currentNode : null,
    singularityUnlocked: Boolean(ns.singularity?.getOwnedAugmentations),
    controllerHost: findRunningScript(ns, "controller.js"),
  };
}

function derivePhase(cfg, world) {
  if (!world.singularityUnlocked) return cfg.phases.EARLY_INFRA;
  const pservsReadyForMidExit = world.pservs.count >= world.pservs.limit && world.pservs.minRam >= 32;
  const controllerOnPserv = Boolean(world.controllerHost) && world.controllerHost !== "home";
  if (!pservsReadyForMidExit || !world.csecBackdoored || !controllerOnPserv) return cfg.phases.MID_INFRA;
  if (world.homeRam < 512) return cfg.phases.HOME_SCALING;
  return cfg.phases.SINGULARITY;
}

async function runPhaseWork(ns, cfg, phase) {
  if (phase === cfg.phases.EARLY_INFRA) {
    runIfMissing(ns, cfg.scripts.autoroot);
    runIfMissing(ns, cfg.scripts.buyTor);
    runIfMissing(ns, cfg.scripts.university, [15]);
    runIfMissing(ns, cfg.scripts.crime, ["Mug someone", 10]);
    runIfMissing(ns, cfg.scripts.pservBuyer, [16]);
    return;
  }

  if (phase === cfg.phases.MID_INFRA) {
    runIfMissing(ns, cfg.scripts.autoroot);
    runIfMissing(ns, cfg.scripts.darkwebBuyer);
    runIfMissing(ns, cfg.scripts.backdoor);
    runIfMissing(ns, cfg.scripts.jobs);
    runIfMissing(ns, cfg.scripts.factions);
    runIfMissing(ns, cfg.scripts.pservBuyer, [32]);
    return;
  }

  if (phase === cfg.phases.HOME_SCALING) {
    runIfMissing(ns, cfg.scripts.autoroot);
    runIfMissing(ns, cfg.scripts.darkwebBuyer);
    runIfMissing(ns, cfg.scripts.backdoor);
    runIfMissing(ns, cfg.scripts.jobs);
    runIfMissing(ns, cfg.scripts.factions);
    runIfMissing(ns, cfg.scripts.homeUpgrader);
    return;
  }

  if (phase === cfg.phases.SINGULARITY) {
    runIfMissing(ns, cfg.scripts.autoroot);
    runIfMissing(ns, cfg.scripts.darkwebDiscovery);
    runIfMissing(ns, cfg.scripts.backdoor);
    runIfMissing(ns, cfg.scripts.jobs);
    runIfMissing(ns, cfg.scripts.factions);
    runIfMissing(ns, cfg.scripts.sleeves);
    runIfMissing(ns, cfg.scripts.stocks);
    runIfMissing(ns, cfg.scripts.stanek);
    runIfMissing(ns, cfg.scripts.augments);
  }
}

async function ensureObserver(ns, cfg) {
  if (ns.isRunning(cfg.scripts.observer, "home")) return;
  ns.exec(cfg.scripts.observer, "home", 1);
}

async function ensureController(ns, cfg, phase) {
  const desiredHost = getDesiredControllerHost(ns, phase);
  const script = cfg.scripts.controller;
  const runningHost = findRunningScript(ns, script);

  if (runningHost === desiredHost) return;
  if (runningHost) ns.scriptKill(script, runningHost);

  if (!ns.fileExists(script, desiredHost)) {
    await ns.scp([script, "runner.js"], desiredHost, "home");
  }

  ns.exec(
    script,
    desiredHost,
    1,
    "--targets",
    ...cfg.targets,
    "--reserve-home",
    String(cfg.homeReserveGb),
    "--reserve-pserv-pct",
    String(cfg.pservReservePct),
  );
}

function getDesiredControllerHost(ns, phase) {
  if (phase === "EARLY_INFRA") return "home";
  const pservs = ns.cloud.getServerNames();
  return pservs.length > 0 ? pservs[0] : "home";
}

async function maybeInstallAugments(ns, cfg, phase) {
  if (phase !== cfg.phases.SINGULARITY) return;
  if (!ns.singularity?.installAugmentations || !ns.singularity?.getOwnedAugmentations) return;

  const owned = ns.singularity.getOwnedAugmentations(true);
  const pending = ns.singularity.getOwnedAugmentations(false);
  if (owned.length === pending.length) return;

  killManagedScripts(ns, cfg, false);
  const host = findRunningScript(ns, cfg.scripts.controller);
  if (host) ns.scriptKill(cfg.scripts.controller, host);
  ns.singularity.installAugmentations("master-brain.js");
}

function runIfMissing(ns, script, args = []) {
  if (!ns.fileExists(script, "home")) return;
  if (!ns.isRunning(script, "home")) ns.exec(script, "home", 1, ...args);
}


function findRunningScript(ns, script) {
  for (const host of ["home", ...ns.cloud.getServerNames()]) {
    if (ns.isRunning(script, host)) return host;
  }
  return "";
}

function killManagedScripts(ns, cfg, includeController) {
  const scripts = Object.values(cfg.scripts).filter((s) => includeController || s !== cfg.scripts.controller);
  for (const host of ["home", ...ns.cloud.getServerNames()]) {
    for (const script of scripts) ns.scriptKill(script, host);
  }
}

function scanAll(ns) {
  const seen = new Set(["home"]);
  const queue = ["home"];
  while (queue.length) {
    const host = queue.shift();
    for (const next of ns.scan(host)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return [...seen];
}

function nextTransitionHint(phase) {
  if (phase === "EARLY_INFRA") return "All pservs >= 16GB";
  if (phase === "MID_INFRA") return "All pservs >= 32GB + CSEC backdoor + controller on pserv";
  if (phase === "HOME_SCALING") return "Home RAM >= 512GB";
  return "Augment install readiness";
}

function logTransition(ns, from, to) {
  ns.print(`[TRANSITION] ${from || "BOOT"} -> ${to}`);
}

function writeRegistry(ns, payload) {
  ns.write("/data/registry.txt", JSON.stringify(payload, null, 2), "w");
}
