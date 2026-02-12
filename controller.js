/** @param {NS} ns **/
import { readRegistry, updateRegistrySection } from "./registry.js";

export async function main(ns) {
  ns.disableLog("ALL");
  
  const cfg = parseArgs(ns.args);
  const mode = cfg.mode || "HOME";
  const reserveHome = cfg.reserveHome || 8;
  const hackFraction = cfg.hackFraction || 0.1;
  const batchSpacing = cfg.batchSpacing || 25; // 25ms spacing between batches (JIT requirement)
  const maxParallelBatches = cfg.maxParallelBatches || 100000; // Safety limit
  
  // Track active batches
  const activeBatches = new Map(); // host -> [{ batchId, ram, finishTime, target }]
  let batchIdCounter = 0;
  
  let incomeHistory = [];
  const incomeWindow = 60;
  let lastTarget = null;
  let lastTargetUpdate = 0;
  const targetRefreshInterval = 5000; // Re-evaluate target every 5 seconds

  while (true) {
    const now = Date.now();
    
    // Clean up completed batches
    cleanupCompletedBatches(ns, activeBatches, now);
    
    // Refresh target periodically
    if (now - lastTargetUpdate > targetRefreshInterval) {
      lastTarget = chooseBestTarget(ns);
      lastTargetUpdate = now;
    }
    
    if (!lastTarget) {
      await ns.sleep(2000);
      continue;
    }

    const workers = discoverWorkers(ns, mode, reserveHome);
    if (workers.length === 0) {
      await ns.sleep(2000);
      continue;
    }

    const batch = planHWGWBatch(ns, lastTarget, hackFraction);
    if (!batch || batch.totalThreads === 0) {
      await ns.sleep(2000);
      continue;
    }

    // Calculate available RAM considering in-flight batches
    const availableWorkers = calculateAvailableRAM(ns, workers, activeBatches, now, batchSpacing);
    
    if (availableWorkers.length === 0) {
      // No RAM available, wait a bit
      await ns.sleep(100);
      continue;
    }

    // Check if we're at parallel batch limit
    const totalActiveBatches = Array.from(activeBatches.values()).reduce((sum, batches) => sum + batches.length, 0);
    if (totalActiveBatches >= maxParallelBatches) {
      await ns.sleep(100);
      continue;
    }

    // Schedule batch with JIT timing
    const batchId = batchIdCounter++;
    const income = scheduleHWGWBatchJIT(ns, availableWorkers, lastTarget, batch, batchId, activeBatches, now, batchSpacing);
    
    // Track income
    incomeHistory.push({ time: now, income });
    incomeHistory = incomeHistory.filter(h => now - h.time < incomeWindow * 1000);
    const incomePerMin = incomeHistory.reduce((sum, h) => sum + h.income, 0) / (incomeWindow / 60);
    
    // Update registry
    updateRegistrySection(ns, "controller", {
      host: mode === "PSERV" ? "pserv-0" : "home",
      mode,
      target: lastTarget,
      threads: batch.totalThreads,
      incomePerMin,
      activeBatches: totalActiveBatches + 1
    });

    // Small delay for JIT spacing (allows other batches to be scheduled)
    await ns.sleep(batchSpacing);
  }
}

function parseArgs(args) {
  const cfg = {
    reserveHome: 8,
    mode: "HOME",
    hackFraction: 0.1,
    batchSpacing: 25, // ms between batch launches (JIT requirement: 5-50ms)
    maxParallelBatches: 100000 // Safety limit to prevent crashes
  };
  
  for (const arg of args) {
    if (arg.startsWith("--reserveHome=")) {
      cfg.reserveHome = parseInt(arg.split("=")[1]);
    } else if (arg.startsWith("--mode=")) {
      cfg.mode = arg.split("=")[1];
    } else if (arg.startsWith("--hackFraction=")) {
      cfg.hackFraction = parseFloat(arg.split("=")[1]);
    } else if (arg.startsWith("--batchSpacing=")) {
      cfg.batchSpacing = parseInt(arg.split("=")[1]);
    } else if (arg.startsWith("--maxParallelBatches=")) {
      cfg.maxParallelBatches = parseInt(arg.split("=")[1]);
    }
  }
  
  return cfg;
}

function cleanupCompletedBatches(ns, activeBatches, now) {
  for (const [host, batches] of activeBatches.entries()) {
    // Remove batches that have finished
    const active = batches.filter(b => b.finishTime > now);
    if (active.length === 0) {
      activeBatches.delete(host);
    } else {
      activeBatches.set(host, active);
    }
  }
}

function calculateAvailableRAM(ns, workers, activeBatches, now, batchSpacing) {
  const available = [];
  
  for (const worker of workers) {
    const host = worker.host;
    const maxRam = ns.getServer(host).maxRam;
    const usedRam = ns.getServerUsedRam(host);
    
    // Calculate RAM committed to active batches
    let committedRam = 0;
    const batches = activeBatches.get(host) || [];
    for (const batch of batches) {
      // Only count RAM if batch hasn't finished yet
      if (batch.finishTime > now) {
        committedRam += batch.ram;
      }
    }
    
    const freeRam = maxRam - usedRam - committedRam;
    
    if (freeRam > 0) {
      available.push({
        host: worker.host,
        freeRam: freeRam,
        maxRam: maxRam
      });
    }
  }
  
  return available;
}

