/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.singularity?.purchaseTor) return;
  if (ns.getPlayer().tor) return;
  ns.singularity.purchaseTor();
}
