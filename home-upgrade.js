/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.singularity?.upgradeHomeRam || !ns.singularity?.upgradeHomeCores) return;
  let acted = false;
  while (ns.singularity.upgradeHomeRam()) acted = true;
  while (ns.singularity.upgradeHomeCores()) acted = true;
  if (!acted) return;
}