function scanNetwork(ns) {
  const seen = new Set(["home"]);
  const queue = ["home"];
  const servers = [];
  
  while (queue.length > 0) {
    const host = queue.shift();
    servers.push(host);
    
    for (const neighbor of ns.scan(host)) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return servers;
}

function scoreTarget(ns, hostname) {
  if (!ns.serverExists(hostname)) return 0;
  
  try {
    const server = ns.getServer(hostname);
    const player = ns.getPlayer();
    
    // Filter criteria
    if (!ns.hasRootAccess(hostname)) return 0;
    
    // APIs throw errors for non-hackable servers in 3.0.0 - wrap in try-catch
    let maxMoney = 0;
    let requiredHack = 0;
    try {
      maxMoney = ns.getServerMaxMoney(hostname);
      requiredHack = ns.getServerRequiredHackingLevel(hostname);
    } catch {
      return 0; // Not a hackable server
    }
    
    if (maxMoney <= 0) return 0;
    if (requiredHack > player.hacking) return 0;
    if (requiredHack > player.hacking * 0.5) return 0;
    
    // Calculate hack chance
    const hackChance = ns.formulas ? 
      ns.formulas.hacking.hackChance(server, player) :
      Math.max(0, (player.hacking - requiredHack) / player.hacking);
    
    if (hackChance <= 0) return 0;
    
    // Calculate score: money per security per thread cost
    const baseScore = (maxMoney * hackChance) / (server.minDifficulty + 1);
    
    // Estimate thread cost - APIs throw errors for non-hackable servers
    let hackTime = 0;
    let weakenTime = 0;
    let growTime = 0;
    try {
      hackTime = ns.getHackTime(hostname);
      weakenTime = ns.getWeakenTime(hostname);
      growTime = ns.getGrowTime(hostname);
    } catch {
      return 0; // Not a hackable server
    }
    
    const avgBatchTime = (hackTime + weakenTime * 2 + growTime) / 4;
    const timePenalty = Math.max(0.1, 1 / (avgBatchTime / 1000));
    
    return baseScore * timePenalty;
  } catch (e) {
    // Server might not be hackable
    return 0;
  }
}

function chooseBestTarget(ns) {
  const servers = scanNetwork(ns);
  
  let bestTarget = null;
  let bestScore = 0;
  
  for (const hostname of servers) {
    const score = scoreTarget(ns, hostname);
    if (score > bestScore) {
      bestScore = score;
      bestTarget = hostname;
    }
  }
  
  return bestTarget;
}

function isHackable(ns, target) {
  if (!ns.serverExists(target)) return false;
  if (!ns.hasRootAccess(target)) return false;
  
  // APIs throw errors for non-hackable servers in 3.0.0
  try {
    const requiredHack = ns.getServerRequiredHackingLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    if (requiredHack > ns.getHackingLevel()) return false;
    if (maxMoney <= 0) return false;
    return true;
  } catch {
    return false; // Not a hackable server
  }
}

function discoverWorkers(ns, mode, reserveHome) {
  const workers = [];
  
  if (mode === "HOME") {
    const home = ns.getServer("home");
    const usedRam = ns.getServerUsedRam("home");
    const freeRam = home.maxRam - usedRam - reserveHome;
    
    if (freeRam > 0) {
      workers.push({
        host: "home",
        freeRam: freeRam
      });
    }
  } else if (mode === "PSERV") {
    const pservs = ns.cloud ? ns.cloud.getServerNames() : [];
    for (const pserv of pservs) {
      const server = ns.getServer(pserv);
      const usedRam = ns.getServerUsedRam(pserv);
      const freeRam = server.maxRam - usedRam;
      
      if (freeRam > 0) {
        workers.push({
          host: pserv,
          freeRam: freeRam
        });
      }
    }
  }
  
  return workers;
}

function planHWGWBatch(ns, target, hackFraction) {
  if (!isHackable(ns, target)) return null;
  
  const server = ns.getServer(target);
  const player = ns.getPlayer();
  
  const maxMoney = server.moneyMax;
  
  // Target hack amount
  const hackAmount = maxMoney * hackFraction;
  
  // Calculate hack threads needed - APIs throw errors for non-hackable servers in 3.0.0
  let hackThreads = 1;
  let hackSecurityIncrease = 0;
  let growThreads = 1;
  let growSecurityIncrease = 0;
  let hackTime = 0;
  let growTime = 0;
  let weakenTime = 0;
  
  try {
    hackThreads = Math.ceil(ns.hackAnalyzeThreads(target, hackAmount));
    if (hackThreads <= 0) hackThreads = 1;
    
    hackSecurityIncrease = ns.hackAnalyzeSecurity(hackThreads, target);
    
    const growMultiplier = 1 / (1 - hackFraction);
    growThreads = Math.ceil(ns.growthAnalyze(target, growMultiplier));
    if (growThreads <= 0) growThreads = 1;
    
    growSecurityIncrease = ns.growthAnalyzeSecurity(growThreads, target);
    
    hackTime = ns.getHackTime(target);
    growTime = ns.getGrowTime(target);
    weakenTime = ns.getWeakenTime(target);
  } catch (e) {
    // Fallback if APIs fail (server might not be hackable)
    const hackPercent = ns.hackAnalyze ? ns.hackAnalyze(target) : 0.01;
    hackThreads = Math.ceil(hackFraction / hackPercent);
    hackSecurityIncrease = hackThreads * 0.002;
    
    const growMultiplier = 1 / (1 - hackFraction);
    growThreads = Math.ceil(Math.log(growMultiplier) / Math.log(1.03));
    growSecurityIncrease = growThreads * 0.004;
    
    // Estimate times
    hackTime = 1000;
    growTime = 2000;
    weakenTime = 3000;
  }
  
  // Calculate weaken threads needed
  const weakenPerThread = 0.05;
  const weaken1Threads = Math.ceil(hackSecurityIncrease / weakenPerThread);
  const weaken2Threads = Math.ceil(growSecurityIncrease / weakenPerThread);
  
  const batchTime = Math.max(hackTime, weakenTime, growTime);
  
  // Calculate RAM requirements
  const runnerRam = ns.getScriptRam("runner.js", "home");
  const totalRam = (hackThreads + weaken1Threads + growThreads + weaken2Threads) * runnerRam;
  
  return {
    target,
    hackThreads,
    weaken1Threads,
    growThreads,
    weaken2Threads,
    totalThreads: hackThreads + weaken1Threads + growThreads + weaken2Threads,
    batchTime,
    totalRam,
    hackTime,
    growTime,
    weakenTime,
    hackAmount
  };
}

function scheduleHWGWBatchJIT(ns, workers, target, batch, batchId, activeBatches, now, batchSpacing) {
  const runnerRam = ns.getScriptRam("runner.js", "home");
  
  // Calculate batch finish time (all actions finish together)
  const finishTime = now + batch.batchTime;
  
  // Calculate additionalMsec for each action to finish at finishTime
  const hackAdditionalMsec = Math.max(0, finishTime - now - batch.hackTime);
  const growAdditionalMsec = Math.max(0, finishTime - now - batch.growTime);
  const weakenAdditionalMsec = Math.max(0, finishTime - now - batch.weakenTime);
  
  // Track allocated RAM per worker for this batch
  const workerAllocated = new Map();
  for (const worker of workers) {
    workerAllocated.set(worker.host, 0);
  }
  
  let income = 0;
  let totalAllocatedRam = 0;
  
  // Distribute threads across workers
  let remainingHack = batch.hackThreads;
  let remainingWeaken1 = batch.weaken1Threads;
  let remainingGrow = batch.growThreads;
  let remainingWeaken2 = batch.weaken2Threads;
  
  // Schedule in HWGW order
  const actions = [
    { type: "hack", threads: batch.hackThreads, remaining: () => remainingHack, setRemaining: (v) => remainingHack = v, additionalMsec: hackAdditionalMsec },
    { type: "weaken", threads: batch.weaken1Threads, remaining: () => remainingWeaken1, setRemaining: (v) => remainingWeaken1 = v, additionalMsec: weakenAdditionalMsec },
    { type: "grow", threads: batch.growThreads, remaining: () => remainingGrow, setRemaining: (v) => remainingGrow = v, additionalMsec: growAdditionalMsec },
    { type: "weaken", threads: batch.weaken2Threads, remaining: () => remainingWeaken2, setRemaining: (v) => remainingWeaken2 = v, additionalMsec: weakenAdditionalMsec }
  ];
  
  for (const action of actions) {
    for (const worker of workers) {
      if (action.remaining() <= 0) break;
      
      const allocated = workerAllocated.get(worker.host) || 0;
      const availableRam = worker.freeRam - allocated;
      if (availableRam < runnerRam) continue;
      
      const threads = Math.min(action.remaining(), Math.floor(availableRam / runnerRam));
      if (threads <= 0) continue;
      
      // Execute runner.js with proper timing
      const pid = ns.exec("runner.js", worker.host, threads, action.type, target, action.additionalMsec);
      if (pid > 0) {
        action.setRemaining(action.remaining() - threads);
        const newAllocated = allocated + threads * runnerRam;
        workerAllocated.set(worker.host, newAllocated);
        totalAllocatedRam += threads * runnerRam;
        
        if (action.type === "hack") {
          try {
            const hackPercent = ns.hackAnalyze(target);
            const maxMoney = ns.getServerMaxMoney(target);
            income += hackPercent * threads * maxMoney * (batch.hackAmount / maxMoney);
          } catch {
            // Server might not be hackable, skip income calculation
          }
        }
      }
    }
  }
  
  // Track this batch for RAM management
  for (const [host, allocated] of workerAllocated.entries()) {
    if (allocated > 0) {
      if (!activeBatches.has(host)) {
        activeBatches.set(host, []);
      }
      activeBatches.get(host).push({
        batchId,
        ram: allocated,
        finishTime: finishTime,
        target: target
      });
    }
  }
  
  return income;
}
