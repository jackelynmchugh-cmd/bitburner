/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const cfg = parseArgs(ns.args);

  while (true) {
    const target = chooseTarget(ns, cfg.targets);
    if (!target || !isHackable(ns, target)) {
      await ns.sleep(2000); continue;
    }

    const workers = discoverWorkers(ns, cfg.homeReserve, cfg.pservReservePct);
    if (workers.length === 0) { await ns.sleep(2000); continue; }

    const batch = planBatch(ns, target);
    if (!batch) { await ns.sleep(2000); continue; }

    scheduleBatch(ns, workers, target, batch, cfg);
    await ns.sleep(batch.batchTime + 200);
  }
}

function isHackable(ns, target) {
  return ns.serverExists(target) &&
         ns.hasRootAccess(target) &&
         ns.getServerRequiredHackingLevel(target) <= ns.getHackingLevel() &&
         ns.getServerMaxMoney(target) > 0;
}
// rest of your original batch logic stays (planBatch, scheduleBatch, etc.)
