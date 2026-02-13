/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns){
  if(!ns.singularity) return;
  
  ns.disableLog("ALL");
  
  const installMode = ns.args.includes("--install");
  const monitorMode = ns.args.includes("--monitor");
  
  while(true) {
    try {
      const owned = ns.singularity.getOwnedAugmentations(true);
      const ready = ns.singularity.getOwnedAugmentations(false)
        .filter(a => !owned.includes(a));
      
      if(ready.length === 0) {
        await ns.sleep(10000);
        continue;
      }
      
      // Calculate total cost and priority
      let totalCost = 0;
      let priorityScore = 0;
      
      for(const aug of ready) {
        try {
          const cost = ns.singularity.getAugmentationPrice(aug);
          totalCost += cost;
          priorityScore += scoreAugmentation(aug);
        } catch {}
      }
      
      const money = ns.getServerMoneyAvailable("home");
      const canAfford = money >= totalCost;
      
      // Only install if explicitly in install mode, have money, and good score
      const shouldInstall = installMode && canAfford && priorityScore >= 10;
      
      updateRegistrySection(ns, "augments", {
        ready: ready.length,
        owned: owned.length,
        totalCost,
        canAfford,
        money,
        priorityScore
      });
      
      if(shouldInstall) {
        ns.print(`Installing ${ready.length} augmentations (score: ${priorityScore}, cost: $${totalCost.toLocaleString()})`);
        ns.singularity.installAugmentations("master-brain.js");
        return; // Script exits after install
      }
      
      await ns.sleep(10000);
    } catch(e) {
      ns.print(`Error in augment-manager: ${e}`);
      await ns.sleep(10000);
    }
  }
}

function scoreAugmentation(aug) {
  const highPriority = [
    "NeuroFlux Governor",
    "The Red Pill",
    "QLink",
    "Argo Chitlin",
    "BitRunner",
    "Cranial Signal Processing"
  ];
  
  const mediumPriority = [
    "Enhanced Hacking Ability",
    "Hacking Speed-Up",
    "Neuroreceptor Management Implant",
    "Hypersensitive Pheromone Detection"
  ];
  
  if (highPriority.some(p => aug.includes(p))) return 5;
  if (mediumPriority.some(p => aug.includes(p))) return 3;
  return 1;
}