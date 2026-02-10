/** @param {NS} ns **/
export async function main(ns) {
  const targetRam = Number(ns.args[0] ?? 0);
  const limit = ns.cloud.getServerLimit();

  while (true) {
    let acted = false;
    const pservs = ns.cloud.getServerNames();

    while (pservs.length < limit) {
      const nextRam = Math.max(2, targetRam || 8);
      const cost = ns.cloud.getPurchaseServerCost(nextRam);
      if (ns.getServerMoneyAvailable("home") < cost) break;

      const name = `pserv-${pservs.length}`;
      const host = ns.cloud.purchaseServer(name, nextRam);
      if (!host) break;

      pservs.push(host);
      acted = true;
    }

    for (const host of ns.cloud.getServerNames()) {
      const curRam = ns.getServerMaxRam(host);
      const desiredRam = targetRam > 0 ? targetRam : curRam * 2;
      if (desiredRam <= curRam) continue;

      const cost = ns.cloud.getUpgradeServerCost(host, desiredRam);
      if (!Number.isFinite(cost) || ns.getServerMoneyAvailable("home") < cost) continue;

      if (ns.cloud.upgradeServer(host, desiredRam)) acted = true;
    }

    if (!acted) return;
    await ns.sleep(200);
  }
}
