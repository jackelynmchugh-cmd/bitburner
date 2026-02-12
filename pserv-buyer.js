/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.cloud) {
    ns.print("Cloud API not available");
    return;
  }

  ns.disableLog("ALL");

  const START_RAM = 8; // Start purchasing at 8GB per server
  const limit = ns.cloud.getServerLimit(); // Max servers we can own

  while (true) {
    let acted = false;
    const money = ns.getServerMoneyAvailable("home");
    let pservs = ns.cloud.getServerNames();

    // --- 1) Fill empty slots with new 8GB servers ---
    while (pservs.length < limit) {
      const cost = (ns.cloud.getPurchaseServerCost || ns.cloud.getServerCost)(START_RAM);
      if (money < cost) break;

      const name = `pserv-${pservs.length}`;
      const host = ns.cloud.purchaseServer(name, START_RAM);
      if (!host) break;

      pservs = ns.cloud.getServerNames();
      acted = true;
    }

    // --- 2) Scale up: replace lowest-RAM server with a bigger one ---
    if (pservs.length === limit && pservs.length > 0) {
      const rams = pservs.map((h) => ({ host: h, ram: ns.getServerMaxRam(h) }));
      rams.sort((a, b) => a.ram - b.ram);
      const lowest = rams[0];
      const maxRam = ns.cloud.getRamLimit ? ns.cloud.getRamLimit() : 2 ** 20;
      const nextRam = Math.min(lowest.ram * 2, maxRam);
      if (nextRam > lowest.ram) {
        const costNew = (ns.cloud.getPurchaseServerCost || ns.cloud.getServerCost)(nextRam);
        if (money >= costNew) {
          ns.cloud.deleteServer(lowest.host);
          const freeIndex = getFirstFreeIndex(ns);
          const name = freeIndex !== undefined ? `pserv-${freeIndex}` : `pserv-${ns.cloud.getServerNames().length}`;
          const host = ns.cloud.purchaseServer(name, nextRam);
          if (host) {
            acted = true;
            pservs = ns.cloud.getServerNames();
          }
        }
      }
    }

    // --- 3) In-place upgrades: upgrade smallest servers when we can't replace yet ---
    pservs = ns.cloud.getServerNames();
    const rams = pservs.map((h) => ({ host: h, ram: ns.getServerMaxRam(h) }));
    rams.sort((a, b) => a.ram - b.ram);

    const maxRam = ns.cloud.getRamLimit ? ns.cloud.getRamLimit() : 2 ** 20;
    for (const { host, ram } of rams) {
      const desiredRam = Math.min(ram * 2, maxRam);
      if (desiredRam <= ram) continue;

      const cost = ns.cloud.getUpgradeServerCost(host, desiredRam);
      if (!Number.isFinite(cost) || money < cost) continue;

      if (ns.cloud.upgradeServer(host, desiredRam)) {
        acted = true;
        break; // One upgrade per tick to avoid spending all money in one go
      }
    }

    const updated = ns.cloud.getServerNames();
    let minRam = Infinity;
    let maxRamFound = 0;
    for (const h of updated) {
      const r = ns.getServerMaxRam(h);
      minRam = Math.min(minRam, r);
      maxRamFound = Math.max(maxRamFound, r);
    }

    updateRegistrySection(ns, "infra", {
      pservs: {
        count: updated.length,
        minRam: minRam === Infinity ? 0 : minRam,
        maxRam: maxRamFound,
        limit
      }
    });

    if (!acted) {
      await ns.sleep(5000);
    } else {
      await ns.sleep(200);
    }
  }
}

function getFirstFreeIndex(ns) {
  const names = ns.cloud.getServerNames();
  const used = new Set(names.map((n) => parseInt(n.replace("pserv-", ""), 10)));
  const limit = ns.cloud.getServerLimit();
  for (let i = 0; i < limit; i++) {
    if (!used.has(i)) return i;
  }
  return undefined;
