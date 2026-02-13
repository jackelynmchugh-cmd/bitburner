/** @param {NS} ns **/
import { getCapitalPlan } from "./capital-allocator.js";
import { updateRegistrySection } from "./registry.js";

export async function main(ns){
  if(!ns.stock || !ns.stock.hasTIXAPIAccess?.()) return;

  ns.disableLog("ALL");

  const maxPositionSize = 0.3; // Max 30% portfolio per stock
  const profitTarget = 1.2; // Exit at 20% gain
  const lossLimit = 0.9; // Exit at 10% loss
  
  let totalProfit = 0;

  while(true){
    const plan = getCapitalPlan(ns);
    const budget = plan.marketBudget;
    
    let portfolioValue = 0;
    let positionCount = 0;

    for(const sym of ns.stock.getSymbols()){
      try{
        const forecast = ns.stock.getForecast(sym);
        const price = ns.stock.getAskPrice(sym);
        const [shares, avgPrice] = ns.stock.getPosition(sym);
        const shortShares = ns.stock.getPosition(sym)[2] || 0;
        
        // LONG strategy
        if(forecast > 0.65 && shares === 0) {
          const maxShares = Math.floor((budget * maxPositionSize) / price);
          if(maxShares > 0) {
            ns.stock.buyStock(sym, maxShares);
            positionCount++;
          }
        }
        
        // EXIT long on profit/loss/forecast change
        if(shares > 0) {
          const gainPercent = price / avgPrice;
          
          if(gainPercent >= profitTarget || gainPercent <= lossLimit || forecast < 0.45) {
            const proceeds = price * shares;
            const cost = avgPrice * shares;
            const profit = proceeds - cost;
            totalProfit += profit;
            
            ns.stock.sellStock(sym, shares);
          } else {
            portfolioValue += proceeds;
            positionCount++;
          }
        }
        
        // SHORT strategy (if 4S data available)
        const has4S = ns.stock.has4SDataTIXAPIAccess?.() ?? false;
        if(has4S && forecast < 0.35 && shortShares === 0) {
          const maxShares = Math.floor((budget * maxPositionSize) / price);
          if(maxShares > 0) {
            ns.stock.shortStock(sym, maxShares);
            positionCount++;
          }
        }
        
        // EXIT short on profit/loss/forecast change
        if(shortShares > 0) {
          const gainPercent = price / avgPrice;
          
          if(gainPercent <= (1/profitTarget) || gainPercent >= (1/lossLimit) || forecast > 0.55) {
            const proceeds = price * shortShares;
            const cost = avgPrice * shortShares;
            const profit = cost - proceeds; // Reversed for short
            totalProfit += profit;
            
            ns.stock.sellShort(sym, shortShares);
          } else {
            portfolioValue += proceeds;
            positionCount++;
          }
        }
      } catch(e){
        // Skip on error
      }
    }
    
    updateRegistrySection(ns, "stocks", {
      active: positionCount > 0,
      positions: positionCount,
      portfolioValue,
      profit: totalProfit
    });

    await ns.sleep(4000);
  }
}