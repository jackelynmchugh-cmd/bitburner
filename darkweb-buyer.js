/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  const money = ns.getServerMoneyAvailable("home");
  
  // Buy TOR if needed
  if (!ns.getPlayer().tor) {
    if (money >= 500000 && ns.singularity.purchaseTor) {
      ns.singularity.purchaseTor();
    } else {
      return; // Can't buy TOR yet
    }
  }

  // Programs in priority order: Formulas first, then exploits, then scanners
  const programs = [
    "Formulas.exe",         // PRIORITY 1: Essential for accurate calculations
    "BruteSSH.exe",         // PRIORITY 2: Exploits
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
    "ServerProfiler.exe",   // PRIORITY 3: Scanners
    "DeepscanV1.exe",
    "DeepscanV2.exe",
    "AutoLink.exe",         // PRIORITY 4: Utility
    "DarkscapeNavigator.exe" // PRIORITY 5: Navigation
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
        // Buy one at a time, check money before next
        break;
      }
    }
  }
  
  updateRegistrySection(ns, "darkweb", {
    programsOwned: owned,
    formulas: ns.fileExists("Formulas.exe", "home"),
    exploits: [
      ns.fileExists("BruteSSH.exe", "home"),
      ns.fileExists("FTPCrack.exe", "home"),
      ns.fileExists("relaySMTP.exe", "home"),
      ns.fileExists("HTTPWorm.exe", "home"),
      ns.fileExists("SQLInject.exe", "home")
    ].filter(x => x).length
  });

  // One-shot: exit after purchase attempt
  if (!acted) return;
}