/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.singularity?.applyToCompany || !ns.singularity?.workForCompany) return;
  const companies = ["ECorp", "MegaCorp", "Bachman & Associates", "NWO", "Clarke Incorporated", "OmniTek Incorporated", "Fulcrum Technologies"];

  for (const company of companies) {
    ns.singularity.applyToCompany(company, "Software");
  }

  for (const company of companies) {
    if (ns.singularity.workForCompany(company, false)) return;
  }
}
