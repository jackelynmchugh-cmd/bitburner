/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.singularity?.connect || !ns.singularity?.installBackdoor) return;
  const targets = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"];
  for (const t of targets) {
    if (!ns.serverExists(t)) continue;
    const s = ns.getServer(t);
    if (s.backdoorInstalled || !ns.hasRootAccess(t)) continue;
    if (ns.getHackingLevel() < ns.getServerRequiredHackingLevel(t)) continue;

    const path = findPath(ns, "home", t);
    if (path.length === 0) continue;
    ns.singularity.connect("home");
    for (const hop of path.slice(1)) ns.singularity.connect(hop);
    await ns.singularity.installBackdoor();
    ns.singularity.connect("home");
  }
}

function findPath(ns, start, goal) {
  const q = [[start]];
  const seen = new Set([start]);
  while (q.length > 0) {
    const p = q.shift();
    const n = p[p.length - 1];
    if (n === goal) return p;
    for (const x of ns.scan(n)) {
      if (seen.has(x)) continue;
      seen.add(x);
      q.push([...p, x]);
    }
  }
  return [];
}
