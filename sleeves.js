/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  // Check if sleeves API exists
  if (!ns.sleeve) {
    ns.print("Sleeves not available");
    return;
  }
  
  ns.disableLog("ALL");
  
  // Check if we can get sleeve count
  let sleeveCount = 0;
  try {
    if (ns.sleeve.getNumSleeves) {
      sleeveCount = ns.sleeve.getNumSleeves();
    }
  } catch (e) {
    ns.print("Cannot access sleeves API");
    return;
  }
  
  if (sleeveCount === 0) {
    ns.print("No sleeves available");
    return;
  }

  // Try to purchase more sleeves from The Covenant (only available in BitNode 10)
  // Sleeves can be purchased up to 5 permanent ones from The Covenant
  // Also obtained by destroying BitNodes (1 per completion)
  const money = ns.getServerMoneyAvailable("home");
  if (ns.sleeve.purchaseSleeve) {
    try {
      // Check if we can purchase (need to be in BitNode 10 and have The Covenant faction)
      const player = ns.getPlayer();
      const hasCovenant = player.factions && player.factions.includes("The Covenant");
      
      // Try to purchase sleeves (up to 5 from Covenant, max 8 total)
      // Note: purchaseSleeve() will return false if conditions aren't met
      if (hasCovenant && sleeveCount < 8) {
        const cost = ns.sleeve.getSleevePurchaseCost ? ns.sleeve.getSleevePurchaseCost() : 0;
        if (cost > 0 && money >= cost) {
          if (ns.sleeve.purchaseSleeve()) {
            sleeveCount++;
            ns.print(`Purchased sleeve ${sleeveCount} from The Covenant`);
          }
        }
      }
    } catch (e) {
      // Purchase not available or failed
    }
  }

  while (true) {
    try {
      for (let i = 0; i < sleeveCount; i++) {
        try {
          // Get sleeve information
          const info = ns.sleeve.getSleeve(i);
          if (!info) continue;
          
          // Check if sleeve is busy
          if (info.currentTask && info.currentTask.type !== "Idle") {
            continue; // Already has a task
          }
          
          // Priority 1: Shock Recovery (if shock > 0)
          // Shock affects experience gain, so recover it first
          if (info.shock > 0 && ns.sleeve.setToShockRecovery) {
            ns.sleeve.setToShockRecovery(i);
            continue;
          }
          
          // Priority 2: Synchronization (if sync < 100)
          // Synchronization affects how much experience the player gets from sleeve work
          // Lower sync = less experience transfer to player
          // Only sync if shock is already 0 (shock recovery takes priority)
          if (info.shock === 0 && info.sync < 100 && ns.sleeve.setToSynchronize) {
            // Only sync if sync is very low (< 50) or if we have nothing better to do
            // High sync sleeves can work while low sync ones sync
            if (info.sync < 50) {
              ns.sleeve.setToSynchronize(i);
              continue;
            }
            // If sync is moderate (50-99), only sync if no other work available
            // This will fall through to work tasks below
          }
          
          // Priority 3: Purchase augmentations (if shock is 0 and we have money)
          // Augmentations reset sleeve stats but provide benefits
          if (info.shock === 0 && ns.sleeve.purchaseSleeveAug) {
            const player = ns.getPlayer();
            const money = ns.getServerMoneyAvailable("home");
            
            // Check available augmentations from factions
            if (player.factions && player.factions.length > 0) {
              for (const faction of player.factions) {
                try {
                  if (ns.singularity && ns.singularity.getAugmentationsFromFaction) {
                    const augs = ns.singularity.getAugmentationsFromFaction(faction);
                    const ownedAugs = ns.singularity.getOwnedAugmentations(true);
                    
                    for (const aug of augs) {
                      // Skip NeuroFlux Governor and BitNode-specific augs
                      if (aug === "NeuroFlux Governor") continue;
                      if (ownedAugs.includes(aug)) continue;
                      
                      const cost = ns.singularity.getAugmentationPrice(aug);
                      const rep = ns.singularity.getFactionRep(faction);
                      const repReq = ns.singularity.getAugmentationRepReq(aug);
                      
                      // Purchase if we have rep and money
                      if (rep >= repReq && money >= cost) {
                        if (ns.sleeve.purchaseSleeveAug(i, faction, aug)) {
                          ns.print(`Purchased ${aug} for sleeve ${i}`);
                          break; // One aug per check cycle
                        }
                      }
                    }
                  }
                } catch {}
              }
            }
          }
          
          // Priority 4: Faction work if we have factions and need rep
          // Only work if shock is 0 and sync is reasonable (> 50)
          const player = ns.getPlayer();
          if (info.shock === 0 && info.sync >= 50 && player.factions && player.factions.length > 0 && ns.sleeve.setToFactionWork) {
            // Find faction that needs rep
            for (const faction of player.factions) {
              try {
                if (ns.singularity && ns.singularity.getFactionRep) {
                  const rep = ns.singularity.getFactionRep(faction);
                  // Work for faction if rep is low
                  if (rep < 1e6) {
                    ns.sleeve.setToFactionWork(i, faction, "hacking");
                    break;
                  }
                }
              } catch {}
            }
            continue;
          }
          
          // Priority 4b: Synchronization for sleeves with moderate sync (50-99) if no work available
          if (info.shock === 0 && info.sync >= 50 && info.sync < 100 && ns.sleeve.setToSynchronize) {
            // Only sync if we don't have work tasks available
            const hasWork = (player.factions && player.factions.length > 0) || player.companyName;
            if (!hasWork) {
              ns.sleeve.setToSynchronize(i);
              continue;
            }
          }
          
          // Priority 5: Company work if employed
          // Only work if shock is 0 and sync is reasonable
          if (info.shock === 0 && info.sync >= 50 && player.companyName && ns.sleeve.setToCompanyWork) {
            try {
              ns.sleeve.setToCompanyWork(i, player.companyName);
              continue;
            } catch {}
          }
          
          // Priority 6: Crime for stats/money
          // Only commit crime if shock is 0 (shock recovery takes priority)
          // Use exact enum values - no fuzzy matching in 3.0.0
          if (info.shock === 0 && ns.sleeve.setToCommitCrime) {
            // Choose crime based on what we need - use exact CrimeType enum values
            let crime = ns.enums?.CrimeType?.Mug ?? "Mug";
            
            // If we need money, use more profitable crimes
            if (money < 1e6) {
              crime = ns.enums?.CrimeType?.["Rob Store"] ?? "Rob Store";
            } else if (money < 1e9) {
              crime = ns.enums?.CrimeType?.["Deal Drugs"] ?? "Deal Drugs";
            } else {
              // Focus on stats
              const stats = [info.strength, info.defense, info.dexterity, info.agility];
              const minStat = Math.min(...stats);
              
              if (minStat < 100) {
                crime = ns.enums?.CrimeType?.Mug ?? "Mug"; // Good for all stats
              } else if (minStat < 500) {
                crime = ns.enums?.CrimeType?.["Rob Store"] ?? "Rob Store"; // Better money + stats
              } else {
                crime = ns.enums?.CrimeType?.Homicide ?? "Homicide"; // Best for stats
              }
            }
            
            ns.sleeve.setToCommitCrime(i, crime);
          }
        } catch (e) {
          // Skip this sleeve if there's an error
        }
      }
      
      // Update registry
      updateRegistrySection(ns, "sleeves", {
        count: sleeveCount,
        active: true
      });
    } catch (e) {
      ns.print(`Error in sleeves: ${e}`);
    }
    
    await ns.sleep(10000); // Check every 10 seconds
  }
}
