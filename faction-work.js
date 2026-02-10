/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.singularity?.checkFactionInvitations || !ns.singularity?.joinFaction || !ns.singularity?.workForFaction) return;

  for (const f of ns.singularity.checkFactionInvitations()) ns.singularity.joinFaction(f);
  const joined = ns.getPlayer().factions;
  for (const f of joined) {
    if (ns.singularity.workForFaction(f, "hacking", false)) return;
    if (ns.singularity.workForFaction(f, "field", false)) return;
    if (ns.singularity.workForFaction(f, "security", false)) return;
  }
}
