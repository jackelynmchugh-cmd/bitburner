/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  const player = ns.getPlayer();
  
  // Grafting is done at VitaLife in New Tokyo
  if (player.city !== "New Tokyo") {
    ns.print("Must be in New Tokyo for grafting");
    return;
  }
  
  // Check if we're at VitaLife (would need to travel there)
  // For now, we'll assume the script is run when at VitaLife
  
  const money = ns.getServerMoneyAvailable("home");
  const ownedAugs = ns.singularity.getOwnedAugmentations(true);
  
  // Get available augmentations from factions
  const availableAugs = [];
  
  if (player.factions && player.factions.length > 0) {
    for (const faction of player.factions) {
      try {
        const augs = ns.singularity.getAugmentationsFromFaction(faction);
        const rep = ns.singularity.getFactionRep(faction);
        
        for (const aug of augs) {
          // Skip NeuroFlux Governor
          if (aug === "NeuroFlux Governor") continue;
          
          // Skip if already owned
          if (ownedAugs.includes(aug)) continue;
          
          const repReq = ns.singularity.getAugmentationRepReq(aug);
          const cost = ns.singularity.getAugmentationPrice(aug);
          
          // Check if we can graft this augmentation
          if (rep >= repReq && money >= cost) {
            // Check if grafting is available for this aug
            if (ns.singularity.getGraftingAvailable && ns.singularity.getGraftingAvailable(aug)) {
              availableAugs.push({
                name: aug,
                faction: faction,
                cost: cost,
                rep: rep,
                repReq: repReq
              });
            }
          }
        }
      } catch {}
    }
  }
  
  if (availableAugs.length === 0) {
    ns.print("No augmentations available for grafting");
    return;
  }
  
  // Sort by cost (cheapest first) or by priority
  availableAugs.sort((a, b) => a.cost - b.cost);
  
  // Graft augmentations one at a time
  // Warning: Grafting takes time and money, and Entropy virus grows with each graft
  for (const aug of availableAugs) {
    try {
      if (ns.singularity.graftAugmentation) {
        const cost = ns.singularity.getAugmentationPrice(aug.name);
        const currentMoney = ns.getServerMoneyAvailable("home");
        
        if (currentMoney >= cost) {
          // Use ns.format.number instead of ns.formatNumber (3.0.0 change)
          const formattedCost = ns.format?.number ? ns.format.number(cost) : `$${cost.toLocaleString()}`;
          ns.print(`Starting graft of ${aug.name} (cost: ${formattedCost})`);
          
          // Start grafting (this is async and takes time)
          const result = ns.singularity.graftAugmentation(aug.name, true); // true = focus
          
          if (result) {
            ns.print(`Grafting started for ${aug.name}`);
            updateRegistrySection(ns, "grafting", {
              active: aug.name,
              startTime: Date.now(),
              cost: cost
            });
            
            // Wait for grafting to complete (or check status)
            // Note: Grafting takes time, so we might want to check status periodically
            break; // One graft at a time
          }
        }
      }
    } catch (e) {
      ns.print(`Error grafting ${aug.name}: ${e}`);
    }
  }
  
  // Check grafting status if one is in progress
  if (ns.singularity.getGraftingTimeLeft) {
    const timeLeft = ns.singularity.getGraftingTimeLeft();
    if (timeLeft > 0) {
      // Use ns.format.number instead of ns.formatNumber (3.0.0 change)
      const formattedTime = ns.format?.number ? ns.format.number(timeLeft) : timeLeft.toLocaleString();
      ns.print(`Grafting in progress, ${formattedTime}ms remaining`);
    }
  }
}
