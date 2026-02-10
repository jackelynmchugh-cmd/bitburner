/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.getPlayer().tor) return;
  const catalog = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe", "Formulas.exe", "ServerProfiler.exe", "DeepscanV1.exe", "DeepscanV2.exe", "AutoLink.exe"];
  const known = catalog.filter((f) => ns.fileExists(f, "home"));
  ns.write("/data/darkweb-cache.txt", known.join("\n"), "w");
}
