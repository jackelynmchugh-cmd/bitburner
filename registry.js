/** @param {NS} ns **/
export function readRegistry(ns) {
  try {
    const raw = ns.read("/data/registry.txt");
    if (!raw) return getDefaultRegistry();
    
    const parsed = JSON.parse(raw);
    
    // Validate structure
    if (!parsed.meta || !parsed.bootstrap) {
      ns.print("[WARN] Registry corrupted, rebuilding");
      const fresh = getDefaultRegistry();
      ns.write("/data/registry.txt", JSON.stringify(fresh, null, 2), "w");
      return fresh;
    }
    
    return parsed;
  } catch (e) {
    ns.print(`[ERROR] Registry read failed: ${e}`);
    return getDefaultRegistry();
  }
}

export function writeRegistry(ns, updates) {
  try {
    const reg = readRegistry(ns);
    
    // Master owns: meta, bootstrap, rotation
    if (updates.meta) {
      reg.meta = { ...reg.meta, ...updates.meta };
    }
    if (updates.bootstrap) {
      reg.bootstrap = { ...reg.bootstrap, ...updates.bootstrap };
    }
    if (updates.rotation) {
      reg.rotation = { ...reg.rotation, ...updates.rotation };
    }
    
    // Infra scripts own their sections - merge only
    if (updates.infra) {
      reg.infra = { ...reg.infra, ...updates.infra };
    }
    if (updates.controller) {
      reg.controller = { ...reg.controller, ...updates.controller };
    }
    if (updates.economy) {
      reg.economy = { ...reg.economy, ...updates.economy };
    }
    if (updates.singularity) {
      reg.singularity = { ...reg.singularity, ...updates.singularity };
    }
    if (updates.darkweb) {
      reg.darkweb = { ...reg.darkweb, ...updates.darkweb };
    }
    if (updates.stocks) {
      reg.stocks = { ...reg.stocks, ...updates.stocks };
    }
    if (updates.sleeves) {
      reg.sleeves = { ...reg.sleeves, ...updates.sleeves };
    }
    if (updates.stanek) {
      reg.stanek = { ...reg.stanek, ...updates.stanek };
    }
    if (updates.augments) {
      reg.augments = { ...reg.augments, ...updates.augments };
    }
    if (updates.backdoor) {
      reg.backdoor = { ...reg.backdoor, ...updates.backdoor };
    }
    
    ns.write("/data/registry.txt", JSON.stringify(reg, null, 2), "w");
  } catch (e) {
    ns.print(`[ERROR] Failed to write registry: ${e}`);
  }
}

export function updateRegistrySection(ns, section, data) {
  try {
    const reg = readRegistry(ns);
    reg[section] = { ...reg[section], ...data };
    ns.write("/data/registry.txt", JSON.stringify(reg, null, 2), "w");
  } catch (e) {
    ns.print(`[ERROR] Failed to update registry section ${section}: ${e}`);
  }
}

function getDefaultRegistry() {
  return {
    meta: { ts: 0, uptimeMs: 0 },
    bootstrap: { phase: "BOOT", lastTransition: "INIT" },
    rotation: { active: null, timeout: 0, lastRotate: 0 },
    infra: {},
    controller: {},
    economy: {},
    singularity: {},
    darkweb: {},
    stocks: {},
    sleeves: {},
    stanek: {},
    augments: {},
    backdoor: {}
  };
}