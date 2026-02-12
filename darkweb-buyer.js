/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.singularity?.purchaseProgram || !ns.singularity?.purchaseTor) return;
  if (!ns.getPlayer().tor) ns.singularity.purchaseTor();

  const progs = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe",
                 "ServerProfiler.exe", "DeepscanV1.exe", "DeepscanV2.exe", "AutoLink.exe",
                 "Formulas.exe", "DarkscapeNavigator.exe"]; // added

  for (const p of progs) {
    if (!ns.fileExists(p, "home")) ns.singularity.purchaseProgram(p);
  }
}
