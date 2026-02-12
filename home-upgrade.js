/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }

  ns.disableLog("ALL");

  // Optional: only run when cheap (e.g. FOUNDATION phase)
  if (ns.args.includes("--cheap-only")) {
    const money = ns.getServerMoneyAvailable("home");
    if (money < 100000) return;
  }

  let acted = false;

  // Prioritize home RAM over cores: buy all RAM upgrades first, then cores.
  while (ns.singularity.upgradeHomeRam && ns.singularity.upgradeHomeRam()) {
    acted = true;
  }
  while (ns.singularity.upgradeHomeCores && ns.singularity.upgradeHomeCores()) {
    acted = true;
  }

  if (acted) {
    const home = ns.getServer("home");
    updateRegistrySection(ns, "infra", {
      home: {
        ram: home.maxRam,
        cores: home.cpuCores
      }
    });
  }

  // One-shot: exit after this pass (master will re-launch if needed)
}
