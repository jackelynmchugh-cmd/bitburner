/**
 * Master Brain Orchestrator
 * Reset-aware, non-stalling, auto-migrating controller
 * Bitburner 3.0.0 compliant
 */

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  initTelemetry(ns);
  const cfg = createConfig();

  updateStatus(ns, {
    phase: "BOOT",
    action: "Initializing",
    detail: "Master Brain startup",
  });

  while (true) {
    await reconcileState(ns, cfg);
    await ensureControllerPlacement(ns, cfg);

    await phaseV1(ns, cfg);
    await phaseV2(ns, cfg);
    await phaseV3(ns, cfg);
    await phaseV4(ns, cfg);

    await ns.sleep(cfg.pollMs);
  }
}

/* ===================== CONFIG ===================== */

function createConfig() {
  return {
    pollMs: 2000,
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

/* ===================== CONTROLLER MIGRATION ===================== */

function getDesiredControllerHost(ns) {
  const pservs = ns.cloud.getServerNames();
  return pservs.length > 0 ? pservs[0] : "home";
}

async function ensureControllerPlacement(ns, cfg) {
  const desiredHost = getDesiredControllerHost(ns);
  const controller = cfg.scriptMap.controller;

  const runningHost = findRunningScript(ns, controller);
  if (runningHost === desiredHost) return;

  // Kill old instance if running elsewhere
  if (runningHost) {
    ns.scriptKill(controller, runningHost);
  }

  // Copy if needed
  if (!ns.fileExists(controller, desiredHost)) {
    await ns.scp(controller, desiredHost, "home");
  }

  // Start controller
  const pid = ns.exec(
    controller,
    desiredHost,
    1,
    "--targets",
    ...cfg.targets
  );

  if (pid) {
    updateStatus(ns, {
      last: `Controller migrated to ${desiredHost}`,
    });
  }
}

function findRunningScript(ns, script) {
  for (const h of ["home", ...ns.cloud.getServerNames()]) {
    if (ns.isRunning(script, h)) return h;
  }
  return null;
}

/* ===================== RESET AWARENESS ===================== */

function detectReset(ns) {
  if (ns.getServerMoneyAvailable("home") < 1_000_000) return true;
  if (ns.getHackingLevel() < 10) return true;
  if (ns.cloud.getServerNames().length === 0) return true;
  return false;
}

async function reconcileState(ns, cfg) {
  if (!detectReset(ns)) return;

  updateStatus(ns, {
    phase: "RESET",
    action: "Reinitializing",
    detail: "Detected reset – clearing stale state",
    error: "",
  });

  killKnownAutomation(ns, cfg, true);
  await ns.sleep(2000);
}

/* ===================== TELEMETRY ===================== */

const STATUS = {
  phase: "",
  action: "",
  detail: "",
  last: "",
  error: "",
  since: Date.now(),
  moneySamples: [],
};

function initTelemetry(ns) {
  STATUS.moneySamples.push({
    t: Date.now(),
    m: ns.getServerMoneyAvailable("home"),
  });
}

function updateStatus(ns, patch = {}) {
  Object.assign(STATUS, patch);
  STATUS.since = Date.now();
  renderStatus(ns);
}

function recordMoney(ns) {
  STATUS.moneySamples.push({
    t: Date.now(),
    m: ns.getServerMoneyAvailable("home"),
  });
  if (STATUS.moneySamples.length > 20) STATUS.moneySamples.shift();
}

function moneyPerSecond() {
  if (STATUS.moneySamples.length < 2) return 0;
  const a = STATUS.moneySamples[0];
  const b = STATUS.moneySamples.at(-1);
  const dt = (b.t - a.t) / 1000;
  return dt > 0 ? (b.m - a.m) / dt : 0;
}

function renderStatus(ns) {
  ns.clearLog();
  recordMoney(ns);

  const pservs = ns.cloud.getServerNames();
  const controllerHost = findRunningScript(ns, "controller.js");

  ns.print("========= MASTER BRAIN =========");
  ns.print(`Phase      : ${STATUS.phase}`);
  ns.print(`Action     : ${STATUS.action}`);
  ns.print(`Detail     : ${STATUS.detail}`);
  if (STATUS.last) ns.print(`Last       : ${STATUS.last}`);
  if (STATUS.error) ns.print(`ERROR      : ${STATUS.error}`);
  ns.print("--------------------------------");
  ns.print(`Controller : ${controllerHost ? `RUNNING (${controllerHost})` : "STOPPED"}`);
  ns.print(`Pservs     : ${pservs.length}/${ns.cloud.getServerLimit()}`);
  ns.print(`Home RAM   : ${ns.getServerMaxRam("home")}GB`);
  ns.print(`Income     : ${moneyPerSecond().toFixed(0)} $/sec`);
  ns.print(`Heartbeat  : ${Math.floor((Date.now() - STATUS.since) / 1000)}s`);
  ns.print("================================");
}

/* ===================== PHASES ===================== */

async function phaseV1(ns, cfg) {
  if (await allPservsAtLeast(ns, cfg.pservGoalV1)) return;

  updateStatus(ns, { phase: "V1", action: "Bootstrap", detail: "Early game" });

  await runTimed(ns, cfg.scriptMap.university, [], 60000, "University");
  await runTimed(ns, cfg.scriptMap.crime, ["mug"], 60000, "Crime");
  await runIdle(ns, cfg.scriptMap.autoroot, "Autoroot");
  await runIdle(ns, cfg.scriptMap.pservBuyer, "Pserv Buyer");
}

async function phaseV2(ns, cfg) {
  if (await allPservsAtLeast(ns, cfg.pservGoalV2)) return;

  updateStatus(ns, { phase: "V2", action: "Expansion", detail: "Scaling servers" });

  await runIdle(ns, cfg.scriptMap.autoroot, "Autoroot");
  await runIdle(ns, cfg.scriptMap.darkwebBuyer, "Darkweb");
  await runIdle(ns, cfg.scriptMap.backdoor, "Backdoor");
  await runIdle(ns, cfg.scriptMap.pservBuyer, "Pserv Upgrade");
}

async function phaseV3(ns, cfg) {
  if (ns.getServerMaxRam("home") >= cfg.homeGoalGbV3) return;

  updateStatus(ns, { phase: "V3", action: "Home Scaling", detail: "Upgrading home RAM" });

  const upgraded = await runIdle(ns, cfg.scriptMap.homeBuyer, "Home Upgrade");

  if (!upgraded) {
    await runTimed(
      ns,
      cfg.scriptMap.controller,
      ["--targets", ...cfg.targets, "--batches", 10],
      60000,
      "Controller funding"
    );
  }
}

async function phaseV4(ns, cfg) {
  updateStatus(ns, { phase: "V4", action: "Endgame", detail: "Steady state" });
  await runIdle(ns, cfg.scriptMap.autoroot, "Autoroot");
  await runIdle(ns, cfg.scriptMap.darkwebDiscovery, "Darkweb Scan");
}

/* ===================== EXEC HELPERS ===================== */

async function runIdle(ns, script, label) {
  if (!ns.fileExists(script, "home")) return false;
  const pid = ns.exec(script, "home", 1);
  if (!pid) return false;
  while (ns.isRunning(pid)) await ns.sleep(1000);
  return true;
}

async function runTimed(ns, script, args, ms, label) {
  if (!ns.fileExists(script, "home")) return false;
  const pid = ns.exec(script, "home", 1, ...args);
  if (!pid) return false;

  const start = Date.now();
  while (ns.isRunning(pid)) {
    if (Date.now() - start > ms) {
      ns.kill(pid);
      return true;
    }
    await ns.sleep(1000);
  }
  return true;
}

/* ===================== UTILS ===================== */

async function allPservsAtLeast(ns, sizeGb) {
  const pservs = ns.cloud.getServerNames();
  if (pservs.length < ns.cloud.getServerLimit()) return false;
  return pservs.every(h => ns.getServerMaxRam(h) >= sizeGb);
}

function killKnownAutomation(ns, cfg, includeController) {
  const scripts = Object.values(cfg.scriptMap);
  if (!includeController) scripts.splice(scripts.indexOf(cfg.scriptMap.controller), 1);

  for (const host of ["home", ...ns.cloud.getServerNames()]) {
    for (const script of scripts) ns.scriptKill(script, host);
  }
}
