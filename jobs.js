/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  const companies = [
    "ECorp", "MegaCorp", "Bachman & Associates", "NWO",
    "Clarke Incorporated", "OmniTek Incorporated", "Fulcrum Technologies"
  ];

  // Apply to all companies
  for (const company of companies) {
    if (ns.singularity.applyToCompany) {
      ns.singularity.applyToCompany(company, "Software");
    }
  }

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
    
    const player = ns.getPlayer();
    if (player.companyName) {
      // Already employed, work for company
      if (ns.singularity.workForCompany) {
        ns.singularity.workForCompany(player.companyName, false);
        updateRegistrySection(ns, "economy", {
          lastActivity: `job-${player.companyName}`
        });
        
        while (ns.singularity.isBusy && ns.singularity.isBusy()) {
          await ns.sleep(1000);
        }
      }
    } else {
      // Try to get a job
      for (const company of companies) {
        if (ns.singularity.applyToCompany) {
          ns.singularity.applyToCompany(company, "Software");
        }
        if (ns.singularity.workForCompany && ns.singularity.workForCompany(company, false)) {
          updateRegistrySection(ns, "economy", {
            lastActivity: `job-${company}`
          });
          break;
        }
      }
      await ns.sleep(5000);
    }
  }
}
