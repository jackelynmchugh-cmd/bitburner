/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const gain = Number(ns.args[0] ?? 25);
  const start = ns.getHackingLevel();
  const target = start + gain;

  while (ns.getHackingLevel() < target) {
    if (ns.singularity?.universityCourse) {
      ns.singularity.universityCourse("Rothman University", "Algorithms", false);
    }
    await ns.sleep(30_000);
  }
}
