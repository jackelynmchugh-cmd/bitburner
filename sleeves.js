/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.sleeve?.getNumSleeves) return;
  const count = ns.sleeve.getNumSleeves();
  for (let i = 0; i < count; i++) {
    try { ns.sleeve.setToCommitCrime(i, "Mug"); } catch { /* noop */ }
  }
}
