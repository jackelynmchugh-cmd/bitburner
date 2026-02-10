/**
 * Bitburner Master Brain Bootstrap Orchestrator
 *
 * Usage:
 * run master-brain.js
 *
 * Notes:
 * - This script orchestrates other scripts. It checks file existence before launch.
 * - Required companion script names are configurable in SCRIPT_MAP below.
 */

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();

  const cfg = createConfig();
  log(ns, "Master Brain starting...");

  await phaseV1(ns, cfg);
  await phaseV2(ns, cfg);
  await phaseV3(ns, cfg);
  await phaseV4(ns, cfg);
}

function createConfig() {
  return {
    pollMs: 2_000,
    timedJobWindowMs: 30 * 60 * 1_000,
    targets: ["n00dles", "foodnstuff", "joesguns"],
    homeReserveGb: 8,
    pservReservePct: 0.25,
    pservGoalV1: 16,
    pservGoalV2: 32,
    homeGoalGbV3: 512,
    bootstrapBatchCount: 25,
    scriptMap: {
      university: "university-hacking.js",
      crime: "crime-mug.js",
      autoroot: "autoroot.js",
      controller: "controller.js",
      runner: "runner.js",
      hack: "h.js",
      grow: "g.js",
      weaken: "w.js",
      pservBuyer: "pserv-buyer.js",
      buyTor: "buy-tor.js",
      backdoor: "backdoor.js",
      job: "jobs.js",
      darkwebBuyer: "darkweb-buyer.js",
      homeBuyer: "home-upgrader.js",
      faction: "faction-work.js",
      sleeves: "sleeves.js",
      stocks: "stocks.js",
      stanek: "stanek.js",
      augments: "augment-manager.js",
      darkwebDiscovery: "darkweb-discovery.js",
    },
  };
}

async function phaseV1(ns, cfg) {
  log(ns, "=== Bootstrap V1 ===");

  while (!(await allPservsAtLeast(ns, cfg.pservGoalV1))) {
    await runTimedOrUntilExit(ns, cfg.scriptMap.university, [], estimateStatWindowMs(ns, 25), "V1 university");
    await runTimedOrUntilExit(ns, cfg.scriptMap.crime, ["mug"], estimateStatWindowMs(ns, 25), "V1 crime");

    await runUntilIdle(ns, cfg.scriptMap.autoroot, [], "V1 autoroot");

    const controllerMs = estimateControllerWindowMs(ns, cfg.targets, cfg.bootstrapBatchCount);
    await runTimedOrUntilExit(
      ns,
      cfg.scriptMap.controller,
      [
        "--targets",
        ...cfg.targets,
        "--reserve-home",
        cfg.homeReserveGb,
        "--reserve-pserv-pct",
        cfg.pservReservePct,
        "--batches",
        cfg.bootstrapBatchCount,
      ],
      controllerMs,
      "V1 controller",
    );

    await runUntilIdle(ns, cfg.scriptMap.pservBuyer, ["--target-ram", cfg.pservGoalV1], "V1 pserv buyer");
    await runUntilIdle(ns, cfg.scriptMap.buyTor, [], "V1 buy tor");
    await runUntilIdle(ns, cfg.scriptMap.backdoor, [], "V1 backdoor");

    killKnownAutomation(ns, cfg, true);
    await ns.sleep(cfg.pollMs);
  }

  log(ns, "V1 complete. Handing off to V2.");
}

