/** @param {NS} ns **/
export async function main(ns) {
  if (!ns.stock?.hasTIXAPIAccess || !ns.stock.hasTIXAPIAccess()) return;
  const symbols = ns.stock.getSymbols();

  for (const sym of symbols) {
    const [shares] = ns.stock.getPosition(sym);
    const forecast = ns.stock.getForecast(sym);
    if (shares > 0 && forecast < 0.55) ns.stock.sellStock(sym, shares);
  }

  const budget = ns.getServerMoneyAvailable("home") * 0.1;
  let spent = 0;
  const ranked = symbols
    .map((s) => ({ s, f: ns.stock.getForecast(s), ask: ns.stock.getAskPrice(s) }))
    .sort((a, b) => b.f - a.f);

  for (const { s, f, ask } of ranked) {
    if (f < 0.6) break;
    const maxShares = ns.stock.getMaxShares(s);
    const [owned] = ns.stock.getPosition(s);
    const room = Math.max(0, maxShares - owned);
    const canBuy = Math.floor((budget - spent) / ask);
    const qty = Math.max(0, Math.min(room, canBuy));
    if (qty > 0) {
      ns.stock.buyStock(s, qty);
      spent += qty * ask;
    }
    if (spent >= budget) break;
  }
}
