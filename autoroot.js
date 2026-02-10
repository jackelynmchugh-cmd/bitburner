/** @param {NS} ns **/
export async function main(ns) {
  const all = scanAll(ns);
  let changed = true;

  while (changed) {
    changed = false;
    for (const host of all) {
      if (host === "home" || ns.hasRootAccess(host)) continue;
      if (tryRoot(ns, host)) changed = true;
    }
    await ns.sleep(200);
  }
}

function scanAll(ns) {
  const seen = new Set(["home"]);
  const q = ["home"];
  while (q.length > 0) {
    const h = q.shift();
    for (const n of ns.scan(h)) {
      if (seen.has(n)) continue;
      seen.add(n);
      q.push(n);
    }
  }
  return [...seen];
}

function tryRoot(ns, host) {
  const openers = [
    ["BruteSSH.exe", ns.brutessh],
    ["FTPCrack.exe", ns.ftpcrack],
    ["relaySMTP.exe", ns.relaysmtp],
    ["HTTPWorm.exe", ns.httpworm],
    ["SQLInject.exe", ns.sqlinject],
  ].filter(([f]) => ns.fileExists(f, "home"));

  if (openers.length < ns.getServerNumPortsRequired(host)) return false;
  for (const [, fn] of openers) {
    try { fn(host); } catch { /* noop */ }
  }
  try { ns.nuke(host); } catch { return false; }
  return ns.hasRootAccess(host);
}
