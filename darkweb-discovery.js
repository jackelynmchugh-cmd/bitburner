/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.dnet) { ns.print("DarkscapeNavigator.exe not purchased yet"); return; }
  ns.disableLog("ALL");

  while (true) {
    const neighbors = ns.dnet.probe();
    ns.print(`Probed ${neighbors.length} darknet neighbors`);

    for (const host of neighbors) {
      const details = ns.dnet.getServerAuthDetails(host);
      ns.write("/data/darknet-servers.txt", JSON.stringify({host, details}, null, 2) + "\n", "a");

      if (details.isOnline && details.isConnectedToCurrentServer) {
        // Try common passwords or from hint (basic starter logic)
        const commonPw = ["password", "admin", details.passwordHint?.toLowerCase() || ""];
        for (const pw of commonPw) {
          if (!pw) continue;
          const result = await ns.dnet.authenticate(host, pw);
          if (result.success) {
            ns.print(`SUCCESS: Authenticated ${host} with ${pw}`);
            ns.dnet.connectToSession(host, pw);
            break;
          } else {
            await ns.dnet.heartbleed(host, { peek: true });
          }
        }
      }
    }
    await ns.sleep(10000);
  }
}
