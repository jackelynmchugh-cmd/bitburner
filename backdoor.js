/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.singularity) {
    ns.print("Singularity not unlocked");
    return;
  }
  
  ns.disableLog("ALL");
  
  const targets = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"];
  
  for (const target of targets) {
    if (!ns.serverExists(target)) continue;
    
    const server = ns.getServer(target);
    if (server.backdoorInstalled) continue;
    if (!ns.hasRootAccess(target)) continue;
    if (ns.getHackingLevel() < ns.getServerRequiredHackingLevel(target)) continue;

    const path = findPath(ns, "home", target);
    if (path.length === 0) continue;
    
    updateRegistrySection(ns, "infra", {
      backdoor: {
        activeTarget: target
      }
    });
    
    // Navigate to target
    ns.singularity.connect("home");
    for (const hop of path.slice(1)) {
      ns.singularity.connect(hop);
    }
    
    // Install backdoor
    await ns.singularity.installBackdoor();
    
    // Return home
    ns.singularity.connect("home");
    
    updateRegistrySection(ns, "infra", {
      backdoor: {
        activeTarget: "none",
        lastInstalled: target,
        lastTimestamp: Date.now()
      }
    });
    
    // One-shot: install one at a time, exit after each
    return;
  }
  
  // No targets available
  updateRegistrySection(ns, "infra", {
    backdoor: {
      activeTarget: "none"
    }
  });
}

function findPath(ns, start, goal) {
  const queue = [[start]];
  const seen = new Set([start]);
  
  while (queue.length > 0) {
    const path = queue.shift();
    const node = path[path.length - 1];
    
    if (node === goal) return path;
    
    for (const neighbor of ns.scan(node)) {
      if (seen.has(neighbor)) continue;
      seen.add(neighbor);
      queue.push([...path, neighbor]);
    }
  }
  
  return [];
}
