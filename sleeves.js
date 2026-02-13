/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.sleeve) {
    ns.print("Sleeves not available");
    return;
  }
  
  ns.disableLog("ALL");
  
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

  while (true) {
    try {
      const player = ns.getPlayer();
      const money = ns.getServerMoneyAvailable("home");
      
      for (let i = 0; i < sleeveCount; i++) {
        try {
          const sleeve = ns.sleeve.getSleeve(i);
          if (!sleeve) continue;
          
          // Priority 1: Shock recovery (affects all gains)
          if (sleeve.shock > 0 && ns.sleeve.setToShockRecovery) {
            ns.sleeve.setToShockRecovery(i);
            continue;
          }
          
          // Priority 2: Synchronization (enables augmentation gains)
          if (sleeve.shock === 0 && sleeve.sync < 100 && ns.sleeve.setToSynchronize) {
            ns.sleeve.setToSynchronize(i);
            continue;
          }
          
          // Priority 3: Augmentation purchasing (core value of sleeves)
          if (sleeve.shock === 0 && sleeve.sync >= 90 && ns.sleeve.purchaseSleeveAug) {
            let purchased = false;
            
            if (player.factions && player.factions.length > 0) {
              for (const faction of player.factions) {
                try {
                  const augs = ns.singularity.getAugmentationsFromFaction(faction);
                  const ownedAugs = ns.singularity.getOwnedAugmentations(true);
                  
                  for (const aug of augs) {
                    // Skip NeuroFlux Governor
                    if (aug === "NeuroFlux Governor") continue;
                    
                    // Skip if player already has it
                    if (ownedAugs.includes(aug)) continue;
                    
                    const cost = ns.singularity.getAugmentationPrice(aug);
                    const rep = ns.singularity.getFactionRep(faction);
                    const repReq = ns.singularity.getAugmentationRepReq(aug);
                    
                    // Purchase if we have rep and money
                    if (rep >= repReq && money >= cost) {
                      if (ns.sleeve.purchaseSleeveAug(i, faction, aug)) {
                        ns.print(`Sleeve ${i} augmented with ${aug}`);
                        purchased = true;
                        break;
                      }
                    }
                  }
                  
                  if (purchased) break;
                } catch {}
              }
            }
            
            if (purchased) continue;
          }
          
          // Priority 4: Crime for stat gains and charisma farming
          if (sleeve.shock === 0 && sleeve.sync >= 50 && ns.sleeve.setToCommitCrime) {
            let crime = ns.enums?.CrimeType?.Mug ?? "Mug";
            
            // Choose crime based on needs
            const money = ns.getServerMoneyAvailable("home");
            if (money < 1e6) {
              crime = ns.enums?.CrimeType?.["Rob Store"] ?? "Rob Store";
            } else if (money < 1e9) {
              crime = ns.enums?.CrimeType?.["Deal Drugs"] ?? "Deal Drugs";
            } else {
              // Focus on stats
              const stats = [sleeve.strength, sleeve.defense, sleeve.dexterity, sleeve.agility];
              const minStat = Math.min(...stats);
              
              if (minStat < 100) {
                crime = ns.enums?.CrimeType?.Mug ?? "Mug";
              } else if (minStat < 500) {
                crime = ns.enums?.CrimeType?.["Rob Store"] ?? "Rob Store";
              } else {
                // High stats: focus on charisma
                crime = ns.enums?.CrimeType?.Homicide ?? "Homicide";
              }
            }
            
            ns.sleeve.setToCommitCrime(i, crime);
          }
        } catch (e) {
          // Skip this sleeve
        }
      }
      
      updateRegistrySection(ns, "sleeves", {
        count: sleeveCount,
        active: true
      });
    } catch (e) {
      ns.print(`Error in sleeves: ${e}`);
    }
    
    await ns.sleep(10000);
  }
}