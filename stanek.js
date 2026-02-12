/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  // Check if stanek API exists
  if (!ns.stanek) {
    ns.print("Stanek not available");
    return;
  }
  
  ns.disableLog("ALL");
  
  // Check if we can access stanek functions
  if (!ns.stanek.activeFragments) {
    ns.print("Stanek API not fully available");
    return;
  }

  while (true) {
    try {
      // Get active fragments
      const frags = ns.stanek.activeFragments();
      
      if (!frags || frags.length === 0) {
        // No fragments placed yet, wait longer
        await ns.sleep(60000); // Check every minute
        continue;
      }
      
      let chargedCount = 0;
      let totalCharge = 0;
      
      // Charge each fragment
      for (const f of frags) {
        try {
          // Validate fragment
          if (!f || typeof f.id !== 'number' || f.id < 0 || f.id >= 100) {
            continue; // Skip invalid fragments
          }
          
          // Check if fragment exists at these coordinates
          if (typeof f.x !== 'number' || typeof f.y !== 'number') {
            continue;
          }
          
          // Try to charge the fragment
          const chargeResult = await ns.stanek.chargeFragment(f.x, f.y);
          
          if (chargeResult !== undefined && chargeResult !== null) {
            chargedCount++;
            totalCharge += chargeResult || 0;
          }
        } catch (e) {
          // Fragment might not be chargeable right now (cooldown, etc.)
          // Continue to next fragment
        }
      }
      
      // Update registry if we have fragments
      if (frags.length > 0) {
        try {
          updateRegistrySection(ns, "stanek", {
            active: true,
            fragmentCount: frags.length,
            chargedCount,
            totalCharge
          });
        } catch {}
      }
      
      // Charge frequently when fragments exist
      await ns.sleep(200);
    } catch (e) {
      // Stanek might not be initialized or available
      ns.print(`Error in stanek: ${e}`);
      await ns.sleep(10000); // Wait longer on error
    }
  }
}
