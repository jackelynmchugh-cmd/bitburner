/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  ns.disableLog("ALL");
  
  let lastScan = 0;
  const scanInterval = 60000; // 60 seconds

  while (true) {
    const now = Date.now();
    
    // World scan every 60s
    if (now - lastScan >= scanInterval) {
      const allServers = scanAllServers(ns);
      const rootedCount = allServers.filter(s => ns.hasRootAccess(s)).length;
      
      updateRegistrySection(ns, "infra", {
        autoroot: {
          lastScan: now,
          rootedCount,
          totalServers: allServers.length
        }
      });
      
      lastScan = now;
    }
    
    // Continuous rooting attempt
    const allServers = scanAllServers(ns);
    let changed = true;
    
    while (changed) {
      changed = false;
      for (const host of allServers) {
        if (host === "home" || ns.hasRootAccess(host)) continue;
        if (tryRoot(ns, host)) {
          changed = true;
        }
      }
      if (changed) await ns.sleep(200);
    }
    
    // Update root count after rooting phase too
    if (changed || now - lastScan >= scanInterval) {
      const allServers = scanAllServers(ns);
      const rootedCount = allServers.filter(s => ns.hasRootAccess(s)).length;
      
      updateRegistrySection(ns, "infra", {
        autoroot: {
          lastScan: now,
          rootedCount,
          totalServers: allServers.length
        }
      });
    }
    
    await ns.sleep(5000); // Check every 5 seconds
  }
}

function scanAllServers(ns) {
  const seen = new Set(["home"]);
  const queue = ["home"];
  const result = [];
  
  while (queue.length > 0) {
    const host = queue.shift();
    result.push(host);
    
    for (const neighbor of ns.scan(host)) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return result;
}

function tryRoot(ns, host) {
  if (!ns.serverExists(host)) return false;
  
  try {
    const server = ns.getServer(host);
    if (!server || server.hasAdminRights) return false;
    
    const requiredHack = server.requiredHackingSkill;
    if (ns.getHackingLevel() < requiredHack) return false;
    
    // Try each exploit
    if (!server.sshPortOpen && ns.fileExists("BruteSSH.exe", "home")) {
      const result = ns.brutessh(host);
      if (!result) return false;
    }
    if (!server.ftpPortOpen && ns.fileExists("FTPCrack.exe", "home")) {
      const result = ns.ftpcrack(host);
      if (!result) return false;
    }
    if (!server.smtpPortOpen && ns.fileExists("relaySMTP.exe", "home")) {
      const result = ns.relaysmtp(host);
      if (!result) return false;
    }
    if (!server.httpPortOpen && ns.fileExists("HTTPWorm.exe", "home")) {
      const result = ns.httpworm(host);
      if (!result) return false;
    }
    if (!server.sqlPortOpen && ns.fileExists("SQLInject.exe", "home")) {
      const result = ns.sqlinject(host);
      if (!result) return false;
    }
    
    // Try to nuke
    const nukeResult = ns.nuke(host);
    return nukeResult === true;
  } catch (e) {
    return false;
  }
}