/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const cfg = parseArgs(ns.args);
  let batchesDone = 0;

  while (cfg.batches <= 0 || batchesDone < cfg.batches) {
    const hosts = discoverWorkers(ns, cfg.homeReserve, cfg.pservReservePct);
    if (hosts.length === 0) {
      await ns.sleep(2_000);
      continue;
    }

    const target = chooseTarget(ns, cfg.targets);
    if (!target) {
      await ns.sleep(2_000);
      continue;
    }

    const action = chooseAction(ns, target);
    for (const host of hosts) {
      const script = action === "hack" ? "h.js" : action === "grow" ? "g.js" : "w.js";
      if (!ns.fileExists(script, host)) {
        if (host !== "home" && ns.fileExists(script, "home")) await ns.scp(script, host, "home");
      }
      const ram = ns.getScriptRam(script, host);
      const free = usableRam(ns, host, cfg.homeReserve, cfg.pservReservePct);
      const threads = Math.floor(free / Math.max(0.1, ram));
      if (threads <= 0) continue;
      ns.exec(script, host, threads, target, 0);
    }

    batchesDone += 1;
    await ns.sleep(2_000);
  }
}

function parseArgs(args) {
  const cfg = { targets: ["n00dles", "foodnstuff", "joesguns"], homeReserve: 8, pservReservePct: 0.25, batches: 0 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--targets") {
      cfg.targets = [];
      while (i + 1 < args.length && !String(args[i + 1]).startsWith("--")) cfg.targets.push(String(args[++i]));
    } else if (a === "--reserve-home") cfg.homeReserve = Number(args[++i] ?? cfg.homeReserve);
    else if (a === "--reserve-pserv-pct") cfg.pservReservePct = Number(args[++i] ?? cfg.pservReservePct);
    else if (a === "--batches") cfg.batches = Number(args[++i] ?? cfg.batches);
  }
  return cfg;
}

function discoverWorkers(ns, homeReserve, pservReservePct) {
  const hosts = ["home", ...ns.getPurchasedServers()].filter((h) => ns.hasRootAccess(h) && usableRam(ns, h, homeReserve, pservReservePct) > 1.75);
  return hosts.sort((a, b) => Number(b.startsWith("pserv-")) - Number(a.startsWith("pserv-")));
}

function usableRam(ns, host, homeReserve, pservReservePct) {
  let free = Math.max(0, ns.getServerMaxRam(host) - ns.getServerUsedRam(host));
  if (host === "home") free = Math.max(0, free - homeReserve);
  else if (host.startsWith("pserv-")) free *= 1 - pservReservePct;
  return free;
}

function chooseTarget(ns, targets) {
  let best = null;
  let bestScore = -1;
  for (const t of targets) {
    if (!ns.serverExists(t) || !ns.hasRootAccess(t)) continue;
    if (ns.getServerRequiredHackingLevel(t) > ns.getHackingLevel()) continue;
    const score = ns.getServerMaxMoney(t) / Math.max(1, ns.getWeakenTime(t));
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function chooseAction(ns, target) {
  const minSec = ns.getServerMinSecurityLevel(target);
  const sec = ns.getServerSecurityLevel(target);
  const money = ns.getServerMoneyAvailable(target);
  const maxMoney = ns.getServerMaxMoney(target);
  if (sec > minSec + 3) return "weaken";
  if (money < maxMoney * 0.9) return "grow";
  return "hack";
}
