/** @param {NS} ns **/
import { updateRegistrySection } from "./registry.js";

export async function main(ns) {
  if (!ns.dnet) {
    ns.print("DarkscapeNavigator.exe not purchased yet");
    return;
  }
  
  ns.disableLog("ALL");
  
  // Password storage - save discovered passwords to a file
  const passwordFile = "/data/darknet-passwords.txt";
  const deployerScript = "darkweb-explorer.js";
  
  let passwordDb = {};
  
  // Load existing passwords
  try {
    const existing = ns.read(passwordFile);
    if (existing) {
      passwordDb = JSON.parse(existing);
    }
  } catch {}
  
  let discovered = 0;
  let authenticated = 0;
  let cachesOpened = 0;
  let recovered = 0;

  while (true) {
    try {
      // Probe for nearby darknet servers
      const neighbors = ns.dnet.probe();
      discovered = neighbors.length;
      
      for (const hostname of neighbors) {
        const details = ns.dnet.getServerAuthDetails(hostname);
        
        // Log server details
        ns.write("/data/darknet-servers.txt", JSON.stringify({hostname, details}, null, 2) + "\n", "a");

        // Skip if not connected or offline
        if (!details.isConnectedToCurrentServer || !details.isOnline) {
          continue;
        }
        
        // Check if we already know the password
        let password = passwordDb[hostname];
        
        if (!password) {
          // Try to authenticate with common passwords
          const commonPw = [
            "password",
            "admin",
            details.passwordHint?.toLowerCase() || "",
            hostname.toLowerCase(),
            details.modelId || ""
          ];
          
          // Try each password
          for (const pw of commonPw) {
            if (!pw) continue;
            
            try {
              const result = await ns.dnet.authenticate(hostname, pw);
              if (result.success) {
                password = pw;
                passwordDb[hostname] = password;
                authenticated++;
                ns.print(`SUCCESS: Authenticated ${hostname} with ${pw}`);
                
                // Save password to file
                ns.write(passwordFile, JSON.stringify(passwordDb, null, 2), "w");
                break;
              } else {
                // Try heartbleed to get more hints
                try {
                  const logResult = await ns.dnet.heartbleed(hostname, { peek: true });
                  if (logResult && logResult.logs) {
                    // Logs might contain hints or other server passwords
                    ns.print(`Heartbleed logs from ${hostname}: ${logResult.logs}`);
                  }
                } catch {}
              }
            } catch (e) {
              // Authentication failed, continue
            }
          }
          
          // If still no password, try packet capture (brute force method)
          if (!password && details.isConnectedToCurrentServer) {
            try {
              // Packet capture can reveal passwords in network traffic
              const packetResult = await ns.dnet.packetCapture(hostname);
              if (packetResult && packetResult.password) {
                password = packetResult.password;
                passwordDb[hostname] = password;
                authenticated++;
                ns.write(passwordFile, JSON.stringify(passwordDb, null, 2), "w");
              }
            } catch {}
          }
        }
        
        // If we have the password, connect and deploy explorer script
        if (password) {
          // Connect to session (can be done at distance once password is known)
          ns.dnet.connectToSession(hostname, password);
          
          // Deploy explorer script to the darknet server
          // This script will run ON the server and explore it
          if (ns.fileExists(deployerScript, "home")) {
            // Copy script and its dependencies to darknet server
            ns.scp([deployerScript, "registry.js"], hostname);
            
            // Execute explorer script on the darknet server
            // Only works if server is directly connected or has stasis link/backdoor
            if (details.isConnectedToCurrentServer) {
              ns.exec(deployerScript, hostname, 1, passwordFile, {
                preventDuplicates: true
              });
            }
          }
        }
      }
      
      // Aggregate findings from deployed explorers
      try {
        const findingsFile = "/data/darkweb-findings.txt";
        if (ns.fileExists(findingsFile, "home")) {
          const findingsContent = ns.read(findingsFile);
          if (findingsContent) {
            const lines = findingsContent.split("\n").filter(l => l.trim());
            for (const line of lines) {
              try {
                const finding = JSON.parse(line);
                recovered += finding.recovered || 0;
                cachesOpened += finding.cachesOpened || 0;
              } catch {}
            }
          }
        }
      } catch {}
      
      // Update registry
      updateRegistrySection(ns, "darkweb", {
        discovered,
        authenticated,
        recovered,
        cachesOpened
      });
    } catch (e) {
      ns.print(`Error in darkweb-discovery: ${e}`);
    }
    
    await ns.sleep(10000); // Probe every 10 seconds
  }
}
