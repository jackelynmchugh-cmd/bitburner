/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("sleep");
  const crime = String(ns.args[0] ?? "Mug someone");
  const gain = Number(ns.args[1] ?? 25);
  const p = ns.getPlayer();
  const base = {
    strength: p.strength,
    defense: p.defense,
    dexterity: p.dexterity,
    agility: p.agility,
  };

  while (true) {
    const cur = ns.getPlayer();
    const done =
      cur.strength >= base.strength + gain &&
      cur.defense >= base.defense + gain &&
      cur.dexterity >= base.dexterity + gain &&
      cur.agility >= base.agility + gain;
    if (done) return;

    if (ns.singularity?.commitCrime("Mug")) {
      ns.singularity.commitCrime(crime, false);
      while (ns.singularity.isBusy()) await ns.sleep(1_000);
    } else {
      await ns.sleep(10_000);
    }
  }
}
