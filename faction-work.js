/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";
import { prioritizeFactionsForWork, checkFactionRequirements } from "./faction-requirements.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");

  // Join any pending invitations (after checking requirements)
  if (ns.singularity.checkFactionInvitations) {
    const invitations = ns.singularity.checkFactionInvitations();
    for (const faction of invitations) {
      // Check if we meet requirements before joining
      const check = checkFactionRequirements(ns, faction);
      if (check.met) {
        ns.singularity.joinFaction(faction);
        ns.print(`Joined faction: ${faction}`);
      } else {
        ns.print(`Cannot join ${faction}: ${check.reason}`);
      }
    }
  }

  const joined = ns.getPlayer().factions || [];
  if (joined.length === 0) {
    ns.print("No factions joined");
    return;
  }

  // Prioritize factions for work
  const prioritizedFactions = prioritizeFactionsForWork(ns, joined);

  while (true) {
    // Check if we should stop (rotation timeout)
    try {
      const reg = ns.read("/data/registry.txt");
      if (reg) {
        const registry = JSON.parse(reg);
        const rotationTimeout = registry.rotation?.timeout || 0;
        const rotationWindow = 5 * 60 * 1000; // 5 minutes
        if (rotationTimeout > 0 && Date.now() - rotationTimeout >= rotationWindow) {
          return;
        }
      }
    } catch {}
    
    let worked = false;
    
    // Work for factions in priority order
    for (const faction of prioritizedFactions) {
      if (!ns.singularity.workForFaction) break;
      
      // Check if we still meet requirements (in case of conflicts)
      const check = checkFactionRequirements(ns, faction);
      if (!check.met) {
        ns.print(`Lost access to ${faction}: ${check.reason}`);
        continue;
      }
      
      // Try hacking work first (best rep)
      if (ns.singularity.workForFaction(faction, "hacking", false)) {
        updateRegistrySection(ns, "singularity", {
          currentFaction: faction,
          currentWork: "hacking"
        });
        updateRegistrySection(ns, "economy", {
          lastActivity: `faction-${faction}`
        });
        worked = true;
        break;
      }
      
      // Fallback to field work
      if (ns.singularity.workForFaction(faction, "field", false)) {
        updateRegistrySection(ns, "singularity", {
          currentFaction: faction,
          currentWork: "field"
        });
        updateRegistrySection(ns, "economy", {
          lastActivity: `faction-${faction}`
        });
        worked = true;
        break;
      }
      
      // Fallback to security work
      if (ns.singularity.workForFaction(faction, "security", false)) {
        updateRegistrySection(ns, "singularity", {
          currentFaction: faction,
          currentWork: "security"
        });
        updateRegistrySection(ns, "economy", {
          lastActivity: `faction-${faction}`
        });
        worked = true;
        break;
      }
    }
    
    if (!worked) {
      await ns.sleep(5000);
    } else {
      // Wait while busy
      while (ns.singularity.isBusy && ns.singularity.isBusy()) {
        await ns.sleep(1000);
      }
    }
  }
}
