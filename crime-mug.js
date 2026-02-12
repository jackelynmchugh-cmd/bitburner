/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  // Use exact enum value - no fuzzy matching in 3.0.0
  const crime = ns.enums?.CrimeType?.Mug ?? "Mug";
  const gain = Number(ns.args[0] ?? 25);
  const p = ns.getPlayer();
  const base = {
    strength: p.strength,
    defense: p.defense,
    dexterity: p.dexterity,
    agility: p.agility,
  };

  while (true) {
    // Check if we should stop (rotation timeout)
    try {
      const reg = ns.read("/data/registry.txt");
      if (reg) {
        const registry = JSON.parse(reg);
        const rotationTimeout = registry.rotation?.timeout || 0;
        const rotationWindow = 5 * 60 * 1000; // 5 minutes
        if (rotationTimeout > 0 && Date.now() - rotationTimeout >= rotationWindow) {
          // Rotation window expired, exit cleanly
          return;
        }
      }
    } catch {}
    
    const cur = ns.getPlayer();
    const done =
      cur.strength >= base.strength + gain &&
      cur.defense >= base.defense + gain &&
      cur.dexterity >= base.dexterity + gain &&
      cur.agility >= base.agility + gain;
    
    if (done) {
      updateRegistrySection(ns, "economy", {
        lastActivity: "crime-complete"
      });
      return;
    }

    if (ns.singularity.commitCrime) {
      ns.singularity.commitCrime(crime, false);
      updateRegistrySection(ns, "economy", {
        lastActivity: "crime"
      });
      
      while (ns.singularity.isBusy()) {
        await ns.sleep(1000);
      }
    } else {
      await ns.sleep(10000);
    }
  }
}
