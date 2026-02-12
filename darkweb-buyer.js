/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  const money = ns.getServerMoneyAvailable("home");
  
  // Buy TOR if needed (only if money >= 500k in BOOT phase)
  if (!ns.getPlayer().tor) {
    if (money >= 500000 && ns.singularity.purchaseTor) {
      ns.singularity.purchaseTor();
    } else {
      return; // Can't buy TOR yet
    }
  }

  const programs = [
    "BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe",
    "ServerProfiler.exe", "DeepscanV1.exe", "DeepscanV2.exe", "AutoLink.exe",
    "Formulas.exe", "DarkscapeNavigator.exe"
  ];

  let acted = false;
  const owned = [];

  for (const prog of programs) {
    if (ns.fileExists(prog, "home")) {
      owned.push(prog);
      continue;
    }
    
    if (ns.singularity.purchaseProgram) {
      if (ns.singularity.purchaseProgram(prog)) {
        owned.push(prog);
        acted = true;
      }
    }
  }
  
  updateRegistrySection(ns, "darkweb", {
    programsOwned: owned
  });

  // One-shot: exit after purchase attempt
  if (!acted) return;
}
