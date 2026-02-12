/** @param {NS} ns **/
export async function main(ns) {
  const action = String(ns.args[0] ?? "weaken");
  const target = String(ns.args[1] ?? "n00dles");
  const additionalMsec = Number(ns.args[2] ?? 0);
  
  // Use additionalMsec option for precise timing (JIT batcher requirement)
  const opts = additionalMsec > 0 ? { additionalMsec } : {};
  
  if (action === "hack") {
    await ns.hack(target, opts);
  } else if (action === "grow") {
    await ns.grow(target, opts);
  } else {
    await ns.weaken(target, opts);
  }
}
