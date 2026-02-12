/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  // Check if stock API exists at all
  if (!ns.stock) {
    ns.print("Stock market not available");
    return;
  }
  
  ns.disableLog("ALL");
  
  const money = ns.getServerMoneyAvailable("home");
  
  // Try to purchase TIX API if we don't have it (costs 5b)
  if (!ns.stock.hasTIXAPIAccess || !ns.stock.hasTIXAPIAccess()) {
    if (money >= 5e9 && ns.stock.purchaseTIXAPIDataFeed) {
      ns.stock.purchaseTIXAPIDataFeed();
    } else {
      ns.print("TIX API not available and cannot afford (need 5b)");
      return;
    }
  }
  
  // Try to purchase 4S Data if we don't have it (costs 1b)
  if (ns.stock.hasTIXAPIAccess && ns.stock.hasTIXAPIAccess()) {
    if (!ns.stock.has4SDataTIXAPIAccess || !ns.stock.has4SDataTIXAPIAccess()) {
      if (money >= 1e9 && ns.stock.purchase4SDataTIXAPIAccess) {
        ns.stock.purchase4SDataTIXAPIAccess();
      }
    }
  }
  
  // Check again after purchases
  if (!ns.stock.hasTIXAPIAccess || !ns.stock.hasTIXAPIAccess()) {
    ns.print("TIX API still not available after purchase attempt");
    return;
  }
  
  const symbols = ns.stock.getSymbols();
  let profit = 0;
  let totalValue = 0;

  while (true) {
    try {
      // Sell stocks with low forecast
      for (const sym of symbols) {
        try {
          const [shares, avgPrice, position] = ns.stock.getPosition(sym);
          
          if (shares > 0) {
            // Check forecast if available
            let forecast = 0.5; // Default neutral
            try {
              if (ns.stock.getForecast) {
                forecast = ns.stock.getForecast(sym);
              }
            } catch {}
            
            // Sell if forecast is low (or if we don't have forecast data, use price change)
            let shouldSell = false;
            
            if (forecast < 0.55) {
              shouldSell = true;
            } else if (!ns.stock.has4SDataTIXAPIAccess || !ns.stock.has4SDataTIXAPIAccess()) {
              // Without 4S data, use price change as indicator
              const currentPrice = ns.stock.getPrice(sym);
              const priceChange = (currentPrice - avgPrice) / avgPrice;
              // Sell if price dropped significantly or if we made good profit
              if (priceChange < -0.1 || (priceChange > 0.2 && position === "Long")) {
                shouldSell = true;
              }
            }
            
            if (shouldSell) {
              const salePrice = ns.stock.sellStock(sym, shares);
              if (salePrice > 0) {
                const cost = avgPrice * shares;
                profit += (salePrice - cost);
              }
            } else {
              // Track current value
              const currentPrice = ns.stock.getPrice(sym);
              totalValue += currentPrice * shares;
            }
          }
        } catch (e) {
          // Skip this symbol if there's an error
        }
      }

      // Buy stocks with high forecast
      const budget = Math.min(money * 0.1, money - 1e9); // 10% of cash, but keep 1b reserve
      let spent = 0;
      
      // Rank stocks by forecast or price trend
      const ranked = [];
      for (const sym of symbols) {
        try {
          let forecast = 0.5;
          let volatility = 0;
          let priceChange = 0;
          
          if (ns.stock.getForecast) {
            forecast = ns.stock.getForecast(sym);
          }
          
          if (ns.stock.getVolatility) {
            volatility = ns.stock.getVolatility(sym);
          }
          
          // Calculate price change if we have historical data
          const currentPrice = ns.stock.getPrice(sym);
          const [ownedShares, avgPrice] = ns.stock.getPosition(sym);
          
          if (avgPrice > 0) {
            priceChange = (currentPrice - avgPrice) / avgPrice;
          }
          
          // Score: prefer high forecast, or rising prices if no forecast
          const score = forecast > 0.5 ? forecast : (0.5 + priceChange);
          
          ranked.push({
            s: sym,
            score,
            forecast,
            volatility,
            ask: ns.stock.getAskPrice(sym),
            maxShares: ns.stock.getMaxShares(sym),
            owned: ownedShares || 0
          });
        } catch (e) {
          // Skip symbols with errors
        }
      }
      
      ranked.sort((a, b) => b.score - a.score);

      for (const stock of ranked) {
        if (stock.forecast < 0.6 && stock.score < 0.55) break;
        
        const room = Math.max(0, stock.maxShares - stock.owned);
        const canBuy = Math.floor((budget - spent) / stock.ask);
        const qty = Math.max(0, Math.min(room, canBuy));
        
        if (qty > 0) {
          try {
            const result = ns.stock.buyStock(stock.s, qty);
            if (result > 0) {
              spent += qty * stock.ask;
            }
          } catch (e) {
            // Purchase failed, continue
          }
        }
        
        if (spent >= budget) break;
      }
      
      // Update registry
      updateRegistrySection(ns, "stocks", {
        active: true,
        profit,
        totalValue,
        tixAccess: ns.stock.hasTIXAPIAccess(),
        foursAccess: ns.stock.has4SDataTIXAPIAccess ? ns.stock.has4SDataTIXAPIAccess() : false
      });
    } catch (e) {
      ns.print(`Error in stocks: ${e}`);
    }

    await ns.sleep(6000); // Check every 6 seconds
  }
}