async function phaseV2(ns, cfg) {
  log(ns, "=== Bootstrap V2 ===");

  while (true) {
    await runTimedOrUntilExit(ns, cfg.scriptMap.job, [], cfg.timedJobWindowMs, "V2 jobs-1");

    const controllerMs = estimateControllerWindowMs(ns, cfg.targets, cfg.bootstrapBatchCount);
    await runTimedOrUntilExit(
      ns,
      cfg.scriptMap.controller,
      [
        "--targets",
        ...cfg.targets,
        "--reserve-home",
        cfg.homeReserveGb,
        "--reserve-pserv-pct",
        cfg.pservReservePct,
      ],
      controllerMs,
      "V2 controller-home",
    );

    await runUntilIdle(ns, cfg.scriptMap.autoroot, [], "V2 autoroot");
    await runUntilIdle(ns, cfg.scriptMap.darkwebBuyer, [], "V2 darkweb buyer");
    await runUntilIdle(ns, cfg.scriptMap.backdoor, [], "V2 backdoor");
    await runUntilIdle(ns, cfg.scriptMap.pservBuyer, ["--target-ram", cfg.pservGoalV2], "V2 pserv buyer");

    await deployCoreHgwToPservs(ns, cfg);

    const pservReady = await allPservsAtLeast(ns, cfg.pservGoalV2);
    const csecBackdoored = isBackdoored(ns, "CSEC");
    const controllerOnPserv = isScriptRunningAnywhere(ns, cfg.scriptMap.controller, "pserv-0");

    if (pservReady && csecBackdoored) {
      if (!controllerOnPserv) {
        await startControllerOnPserv0(ns, cfg);
      }
      log(ns, "V2 condition met: pserv=32GB+, CSEC backdoored, controller moved to pserv-0.");
      break;
    }

    await runTimedOrUntilExit(ns, cfg.scriptMap.job, [], cfg.timedJobWindowMs, "V2 jobs-2");

    if (!pservReady) {
      await runTimedOrUntilExit(
        ns,
        cfg.scriptMap.controller,
        [
          "--targets",
          ...cfg.targets,
          "--reserve-home",
          cfg.homeReserveGb,
          "--reserve-pserv-pct",
          cfg.pservReservePct,
        ],
        controllerMs,
        "V2 controller-home-fallback",
      );
    }

    killKnownAutomation(ns, cfg, false);
    await ns.sleep(cfg.pollMs);
  }

  log(ns, "V2 complete. Handing off to V3.");
}

async function phaseV3(ns, cfg) {
  log(ns, "=== Bootstrap V3 ===");

  while (ns.getServerMaxRam("home") < cfg.homeGoalGbV3) {
    await runUntilIdle(ns, cfg.scriptMap.homeBuyer, [], "V3 home buyer");
    await runTimedOrUntilExit(ns, cfg.scriptMap.job, [], cfg.timedJobWindowMs, "V3 jobs-1");
    await runUntilIdle(ns, cfg.scriptMap.autoroot, [], "V3 autoroot");
    await runUntilIdle(ns, cfg.scriptMap.darkwebBuyer, [], "V3 darkweb buyer");
    await runUntilIdle(ns, cfg.scriptMap.backdoor, [], "V3 backdoor");
    await runUntilIdle(ns, cfg.scriptMap.pservBuyer, [], "V3 pserv buyer");
    await runTimedOrUntilExit(ns, cfg.scriptMap.faction, [], cfg.timedJobWindowMs, "V3 faction");
    await runTimedOrUntilExit(ns, cfg.scriptMap.job, [], cfg.timedJobWindowMs, "V3 jobs-2");
    killKnownAutomation(ns, cfg, false);
    await ns.sleep(cfg.pollMs);
  }

  log(ns, "V3 complete. Handing off to V4.");
}

async function phaseV4(ns, cfg) {
  log(ns, "=== Bootstrap V4 ===");

  await startControllerOnPserv0(ns, cfg);

  while (true) {
    await runUntilIdle(ns, cfg.scriptMap.homeBuyer, [], "V4 home buyer");
    await runUntilIdle(ns, cfg.scriptMap.autoroot, [], "V4 autoroot");
    await runUntilIdle(ns, cfg.scriptMap.darkwebBuyer, [], "V4 darkweb buyer");
    await runUntilIdle(ns, cfg.scriptMap.backdoor, [], "V4 backdoor");
    await runUntilIdle(ns, cfg.scriptMap.pservBuyer, [], "V4 pserv buyer");

    await runTimedOrUntilExit(ns, cfg.scriptMap.job, [], cfg.timedJobWindowMs, "V4 jobs");
    await runTimedOrUntilExit(ns, cfg.scriptMap.faction, [], cfg.timedJobWindowMs, "V4 faction");

    await runBackgroundIfPresent(ns, cfg.scriptMap.sleeves, [], "V4 sleeves");
    await runBackgroundIfPresent(ns, cfg.scriptMap.stocks, [], "V4 stocks");
    await runBackgroundIfPresent(ns, cfg.scriptMap.stanek, [], "V4 stanek");
    await runBackgroundIfPresent(ns, cfg.scriptMap.augments, [], "V4 augments");

    await runDarkwebDiscoveryIfReady(ns, cfg);
    await deployCoreHgwToPservs(ns, cfg);

    // Keep controller on pserv-0 alive. Do not kill it in V4.
    if (!isScriptRunningAnywhere(ns, cfg.scriptMap.controller, "pserv-0")) {
      await startControllerOnPserv0(ns, cfg);
    }

    await ns.sleep(cfg.pollMs);
  }
}

