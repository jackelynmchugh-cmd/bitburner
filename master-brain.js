/** @param {NS} ns **/
import { readRegistry, writeRegistry } from "./registry.js";

export async function main(ns) {
  ns.disableLog("ALL");
  const startedAt = Date.now();
  
  // Ensure data directory exists
  if (!ns.fileExists("/data/registry.txt")) {
    ns.write("/data/registry.txt", "{}", "w");
  }

  const cfg = {
    pollMs: 3000,
    rotationWindowMs: 5 * 60 * 1000, // 5 minutes
    phases: {
      BOOT: "BOOT",
      FOUNDATION: "FOUNDATION", 
      NETWORK: "NETWORK",
      EXPANSION: "EXPANSION",
      ASCENSION: "ASCENSION"
    },
    scripts: {
      observer: "observer.js",
      controller: "controller.js",
      autoroot: "autoroot.js",
      buyTor: "buy-tor.js",
      darkwebBuyer: "darkweb-buyer.js",
      darkwebDiscovery: "darkweb-discovery.js",
      backdoor: "backdoor.js",
      jobs: "jobs.js",
      factions: "faction-work.js",
      sleeves: "sleeves.js",
      stocks: "stocks.js",
      stanek: "stanek.js",
      augments: "augment-manager.js",
      pservBuyer: "pserv-buyer.js",
      homeUpgrader: "home-upgrade.js",
      university: "university-hacking.js",
      crime: "crime-mug.js"
    },
    rotationScripts: ["crime", "factions", "jobs", "university"]
  };

  let lastPhase = "";

  while (true) {
    const world = scanWorld(ns);
    const phase = derivePhase(ns, cfg, world);

    // Phase transition handling
    if (phase !== lastPhase) {
      ns.print(`[TRANSITION] ${lastPhase || "BOOT"} → ${phase}`);
      killManagedScripts(ns, cfg, phase, lastPhase);
      lastPhase = phase;
      
      // Reset rotation on phase change
      writeRegistry(ns, {
        rotation: {
          active: null,
          timeout: Date.now(),
          lastRotate: Date.now()
        }
      });
    }

    // Update registry with phase info
    writeRegistry(ns, {
      meta: {
        ts: Date.now(),
        uptimeMs: Date.now() - startedAt
      },
      bootstrap: {
        phase,
        lastTransition: lastPhase ? `${lastPhase} → ${phase}` : "INIT"
      }
    });

    // Always running scripts
    await ensureObserver(ns, cfg);
    await ensureAutoroot(ns, cfg);
    await ensureController(ns, cfg, phase, world);

    // Phase-specific always-running scripts
    await ensurePhaseScripts(ns, cfg, phase, world);

    // Rotation management (only in phases that support it)
    if (phase !== cfg.phases.BOOT && phase !== cfg.phases.ASCENSION) {
      await manageRotation(ns, cfg, phase, world);
    }

    // ASCENSION phase: prepare for install
    if (phase === cfg.phases.ASCENSION) {
      await handleAscension(ns, cfg);
    }

    await ns.sleep(cfg.pollMs);
  }
}

