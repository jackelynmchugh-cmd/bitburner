/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  const gain = Number(ns.args[0] ?? 25);
  const start = ns.getHackingLevel();
  const target = start + gain;
  
  const classType = ns.enums?.UniversityClassType?.ALGORITHMS ?? "Algorithms";

  while (ns.getHackingLevel() < target) {
    // Check if we should stop (rotation timeout or insufficient money)
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
      
      // Check money requirement (5M minimum)
      const player = ns.getPlayer();
      if (player.money < 5000000) {
        return;
      }
    } catch {}
    
    if (ns.singularity.universityCourse) {
      ns.singularity.universityCourse("Rothman University", classType, false);
      updateRegistrySection(ns, "economy", {
        lastActivity: "university"
      });
    }
    
    await ns.sleep(30000);
  }
  
  updateRegistrySection(ns, "economy", {
    lastActivity: "university-complete"
  });
}