async function runDarkwebDiscoveryIfReady(ns, cfg) {
  if (!ns.getPlayer().tor) return;
  await runUntilIdle(ns, cfg.scriptMap.darkwebDiscovery, [], "V4 darkweb discovery");
}

async function deployCoreHgwToPservs(ns, cfg) {
  const files = [cfg.scriptMap.controller, cfg.scriptMap.runner, cfg.scriptMap.hack, cfg.scriptMap.grow, cfg.scriptMap.weaken]
    .filter((f) => ns.fileExists(f, "home"));

  const pservs = ns.getPurchasedServers();
  for (const ps of pservs) {
    if (files.length > 0) ns.scp(files, ps, "home");
  }
}

async function startControllerOnPserv0(ns, cfg) {
  const host = ns.serverExists("pserv-0") ? "pserv-0" : "home";
  if (!ns.fileExists(cfg.scriptMap.controller, host)) {
    if (ns.fileExists(cfg.scriptMap.controller, "home") && host !== "home") {
      await ns.scp(cfg.scriptMap.controller, host, "home");
    } else {
      log(ns, `Cannot start controller. Missing ${cfg.scriptMap.controller}.`);
      return;
    }
  }

  const args = [
    "--targets",
    ...cfg.targets,
    "--reserve-home",
    cfg.homeReserveGb,
    "--reserve-pserv-pct",
    cfg.pservReservePct,
  ];

  if (!isScriptRunningAnywhere(ns, cfg.scriptMap.controller, host)) {
    const threads = maxThreadsForScript(ns, host, cfg.scriptMap.controller, host === "home" ? cfg.homeReserveGb : 0, cfg.pservReservePct);
    if (threads > 0) {
      const pid = ns.exec(cfg.scriptMap.controller, host, threads, ...args);
      if (pid === 0) {
        log(ns, `Failed starting controller on ${host}.`);
      } else {
        log(ns, `Controller started on ${host} pid=${pid}.`);
      }
    } else {
      log(ns, `Insufficient RAM to start controller on ${host}.`);
    }
  }
}

function maxThreadsForScript(ns, host, script, homeReserveGb, pservReservePct) {
  const maxRam = ns.getServerMaxRam(host);
  const usedRam = ns.getServerUsedRam(host);
  let freeRam = Math.max(0, maxRam - usedRam);

  if (host === "home") {
    freeRam = Math.max(0, freeRam - homeReserveGb);
  } else if (host.startsWith("pserv-")) {
    freeRam = Math.max(0, freeRam * (1 - pservReservePct));
  }

  const scriptRam = Math.max(0.1, ns.getScriptRam(script, host));
  return Math.floor(freeRam / scriptRam);
}

function killKnownAutomation(ns, cfg, includeController) {
  const scripts = [
    cfg.scriptMap.university,
    cfg.scriptMap.crime,
    cfg.scriptMap.autoroot,
    cfg.scriptMap.pservBuyer,
    cfg.scriptMap.buyTor,
    cfg.scriptMap.backdoor,
    cfg.scriptMap.job,
    cfg.scriptMap.darkwebBuyer,
    cfg.scriptMap.homeBuyer,
    cfg.scriptMap.faction,
    cfg.scriptMap.sleeves,
    cfg.scriptMap.stocks,
    cfg.scriptMap.stanek,
    cfg.scriptMap.augments,
    cfg.scriptMap.darkwebDiscovery,
  ];

  if (includeController) scripts.push(cfg.scriptMap.controller);

  const hosts = ["home", ...ns.getPurchasedServers()];
  for (const host of hosts) {
    for (const script of scripts) {
      if (ns.fileExists(script, host)) ns.scriptKill(script, host);
    }
  }
}