function scanWorld(ns) {
  const player = ns.getPlayer();
  const home = ns.getServer("home");
  const pservs = ns.cloud ? ns.cloud.getServerNames() : [];
  const pserv0 = pservs.length > 0 ? ns.getServer(pservs[0]) : null;
  
  // Check if servers are rooted
  const n00dlesRooted = ns.hasRootAccess("n00dles");
  const foodnstuffRooted = ns.hasRootAccess("foodnstuff");
  const csecRooted = ns.hasRootAccess("CSEC");
  
  // Count rooted servers
  const allServers = scanAllServers(ns);
  const rootedCount = allServers.filter(s => ns.hasRootAccess(s)).length;
  
  // Check singularity
  const singularityUnlocked = !!ns.singularity;
  
  // Check installable augments
  const installableAugs = singularityUnlocked 
    ? ns.singularity.getOwnedAugmentations(false).filter(a => 
        !ns.singularity.getOwnedAugmentations(true).includes(a)
      )
    : [];
  
  return {
    player,
    home,
    pserv0,
    pservs,
    n00dlesRooted,
    foodnstuffRooted,
    csecRooted,
    rootedCount,
    singularityUnlocked,
    installableAugs,
    hackLevel: player.hacking,
    money: player.money,
    factions: player.factions || [],
    hasTor: player.tor || false
  };
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

function derivePhase(ns, cfg, world) {
  // ASCENSION: Has installable augments
  if (world.installableAugs.length >= 2) {
    return cfg.phases.ASCENSION;
  }
  
  // EXPANSION: Home >= 512GB, pserv network scaled
  if (world.home.maxRam >= 512 && world.pservs.length > 0) {
    return cfg.phases.EXPANSION;
  }
  
  // NETWORK: CSEC rooted, singularity unlocked
  if (world.csecRooted && world.singularityUnlocked) {
    return cfg.phases.NETWORK;
  }
  
  // FOUNDATION: n00dles + foodnstuff rooted, consistent income
  if (world.n00dlesRooted && world.foodnstuffRooted && world.money > 10000) {
    return cfg.phases.FOUNDATION;
  }
  
  // BOOT: Everything else
  return cfg.phases.BOOT;
}

async function ensureObserver(ns, cfg) {
  if (!isScriptRunning(ns, cfg.scripts.observer)) {
    safeLaunch(ns, cfg.scripts.observer, 1, "home");
  }
}

async function ensureAutoroot(ns, cfg) {
  if (!isScriptRunning(ns, cfg.scripts.autoroot)) {
    safeLaunch(ns, cfg.scripts.autoroot, 1, "home");
  }
}

async function ensureWorldScan(ns, cfg) {
  // World scan runs every 60s via autoroot
  // This is handled in autoroot.js itself
}

async function ensureController(ns, cfg, phase, world) {
  if (isScriptRunning(ns, cfg.scripts.controller)) return;
  
  const reserveHome = getReserveHome(phase);
  const mode = getControllerMode(phase, world);
  
  const args = [
    `--reserveHome=${reserveHome}`,
    `--mode=${mode}`
  ];
  
  safeLaunch(ns, cfg.scripts.controller, 1, "home", args);
}

function getReserveHome(phase) {
  switch (phase) {
    case "BOOT": return 32;
    case "FOUNDATION": return 16;
    case "NETWORK":
    case "EXPANSION": return 8;
    default: return 8;
  }
}

function getControllerMode(phase, world) {
  if (phase === "NETWORK" || phase === "EXPANSION") {
    if (world.pservs.length > 0 && world.pserv0 && world.pserv0.maxRam >= 8) {
      return "PSERV";
    }
  }
  return "HOME";
}

async function ensurePhaseScripts(ns, cfg, phase, world) {
  // BOOT: Nothing else
  if (phase === cfg.phases.BOOT) return;
  
  // FOUNDATION: pserv-buyer (low tier), home-upgrader (if cheap), darkweb-buyer
  if (phase === cfg.phases.FOUNDATION) {
    if (!isScriptRunning(ns, cfg.scripts.pservBuyer)) {
      safeLaunch(ns, cfg.scripts.pservBuyer, 1, "home", ["--maxRam=8"]);
    }
    if (world.money >= 100000 && !isScriptRunning(ns, cfg.scripts.homeUpgrader)) {
      safeLaunch(ns, cfg.scripts.homeUpgrader, 1, "home");
    }
    if (world.hasTor && !isScriptRunning(ns, cfg.scripts.darkwebBuyer)) {
      safeLaunch(ns, cfg.scripts.darkwebBuyer, 1, "home");
    }
    return;
  }
  
  // NETWORK: pserv-buyer (scaling), home-upgrader, darkweb-buyer, backdoor, darkweb-discovery, stocks, sleeves
  if (phase === cfg.phases.NETWORK) {
    if (!isScriptRunning(ns, cfg.scripts.pservBuyer)) {
      safeLaunch(ns, cfg.scripts.pservBuyer, 1, "home", ["--scaling"]);
    }
    if (!isScriptRunning(ns, cfg.scripts.homeUpgrader)) {
      safeLaunch(ns, cfg.scripts.homeUpgrader, 1, "home");
    }
    if (world.hasTor && !isScriptRunning(ns, cfg.scripts.darkwebBuyer)) {
      safeLaunch(ns, cfg.scripts.darkwebBuyer, 1, "home");
    }
    if (!isScriptRunning(ns, cfg.scripts.backdoor)) {
      safeLaunch(ns, cfg.scripts.backdoor, 1, "home");
    }
    if (world.hasTor && !isScriptRunning(ns, cfg.scripts.darkwebDiscovery)) {
      safeLaunch(ns, cfg.scripts.darkwebDiscovery, 1, "home");
    }
    if (ns.stock && !isScriptRunning(ns, cfg.scripts.stocks)) {
      safeLaunch(ns, cfg.scripts.stocks, 1, "home");
    }
    if (ns.sleeve && !isScriptRunning(ns, cfg.scripts.sleeves)) {
      safeLaunch(ns, cfg.scripts.sleeves, 1, "home");
    }
    return;
  }
  
  // EXPANSION: Everything from NETWORK + stanek + augment-manager
  if (phase === cfg.phases.EXPANSION) {
    // Reuse NETWORK scripts
    await ensurePhaseScripts(ns, cfg, cfg.phases.NETWORK, world);
    
    if (ns.stanek && !isScriptRunning(ns, cfg.scripts.stanek)) {
      safeLaunch(ns, cfg.scripts.stanek, 1, "home");
    }
    if (world.home.maxRam >= 512 && !isScriptRunning(ns, cfg.scripts.augments)) {
      safeLaunch(ns, cfg.scripts.augments, 1, "home", ["--monitor"]);
    }
    return;
  }
}

async function manageRotation(ns, cfg, phase, world) {
  const reg = readRegistry(ns);
  const now = Date.now();
  const rotationTimeout = reg.rotation?.timeout || 0;
  const currentRotationScript = reg.rotation?.active;
  
  // Check if rotation window expired
  if (now - rotationTimeout >= cfg.rotationWindowMs) {
    // Stop current rotation script
    if (currentRotationScript) {
      const scriptName = cfg.scripts[currentRotationScript];
      if (scriptName && isScriptRunning(ns, scriptName)) {
        ns.kill(scriptName, "home");
      }
    }
    
    // Determine next script based on phase and priority
    const nextScript = getNextRotationScript(ns, cfg, phase, world);
    
    if (nextScript && hasEnoughRam(ns, cfg.scripts[nextScript])) {
      safeLaunch(ns, cfg.scripts[nextScript], 1, "home");
      
      writeRegistry(ns, {
        rotation: {
          active: nextScript,
          timeout: now,
          lastRotate: now
        }
      });
    } else {
      // No script available, reset rotation
      writeRegistry(ns, {
        rotation: {
          active: null,
          timeout: now,
          lastRotate: now
        }
      });
    }
  } else if (!currentRotationScript) {
    // No rotation active, start one
    const nextScript = getNextRotationScript(ns, cfg, phase, world);
    if (nextScript && hasEnoughRam(ns, cfg.scripts[nextScript])) {
      safeLaunch(ns, cfg.scripts[nextScript], 1, "home");
      
      writeRegistry(ns, {
        rotation: {
          active: nextScript,
          timeout: now,
          lastRotate: now
        }
      });
    }
  }
}

function getNextRotationScript(ns, cfg, phase, world) {
  // BOOT: Only crime
  if (phase === cfg.phases.BOOT) {
    return world.singularityUnlocked ? "crime" : null;
  }
  
  // FOUNDATION: Priority: crime, factions (if joined), jobs (if employed), university (money >= 5M)
  if (phase === cfg.phases.FOUNDATION) {
    if (world.singularityUnlocked) {
      if (world.factions.length > 0) return "factions";
      if (world.player.companyName) return "jobs";
      if (world.money >= 5000000) return "university";
      return "crime";
    }
    return null;
  }
  
  // NETWORK/EXPANSION: Priority: factions, jobs, crime, university (money >= 5M)
  if (phase === cfg.phases.NETWORK || phase === cfg.phases.EXPANSION) {
    if (world.singularityUnlocked) {
      if (world.factions.length > 0) return "factions";
      if (world.player.companyName) return "jobs";
      if (world.money >= 5000000) return "university";
      return "crime";
    }
    return null;
  }
  
  return null;
}

function killManagedScripts(ns, cfg, newPhase, oldPhase) {
  // Never kill controller or observer
  const protected = [cfg.scripts.controller, cfg.scripts.observer];
  
  // Determine which scripts to kill based on phase transition
  const scriptsToKill = [];
  
  if (newPhase === cfg.phases.BOOT) {
    // Kill everything except observer, autoroot, controller
    scriptsToKill.push(
      cfg.scripts.factions, cfg.scripts.jobs, cfg.scripts.university,
      cfg.scripts.stocks, cfg.scripts.backdoor, cfg.scripts.darkwebBuyer,
      cfg.scripts.darkwebDiscovery, cfg.scripts.augments, cfg.scripts.stanek,
      cfg.scripts.pservBuyer, cfg.scripts.homeUpgrader, cfg.scripts.sleeves
    );
  }
  
  // Kill rotation scripts on phase change
  scriptsToKill.push(
    cfg.scripts.crime, cfg.scripts.factions, cfg.scripts.jobs, cfg.scripts.university
  );
  
  for (const script of scriptsToKill) {
    if (script && !protected.includes(script) && isScriptRunning(ns, script)) {
      ns.kill(script, "home");
      // Also kill on pservs if needed
      const pservs = ns.cloud ? ns.cloud.getServerNames() : [];
      for (const pserv of pservs) {
        ns.kill(script, pserv);
      }
    }
  }
}

async function handleAscension(ns, cfg) {
  // Stop all rotation
  const reg = readRegistry(ns);
  if (reg.rotation?.active) {
    const scriptName = cfg.scripts[reg.rotation.active];
    if (scriptName && isScriptRunning(ns, scriptName)) {
      ns.kill(scriptName, "home");
    }
    writeRegistry(ns, {
      rotation: {
        active: null,
        timeout: Date.now(),
        lastRotate: Date.now()
      }
    });
  }
  
  // Check if we've already waited
  const ascensionStart = reg.bootstrap?.ascensionStart || Date.now();
  if (!reg.bootstrap?.ascensionStart) {
    writeRegistry(ns, {
      bootstrap: {
        ascensionStart: Date.now()
      }
    });
  }
  
  // Let daemons flush (wait 2 minutes)
  if (Date.now() - ascensionStart < 120000) {
    return; // Still waiting
  }
  
  // Run augment-manager in install mode
  if (!isScriptRunning(ns, cfg.scripts.augments)) {
    safeLaunch(ns, cfg.scripts.augments, 1, "home", ["--install"]);
  }
  
  // Wait for install to complete (augment-manager will handle it)
}

function isScriptRunning(ns, script) {
  if (!script) return false;
  const procs = ns.ps("home");
  return procs.some(p => p.filename === script);
}

function hasEnoughRam(ns, script) {
  if (!script || !ns.fileExists(script, "home")) return false;
  const ram = ns.getScriptRam(script, "home");
  const free = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
  return free >= ram + 8; // Reserve 8GB
}

function safeLaunch(ns, script, threads, host, args = []) {
  if (!ns.fileExists(script, host)) {
    ns.print(`[WARN] Script ${script} not found on ${host}`);
    return false;
  }
  
  if (isScriptRunning(ns, script)) {
    return true; // Already running, don't spam
  }
  
  const ram = ns.getScriptRam(script, host);
  const free = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
  
  if (free < ram * threads + 8) {
    ns.print(`[WARN] Not enough RAM to launch ${script} on ${host}`);
    return false;
  }
  
  const pid = ns.exec(script, host, threads, ...args);
  return pid > 0;
}
