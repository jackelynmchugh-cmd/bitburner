/** @param {NS} ns **/
import { readRegistry } from "./registry.js";

export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  while (true) {
    const reg = readRegistry(ns);
    const player = ns.getPlayer();
    const home = ns.getServer("home");
    const pservs = ns.cloud ? ns.cloud.getServerNames() : [];
    
    ns.clearLog();

    // 1️⃣ BOOTSTRAP
    ns.print("┌──────────── BOOTSTRAP ─────────────────────┐");
    ns.print(`│ Phase: ${(reg.bootstrap?.phase ?? "UNKNOWN").padEnd(35)}│`);
    ns.print(`│ Uptime: ${formatTime(reg.meta?.uptimeMs ?? 0).padEnd(34)}│`);
    ns.print(`│ Active Rotation: ${(reg.rotation?.active ?? "none").padEnd(25)}│`);
    ns.print(`│ Next Transition: ${(reg.bootstrap?.lastTransition ?? "n/a").padEnd(24)}│`);
    ns.print("└────────────────────────────────────────────┘");

    // 2️⃣ CONTROLLER
    ns.print("");
    ns.print("┌──────────── CONTROLLER ────────────────────┐");
    ns.print(`│ Host: ${(reg.controller?.host ?? "STOPPED").padEnd(36)}│`);
    ns.print(`│ Mode: ${(reg.controller?.mode ?? "UNKNOWN").padEnd(36)}│`);
    ns.print(`│ Target: ${(reg.controller?.target ?? "none").padEnd(33)}│`);
    ns.print(`│ Threads Active: ${String(reg.controller?.threads ?? 0).padEnd(25)}│`);
    ns.print(`│ Income/min: ${formatMoney(reg.controller?.incomePerMin ?? 0).padEnd(28)}│`);
    ns.print("└────────────────────────────────────────────┘");

    // 3️⃣ ECONOMY
    ns.print("");
    ns.print("┌──────────── ECONOMY ───────────────────────┐");
    ns.print(`│ Cash: ${formatMoney(player.money).padEnd(36)}│`);
    ns.print(`│ Income/min: ${formatMoney(reg.economy?.incomePerMin ?? 0).padEnd(27)}│`);
    const lastActivity = reg.economy?.lastActivity ?? "none";
    ns.print(`│ Last Activity: ${lastActivity.padEnd(28)}│`);
    ns.print("└────────────────────────────────────────────┘");

    // 4️⃣ INFRA
    ns.print("");
    ns.print("┌──────────── INFRA ─────────────────────────┐");
    ns.print(`│ Home RAM: ${formatRam(home.maxRam)} / Cores: ${home.cpuCores}`.padEnd(40) + "│");
    ns.print(`│ Pservs: ${pservs.length} / Min: ${reg.infra?.pservs?.minRam ?? 0}GB / Max: ${reg.infra?.pservs?.maxRam ?? 0}GB`.padEnd(40) + "│");
    const darkwebProgs = reg.darkweb?.programsOwned ?? [];
    ns.print(`│ Darkweb Programs: ${darkwebProgs.length}`.padEnd(40) + "│");
    ns.print(`│ TOR: ${player.tor ? "YES" : "NO"}`.padEnd(40) + "│");
    ns.print("└────────────────────────────────────────────┘");

    // 5️⃣ SINGULARITY
    ns.print("");
    ns.print("┌──────────── SINGULARITY ───────────────────┐");
    ns.print(`│ Unlocked: ${String(!!ns.singularity).padEnd(33)}│`);
    ns.print(`│ Factions Joined: ${String(player.factions?.length ?? 0).padEnd(25)}│`);
    ns.print(`│ Current Faction Work: ${(reg.singularity?.currentFaction ?? "none").padEnd(20)}│`);
    ns.print(`│ Current Job: ${(player.companyName ?? "none").padEnd(30)}│`);
    ns.print(`│ Busy: ${String(ns.singularity?.isBusy?.() ?? false).padEnd(34)}│`);
    ns.print("└────────────────────────────────────────────┘");

    // 6️⃣ BACKDOOR
    ns.print("");
    ns.print("┌──────────── BACKDOOR ──────────────────────┐");
    ns.print(`│ Active Target: ${(reg.infra?.backdoor?.activeTarget ?? "none").padEnd(26)}│`);
    ns.print(`│ Last Installed: ${(reg.infra?.backdoor?.lastInstalled ?? "none").padEnd(25)}│`);
    const backdoorTs = reg.infra?.backdoor?.lastTimestamp ?? 0;
    ns.print(`│ Timestamp: ${backdoorTs > 0 ? formatTime(Date.now() - backdoorTs) : "n/a"}`.padEnd(40) + "│");
    ns.print("└────────────────────────────────────────────┘");

    // 7️⃣ AUTOROOT
    ns.print("");
    ns.print("┌──────────── AUTOROOT ──────────────────────┐");
    const autorootTs = reg.infra?.autoroot?.lastScan ?? 0;
    ns.print(`│ Last Scan: ${autorootTs > 0 ? formatTime(Date.now() - autorootTs) : "never"}`.padEnd(40) + "│");
    ns.print(`│ Servers Rooted: ${String(reg.infra?.autoroot?.rootedCount ?? 0).padEnd(27)}│");
    ns.print("└────────────────────────────────────────────┘");

    // 8️⃣ STOCKS
    ns.print("");
    ns.print("┌──────────── STOCKS ────────────────────────┐");
    ns.print(`│ Active: ${String(reg.stocks?.active ?? false).padEnd(33)}│");
    ns.print(`│ Profit: ${formatMoney(reg.stocks?.profit ?? 0).padEnd(32)}│");
    const tixAccess = ns.stock?.hasTIXAPIAccess?.() ?? false;
    const foursAccess = ns.stock?.has4SDataTIXAPIAccess?.() ?? false;
    ns.print(`│ TIX Access: ${String(tixAccess).padEnd(29)}│");
    ns.print(`│ 4S Access: ${String(foursAccess).padEnd(30)}│");
    ns.print("└────────────────────────────────────────────┘");

    // 9️⃣ DARKSCAPE
    ns.print("");
    ns.print("┌──────────── DARKSCAPE ─────────────────────┐");
    ns.print(`│ Discovered: ${String(reg.darkweb?.discovered ?? 0).padEnd(29)}│");
    ns.print(`│ Authenticated: ${String(reg.darkweb?.authenticated ?? 0).padEnd(25)}│");
    ns.print(`│ Recovered: ${String(reg.darkweb?.recovered ?? 0).padEnd(30)}│");
    ns.print(`│ Caches Opened: ${String(reg.darkweb?.cachesOpened ?? 0).padEnd(24)}│");
    ns.print("└────────────────────────────────────────────┘");

    // 🔟 RAM SNAPSHOT
    ns.print("");
    ns.print("┌──────────── RAM SNAPSHOT ───────────────────┐");
    const usedRam = ns.getServerUsedRam("home");
    const freeRam = home.maxRam - usedRam;
    ns.print(`│ Home Used/Free: ${formatRam(usedRam)} / ${formatRam(freeRam)}`.padEnd(40) + "│");
    
    const procs = ns.ps("home");
    let largestRam = 0;
    let rotationRam = 0;
    for (const proc of procs) {
      const ram = ns.getScriptRam(proc.filename, "home") * proc.threads;
      if (ram > largestRam) largestRam = ram;
      if (reg.rotation?.active && proc.filename.includes(reg.rotation.active)) {
        rotationRam = ram;
      }
    }
    ns.print(`│ Largest Script: ${formatRam(largestRam)}`.padEnd(40) + "│");
    ns.print(`│ Rotation Script: ${formatRam(rotationRam)}`.padEnd(40) + "│");
    ns.print("└────────────────────────────────────────────┘");

    await ns.sleep(1000);
  }
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => String(x).padStart(2, "0")).join(":");
}

function formatMoney(amount) {
  if (amount >= 1e12) return `$${(amount / 1e12).toFixed(2)}t`;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}b`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}m`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}k`;
  return `$${amount.toFixed(2)}`;
}

function formatRam(gb) {
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)}TB`;
  return `${gb.toFixed(0)}GB`;
}
