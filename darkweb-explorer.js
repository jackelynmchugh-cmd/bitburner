/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

// This script runs ON darknet servers to explore them
export async function main(ns) {
  const passwordFile = ns.args[0] || "/data/darknet-passwords.txt";
  const currentHost = ns.getHostname();
  
  ns.disableLog("ALL");
  
  let cachesOpened = 0;
  let recovered = 0;
  
  try {
    // Free up RAM if needed (this also sometimes reveals cache files)
    if (ns.dnet && ns.dnet.influence && ns.dnet.influence.memoryReallocation) {
      while (true) {
        const freed = ns.dnet.influence.memoryReallocation();
        if (!freed) break;
        recovered++;
      }
    }
    
    // Look for .cache files on this server
    const cacheFiles = ns.ls(currentHost, '.cache');
    
    for (const cacheFile of cacheFiles) {
      try {
        if (ns.dnet && ns.dnet.openCache) {
          await ns.dnet.openCache(cacheFile);
          cachesOpened++;
        }
      } catch (e) {
        // Cache might be locked or already opened
      }
    }
    
    // Try phishing attack for money/charisma
    if (ns.dnet && ns.dnet.phishingAttack) {
      try {
        ns.dnet.phishingAttack();
      } catch (e) {
        // Might fail if charisma too low or already used
      }
    }
    
    // Probe for new neighbors and try to authenticate them
    if (ns.dnet && ns.dnet.probe) {
      const neighbors = ns.dnet.probe();
      
      // Load password database
      let passwordDb = {};
      try {
        const existing = ns.read(passwordFile);
        if (existing) {
          passwordDb = JSON.parse(existing);
        }
      } catch {}
      
      for (const hostname of neighbors) {
        const details = ns.dnet.getServerAuthDetails(hostname);
        
        if (!details.isConnectedToCurrentServer || !details.isOnline) {
          continue;
        }
        
        // Check if we already know the password
        let password = passwordDb[hostname];
        
        if (!password) {
          // Try common passwords
          const commonPw = [
            "password",
            "admin",
            details.passwordHint?.toLowerCase() || "",
            hostname.toLowerCase(),
            details.modelId || ""
          ];
          
          for (const pw of commonPw) {
            if (!pw) continue;
            
            try {
              const result = await ns.dnet.authenticate(hostname, pw);
              if (result.success) {
                password = pw;
                passwordDb[hostname] = password;
                
                // Save password
                ns.write(passwordFile, JSON.stringify(passwordDb, null, 2), "w");
                
                // Deploy this script to the new server
                ns.dnet.connectToSession(hostname, password);
                ns.scp(["darkweb-explorer.js", "registry.js"], hostname);
                ns.exec("darkweb-explorer.js", hostname, 1, passwordFile, {
                  preventDuplicates: true
                });
                
                break;
              } else {
                // Try heartbleed for hints
                try {
                  const logResult = await ns.dnet.heartbleed(hostname, { peek: true });
                  if (logResult && logResult.logs) {
                    ns.print(`Heartbleed logs from ${hostname}: ${logResult.logs}`);
                  }
                } catch {}
              }
            } catch (e) {
              // Continue trying
            }
          }
        }
      }
    }
    
    // Update registry with findings (if accessible)
    try {
      updateRegistrySection(ns, "darkweb", {
        recovered,
        cachesOpened
      });
    } catch (e) {
      // Registry might not be accessible from darknet server
      // Write to local file instead
      ns.write("/data/darkweb-findings.txt", JSON.stringify({
        host: currentHost,
        recovered,
        cachesOpened,
        timestamp: Date.now()
      }) + "\n", "a");
    }
    
  } catch (e) {
    ns.print(`Error in darkweb-explorer on ${currentHost}: ${e}`);
  }
  
  // Script completes and exits (one-shot exploration)
}
