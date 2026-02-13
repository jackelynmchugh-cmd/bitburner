/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  ns.disableLog("ALL");
  
  // Parse arguments
  const reserveHomeArg = ns.args.find(a => a.startsWith("--reserveHome="));
  const modeArg = ns.args.find(a => a.startsWith("--mode="));
  const targetHostArg = ns.args.find(a => a.startsWith("--targetHost="));
  
  const reserveHome = reserveHomeArg 
    ? parseInt(reserveHomeArg.split("=")[1], 10) 
    : 8;
  const mode = modeArg ? modeArg.split("=")[1] : "HOME";
  const targetHost = targetHostArg ? targetHostArg.split("=")[1] : "home";
  
  while (true) {
    // Get best targets
    const targets = rankTargets(ns).slice(0, 3); // multi-target
    
    for (const target of targets) {
      await handleTarget(ns, target, targetHost, reserveHome);
    }
    
    updateRegistrySection(ns, "controller", {
      mode,
      targetHost,
      activeTargets: targets.length
    });
    
    await ns.sleep(50);
  }
}

function rankTargets(ns) {
  const servers = scan(ns);
  const ranked = [];

  for (const s of servers) {
    if (!ns.hasRootAccess(s)) continue;
    try {
      const server = ns.getServer(s);
      const max = server.moneyMax;
      const req = server.requiredHackingSkill;
      
      if (max <= 0 || req > ns.getHackingLevel()) continue;
      
      // Score: profit/second adjusted for overhead
      const hackTime = ns.getHackTime(s);
      
      // Account for security overhead
      const securityOverhead = Math.max(1, (server.hackDifficulty - server.minDifficulty) / 10);
      
      // Account for growth needed
      const growthOverhead = server.moneyAvailable < max * 0.95 ? 1.5 : 1.0;
      
      const totalTime = hackTime * securityOverhead * growthOverhead;
      const estimatedProfit = max * 0.1; // 10% per cycle
      const score = estimatedProfit / totalTime;
      
      ranked.push({ s, score });
    } catch {}
  }

  ranked.sort((a,b) => b.score - a.score);
  return ranked.map(r => r.s);
}

async function handleTarget(ns, target, host, reserveHome) {
  const server = ns.getServer(target);
  
  // Check available RAM
  const freeRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
  if (freeRam < reserveHome + 50) {
    return; // Not enough RAM available
  }
  
  // Phase 1: Stabilize security if needed
  if (server.hackDifficulty > server.minDifficulty + 1) {
    const threads = 40;
    const canRun = freeRam >= threads * ns.getScriptRam("runner.js", host) + reserveHome;
    if (canRun) {
      ns.exec("runner.js", host, threads, "weaken", target);
      updateRegistrySection(ns, "controller", {
        target,
        phase: "stabilize",
        threads
      });
    }
    return;
  }
  
  // Phase 2: Grow to full if needed
  if (server.moneyAvailable < server.moneyMax * 0.95) {
    const threads = 40;
    const canRun = freeRam >= threads * ns.getScriptRam("runner.js", host) + reserveHome;
    if (canRun) {
      ns.exec("runner.js", host, threads, "grow", target);
      updateRegistrySection(ns, "controller", {
        target,
        phase: "grow",
        threads
      });
    }
    return;
  }
  
  // Phase 3: Execute HWGW batch with JIT timing
  const hackPercent = 0.1; // Steal 10% per batch
  
  // Calculate threads needed
  const hackThreads = Math.floor(ns.hackAnalyzeThreads(target, server.moneyMax * hackPercent));
  const growThreads = Math.ceil(ns.growthAnalyze(target, 1 / (1 - hackPercent)));
  
  // Weaken threads = security increase from hack + grow
  const hackSecIncrease = hackThreads * 0.002; // Each hack thread +0.002 sec
  const growSecIncrease = growThreads * 0.004;  // Each grow thread +0.004 sec
  const weaken1Threads = Math.ceil(hackSecIncrease / 0.05);
  const weaken2Threads = Math.ceil(growSecIncrease / 0.05);
  
  const scriptRam = ns.getScriptRam("runner.js", host);
  const totalRam = (hackThreads + growThreads + weaken1Threads + weaken2Threads) * scriptRam;
  
  // Check if we have enough RAM for full batch
  if (freeRam < totalRam + reserveHome) {
    return; // Not enough RAM this cycle
  }
  
  // Execute batch with precise JIT timing
  const hackTime = ns.getHackTime(target);
  const growTime = ns.getGrowTime(target);
  const weakenTime = ns.getWeakenTime(target);
  
  // Timing: all ops complete in order for next batch
  // H -> W -> G -> W (with overlaps minimized)
  const hackDelay = 0;
  const weaken1Delay = hackTime - weakenTime + 10; // Finishes 10ms after hack
  const growDelay = hackTime + 20; // Starts after hack
  const weaken2Delay = hackTime + growTime - weakenTime + 30; // Finishes 30ms after grow
  
  // Launch batch
  ns.exec("runner.js", host, hackThreads, "hack", target, hackDelay);
  ns.exec("runner.js", host, weaken1Threads, "weaken", target, weaken1Delay);
  ns.exec("runner.js", host, growThreads, "grow", target, growDelay);
  ns.exec("runner.js", host, weaken2Threads, "weaken", target, weaken2Delay);
  
  updateRegistrySection(ns, "controller", {
    target,
    phase: "batch",
    hackThreads,
    growThreads,
    weaken1Threads,
    weaken2Threads,
    batchProfit: server.moneyMax * hackPercent,
    batchTime: Math.max(hackTime, growTime + weakenTime)
  });
}

function scan(ns){
  const seen = new Set(["home"]);
  const q = ["home"];
  const out = [];
  while(q.length){
    const h = q.shift();
    out.push(h);
    for(const n of ns.scan(h)){
      if(!seen.has(n)){seen.add(n);q.push(n);}
    }
  }
  return out;
}