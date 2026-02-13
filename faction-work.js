/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";
import { prioritizeFactionsForWork, checkFactionRequirements } from "./faction-requirements.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");

  // Join any pending invitations
  if (ns.singularity.checkFactionInvitations) {
    const invitations = ns.singularity.checkFactionInvitations();
    for (const faction of invitations) {
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

  const prioritized = prioritizeFactionsForWork(ns, joined);

  while (true) {
    try {
      const reg = ns.read("/data/registry.txt");
      if (reg) {
        const registry = JSON.parse(reg);
        const rotationTimeout = registry.rotation?.timeout || 0;
        const rotationWindow = 5 * 60 * 1000;
        if (rotationTimeout > 0 && Date.now() - rotationTimeout >= rotationWindow) {
          return;
        }
      }
    } catch {}
    
    let worked = false;
    
    for (const faction of prioritized) {
      if (!ns.singularity.workForFaction) break;
      
      const check = checkFactionRequirements(ns, faction);
      if (!check.met) {
        ns.print(`Lost access to ${faction}: ${check.reason}`);
        continue;
      }
      
      // Determine best work type based on player stats
      const player = ns.getPlayer();
      const workType = selectBestWorkType(ns, faction, player);
      
      if (workType && ns.singularity.workForFaction(faction, workType, false)) {
        updateRegistrySection(ns, "singularity", {
          currentFaction: faction,
          currentWork: workType
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
      while (ns.singularity.isBusy?.()) {
        await ns.sleep(1000);
      }
    }
  }
}

function selectBestWorkType(ns, faction, player) {
  // Different factions benefit from different work types
  const factionFocus = {
    // Hacking-focused
    "CyberSec": "hacking",
    "Netburners": "hacking",
    "Tian Di Hui": "hacking",
    "NiteSec": "hacking",
    "The Black Hand": "hacking",
    "BitRunners": "hacking",
    
    // Combat-focused
    "Slum Snakes": "field",
    "Tetrads": "field",
    "Silhouette": "field",
    "Speakers for the Dead": "field",
    "The Dark Army": "field",
    "The Syndicate": "field",
    
    // Balanced
    "Aevum": "field",
    "Chongqing": "field",
    "New Tokyo": "field",
    "Ishima": "field",
    "Sector-12": "field",
    "Volhaven": "field"
  };
  
  const focus = factionFocus[faction] || "hacking";
  
  // If player is heavily specialized one way, might be better to do opposite work
  // (lower base = faster gains)
  const hackAdvantage = player.hacking / (player.strength + 1);
  
  if (hackAdvantage > 5 && focus === "field") {
    // Your field work will level faster due to lower base
    return "field";
  } else if (hackAdvantage < 0.5 && focus === "hacking") {
    // Your hacking work will level faster
    return "hacking";
  }
  
  return focus;
}