function isScriptRunningAnywhere(ns, script, preferredHost) {
  if (preferredHost && ns.isRunning(script, preferredHost)) return true;
  const hosts = ["home", ...ns.getPurchasedServers()];
  return hosts.some((h) => ns.isRunning(script, h));
}

async function runBackgroundIfPresent(ns, script, args, label) {
  if (!ns.fileExists(script, "home")) {
    log(ns, `${label}: script missing (${script}), skipping.`);
    return;
  }
  if (ns.isRunning(script, "home")) return;

  const threads = maxThreadsForScript(ns, "home", script, 8, 0.25);
  if (threads <= 0) {
    log(ns, `${label}: insufficient RAM, skipping for now.`);
    return;
  }

  const pid = ns.exec(script, "home", threads, ...args);
  if (pid === 0) log(ns, `${label}: failed to start.`);
}

async function runUntilIdle(ns, script, args, label) {
  if (!ns.fileExists(script, "home")) {
    log(ns, `${label}: script missing (${script}), skipping.`);
    return;
  }

  const threads = maxThreadsForScript(ns, "home", script, 0, 0);
  if (threads <= 0) {
    log(ns, `${label}: no RAM available, skipping.`);
    return;
  }

  const pid = ns.exec(script, "home", threads, ...args);
  if (pid === 0) {
    log(ns, `${label}: failed to launch.`);
    return;
  }

  while (ns.isRunning(pid)) {
    await ns.sleep(1_000);
  }

  ns.scriptKill(script, "home");
  log(ns, `${label}: completed/idle and killed.`);
}

async function runTimedOrUntilExit(ns, script, args, durationMs, label) {
  if (!ns.fileExists(script, "home")) {
    log(ns, `${label}: script missing (${script}), skipping.`);
    return;
  }

  const threads = maxThreadsForScript(ns, "home", script, 0, 0);
  if (threads <= 0) {
    log(ns, `${label}: no RAM available, skipping.`);
    return;
  }

  const pid = ns.exec(script, "home", threads, ...args);
  if (pid === 0) {
    log(ns, `${label}: failed to launch.`);
    return;
  }

  const start = Date.now();
  while (ns.isRunning(pid)) {
    if (Date.now() - start >= durationMs) {
      ns.kill(pid);
      log(ns, `${label}: time budget reached, killed.`);
      return;
    }
    await ns.sleep(1_000);
  }

  ns.scriptKill(script, "home");
  log(ns, `${label}: completed before timeout.`);
}

function estimateControllerWindowMs(ns, targets, batches) {
  let bestWeaken = Infinity;
  for (const t of targets) {
    if (!ns.serverExists(t)) continue;
    bestWeaken = Math.min(bestWeaken, ns.getWeakenTime(t));
  }

  if (!Number.isFinite(bestWeaken)) bestWeaken = 60_000;
  return Math.max(60_000, Math.floor(bestWeaken * batches));
}

function estimateStatWindowMs(ns, levelGain) {
  // Coarse heuristic intended to satisfy bootstrap scheduling without hard-coding singularity internals.
  const hack = ns.getHackingLevel();
  const base = 60_000;
  const scale = Math.max(1, levelGain / Math.max(1, hack / 10));
  return Math.floor(base * scale);
}

async function allPservsAtLeast(ns, sizeGb) {
  const limit = ns.getPurchasedServerLimit();
  const pservs = ns.getPurchasedServers();
  if (pservs.length < limit) return false;
  return pservs.every((h) => ns.getServerMaxRam(h) >= sizeGb);
}

function isBackdoored(ns, host) {
  if (!ns.serverExists(host)) return false;
  return ns.getServer(host).backdoorInstalled;
}

function log(ns, msg) {
  ns.print(`[MASTER] ${msg}`);
}
