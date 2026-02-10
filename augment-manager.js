/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.singularity?.checkFactionInvitations || !ns.singularity?.joinFaction || !ns.singularity?.getAugmentationsFromFaction) return;

  for (const f of ns.singularity.checkFactionInvitations()) ns.singularity.joinFaction(f);

  const money = ns.getServerMoneyAvailable("home");
  for (const faction of ns.getPlayer().factions) {
    const augs = ns.singularity.getAugmentationsFromFaction(faction);
    for (const aug of augs) {
      if (aug === "NeuroFlux Governor") continue;
      const owned = ns.singularity.getOwnedAugmentations(true);
      if (owned.includes(aug)) continue;
      const rep = ns.singularity.getFactionRep(faction);
      const repReq = ns.singularity.getAugmentationRepReq(aug);
      const cost = ns.singularity.getAugmentationPrice(aug);
      if (rep >= repReq && cost <= money) ns.singularity.purchaseAugmentation(faction, aug);
    }
  }
}
