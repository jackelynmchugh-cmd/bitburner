/** @param {NS} ns **/
export function readRegistry(ns) {
  try {
    const raw = ns.read("/data/registry.txt");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** @param {NS} ns **/
export function writeRegistry(ns, updates) {
  const reg = readRegistry(ns);
  
  // Master owns: meta, bootstrap, rotation
  // Other sections are owned by their respective scripts
  // Only merge updates, never wholesale overwrite
  
  if (updates.meta) {
    reg.meta = { ...reg.meta, ...updates.meta };
  }
  if (updates.bootstrap) {
    reg.bootstrap = { ...reg.bootstrap, ...updates.bootstrap };
  }
  if (updates.rotation) {
    reg.rotation = { ...reg.rotation, ...updates.rotation };
  }
  
  // Infra scripts own their sections - master can only add, not overwrite
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
  
  try {
    ns.write("/data/registry.txt", JSON.stringify(reg, null, 2), "w");
  } catch (e) {
    ns.print(`[ERROR] Failed to write registry: ${e}`);
  }
}

/** @param {NS} ns **/
export function updateRegistrySection(ns, section, data) {
  const reg = readRegistry(ns);
  reg[section] = { ...reg[section], ...data };
  try {
    ns.write("/data/registry.txt", JSON.stringify(reg, null, 2), "w");
  } catch (e) {
    ns.print(`[ERROR] Failed to update registry section ${section}: ${e}`);
  }
}
