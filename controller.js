/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const cfg = parseArgs(ns.args);

  while (true) {
    const target = chooseTarget(ns, cfg.targets);
    if (!target) {
      await ns.sleep(2000);
      continue;
    }

    const workers = discoverWorkers(ns, cfg.homeReserve, cfg.pservReservePct);
    if (workers.length === 0) {
      await ns.sleep(2000);
      continue;
    }

    const batch = planBatch(ns, target);
    if (!batch) {
      await ns.sleep(2000);
      continue;
    }

    scheduleBatch(ns, workers, target, batch, cfg);

    await ns.sleep(batch.batchTime + 200);
  }
}

/* ================= BATCH LOGIC ================= */

function planBatch(ns, target) {
  const maxMoney = ns.getServerMaxMoney(target);
  if (maxMoney <= 0) return null;

  const hackFrac = 0.1;
  const hackThreads = Math.max(1, Math.floor(hackFrac / ns.hackAnalyze(target)));
  const growThreads = Math.ceil(ns.growthAnalyze(target, 1 / (1 - hackFrac)));

  const weakenPerThread = ns.weakenAnalyze(1);
  const secFromHack = ns.hackAnalyzeSecurity(hackThreads, target);
  const secFromGrow = ns.growthAnalyzeSecurity(growThreads, target);

  const weaken1 = Math.ceil(secFromHack / weakenPerThread);
  const weaken2 = Math.ceil(secFromGrow / weakenPerThread);

  const tHack = ns.getHackTime(target);
  const tGrow = ns.getGrowTime(target);
  const tWeaken = ns.getWeakenTime(target);

  const gap = 200;

  return {
    hackThreads,
    growThreads,
    weaken1,
    weaken2,
    delays: {
      weaken1: 0,
      grow: tWeaken - tGrow + gap,
      hack: tWeaken - tHack + gap * 2,
      weaken2: gap * 3,
    },
    batchTime: tWeaken + gap * 4,
  };
}

function scheduleBatch(ns, hosts, target, batch, cfg) {
  let i = 0;

  function exec(action, threads, delay) {
    let remaining = threads;
    for (const host of hosts) {
      if (remaining <= 0) return;

      const ram = ns.getScriptRam("runner.js", host);
      const free = usableRam(ns, host, cfg.homeReserve, cfg.pservReservePct);
      const maxThreads = Math.floor(free / ram);
      if (maxThreads <= 0) continue;

      const run = Math.min(maxThreads, remaining);
      ns.exec("runner.js", host, run, action, target, delay);
      remaining -= run;
    }
  }

  exec("weaken", batch.weaken1, batch.delays.weaken1);
  exec("grow", batch.growThreads, batch.delays.grow);
  exec("hack", batch.hackThreads, batch.delays.hack);
  exec("weaken", batch.weaken2, batch.delays.weaken2);
}

/* ================= HELPERS ================= */

function discoverWorkers(ns, homeReserve, pservReservePct) {
  return ["home", ...ns.cloud.getServerNames()].filter(
    h => ns.hasRootAccess(h) && usableRam(ns, h, homeReserve, pservReservePct) > 2
  );
}

function usableRam(ns, host, homeReserve, pservReservePct) {
  let free = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
  if (host === "home") free -= homeReserve;
  else free *= 1 - pservReservePct;
  return Math.max(0, free);
}

function chooseTarget(ns, targets) {
  let best = null;
  let bestScore = 0;

  for (const t of targets) {
    if (!ns.serverExists(t)) continue;
    if (!ns.hasRootAccess(t)) continue;
    if (ns.getServerRequiredHackingLevel(t) > ns.getHackingLevel()) continue;

    const score = ns.getServerMaxMoney(t) / ns.getWeakenTime(t);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function parseArgs(args) {
  const cfg = {
    targets: ["n00dles", "foodnstuff", "joesguns"],
    homeReserve: 8,
    pservReservePct: 0.25,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--targets") {
      cfg.targets = [];
      while (args[i + 1] && !String(args[i + 1]).startsWith("--")) {
        cfg.targets.push(String(args[++i]));
      }
    } else if (args[i] === "--reserve-home") {
      cfg.homeReserve = Number(args[++i]);
    } else if (args[i] === "--reserve-pserv-pct") {
      cfg.pservReservePct = Number(args[++i]);
    }
  }
  return cfg;
}
