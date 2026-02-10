/** @param {NS} ns **/
export async function main(ns) {
  const targetRam = Number(ns.args[0] ?? ns.args[1] ?? 0);
  const limit = ns.getPurchasedServerLimit();

  while (true) {
    let acted = false;
    const pservs = ns.getPurchasedServers();

    while (pservs.length < limit) {
      const nextRam = targetRam > 0 ? targetRam : 8;
      const cost = ns.getPurchasedServerCost(nextRam);
      if (ns.getServerMoneyAvailable("home") < cost) break;
      const name = `pserv-${pservs.length}`;
      if (ns.purchaseServer(name, nextRam)) {
        pservs.push(name);
        acted = true;
      } else break;
    }

    for (const host of ns.getPurchasedServers()) {
      const cur = ns.getServerMaxRam(host);
      const desired = targetRam > 0 ? targetRam : cur * 2;
      if (desired <= cur) continue;
      const cost = ns.getPurchasedServerUpgradeCost(host, desired);
      if (Number.isFinite(cost) && ns.getServerMoneyAvailable("home") >= cost) {
        if (ns.upgradePurchasedServer(host, desired)) acted = true;
      }
    }

    if (!acted) return;
    await ns.sleep(200);
  }
}
