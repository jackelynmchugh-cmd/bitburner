/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();

  while (true) {
    const reg = readRegistry(ns);
    ns.clearLog();

    ns.print("┌──────────── BOOTSTRAP STATUS ────────────┐");
    ns.print(`│ Phase: ${(reg.bootstrap?.phase ?? "UNKNOWN").padEnd(34)}│`);
    ns.print(`│ Uptime: ${formatTime(reg.meta?.uptimeMs ?? 0).padEnd(33)}│`);
    ns.print(`│ Next Transition: ${(reg.bootstrap?.nextTransition ?? "n/a").padEnd(24)}│`);
    ns.print("└──────────────────────────────────────────┘");

    ns.print("");
    ns.print("┌──────────── CONTROLLER ──────────────────┐");
    ns.print(`│ Host: ${(reg.controller?.host ?? "STOPPED").padEnd(35)}│`);
    ns.print(`│ Active Targets: ${String(reg.controller?.targets?.length ?? 0).padEnd(27)}│`);
    ns.print(`│ Mode: ${(reg.controller?.mode ?? "UNKNOWN").padEnd(35)}│`);
    ns.print("└──────────────────────────────────────────┘");

    ns.print("");
    ns.print("┌──────────── ECONOMY ─────────────────────┐");
    ns.print(`│ Cash: ${ns.formatNumber(reg.economy?.cash ?? 0).padEnd(35)}│`);
    ns.print(`│ Pservs: ${String(reg.infra?.pservs?.count ?? 0).padEnd(33)}│`);
    ns.print("└──────────────────────────────────────────┘");

    ns.print("");
    ns.print("┌──────────── SINGULARITY ─────────────────┐");
    ns.print(`│ Unlocked: ${String(reg.singularity?.unlocked ?? false).padEnd(31)}│`);
    ns.print(`│ Factions: ${String(reg.singularity?.factions ?? 0).padEnd(31)}│`);
    ns.print(`│ Backdoors: ${String(reg.infra?.backdoors ?? 0).padEnd(30)}│`);
    ns.print("└──────────────────────────────────────────┘");

    await ns.sleep(1000);
  }
}

function readRegistry(ns) {
  try {
    const raw = ns.read("/data/registry.txt");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => String(x).padStart(2, "0")).join(":");
}
