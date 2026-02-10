/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.stanek?.activeFragments) return;
  const frags = ns.stanek.activeFragments();
  for (const f of frags) {
    if (f.id >= 100) continue;
    try { await ns.stanek.chargeFragment(f.x, f.y); } catch { /* noop */ }
  }
}
