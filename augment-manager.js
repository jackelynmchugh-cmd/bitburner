/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";
import { checkFactionRequirements } from "./faction-requirements.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  const mode = ns.args.includes("--install") ? "install" : 
               ns.args.includes("--monitor") ? "monitor" : "purchase";
  
  // Join any pending invitations (check requirements first)
  if (ns.singularity.checkFactionInvitations) {
    const invitations = ns.singularity.checkFactionInvitations();
    for (const faction of invitations) {
      const check = checkFactionRequirements(ns, faction);
      if (check.met) {
        ns.singularity.joinFaction(faction);
      }
    }
  }

  const money = ns.getServerMoneyAvailable("home");
  const ownedAugs = ns.singularity.getOwnedAugmentations(true);
  
  if (mode === "install") {
    // ASCENSION mode: install and reset
    const installable = ns.singularity.getOwnedAugmentations(false).filter(a => 
      !ownedAugs.includes(a)
    );
    
    if (installable.length >= 2) {
      ns.singularity.installAugmentations("master-brain.js");
      // Script will exit here, game will reset
    }
    return;
  }
  
  if (mode === "monitor") {
    // EXPANSION mode: passive monitor, only run if home >= 512GB
    const home = ns.getServer("home");
    if (home.maxRam < 512) {
      return; // Not ready yet
    }
    
    // Just check and purchase, don't loop
    mode = "purchase";
  }
  
  // Purchase mode: buy available augments
  for (const faction of ns.getPlayer().factions || []) {
    const augs = ns.singularity.getAugmentationsFromFaction(faction);
    
    for (const aug of augs) {
      if (aug === "NeuroFlux Governor") continue; // Skip NeuroFlux
      if (ownedAugs.includes(aug)) continue;
      
      const rep = ns.singularity.getFactionRep(faction);
      const repReq = ns.singularity.getAugmentationRepReq(aug);
      const cost = ns.singularity.getAugmentationPrice(aug);
      
      if (rep >= repReq && cost <= money) {
        ns.singularity.purchaseAugmentation(faction, aug);
      }
    }
  }
  
  // One-shot: exit after purchase attempt
}
