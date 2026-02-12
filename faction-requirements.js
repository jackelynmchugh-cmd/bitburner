/** @param {NS} ns **/
// Faction requirements database and checking functions

export const FACTION_REQUIREMENTS = {
  // Early Game Factions
  "CyberSec": {
    type: "hacking",
    requirements: {
      backdoor: "CSEC"
    }
  },
  "Tian Di Hui": {
    type: "early",
    requirements: {
      money: 1e6,
      hackingLevel: 50,
      cities: ["Chongqing", "New Tokyo", "Ishima"]
    }
  },
  "Netburners": {
    type: "early",
    requirements: {
      hackingLevel: 80,
      hacknetLevels: 100,
      hacknetRam: 8,
      hacknetCores: 4
    }
  },
  "Shadows of Anarchy": {
    type: "early",
    requirements: {
      infiltration: true
    }
  },
  
  // City Factions
  "Sector-12": {
    type: "city",
    requirements: {
      city: "Sector-12",
      money: 15e6
    },
    conflicts: ["Chongqing", "New Tokyo", "Ishima", "Volhaven"]
  },
  "Chongqing": {
    type: "city",
    requirements: {
      city: "Chongqing",
      money: 20e6
    },
    conflicts: ["Sector-12", "Aevum", "Volhaven"]
  },
  "New Tokyo": {
    type: "city",
    requirements: {
      city: "New Tokyo",
      money: 20e6
    },
    conflicts: ["Sector-12", "Aevum", "Volhaven"]
  },
  "Ishima": {
    type: "city",
    requirements: {
      city: "Ishima",
      money: 30e6
    },
    conflicts: ["Sector-12", "Aevum", "Volhaven"]
  },
  "Aevum": {
    type: "city",
    requirements: {
      city: "Aevum",
      money: 40e6
    },
    conflicts: ["Chongqing", "New Tokyo", "Ishima", "Volhaven"]
  },
  "Volhaven": {
    type: "city",
    requirements: {
      city: "Volhaven",
      money: 50e6
    },
    conflicts: ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima"]
  },
  
  // Hacking Groups
  "NiteSec": {
    type: "hacking",
    requirements: {
      backdoor: "avmnite-02h",
      hackingLevel: 202
    }
  },
  "The Black Hand": {
    type: "hacking",
    requirements: {
      backdoor: "I.I.I.I",
      hackingLevel: 340
    }
  },
  "BitRunners": {
    type: "hacking",
    requirements: {
      backdoor: "run4theh111z",
      hackingLevel: 505
    }
  },
  
  // Megacorporations
  "ECorp": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "MegaCorp": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "KuaiGong International": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "Four Sigma": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "NWO": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "Blade Industries": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "OmniTek Incorporated": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "Bachman & Associates": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "Clarke Incorporated": {
    type: "corp",
    requirements: {
      companyRep: 400000
    }
  },
  "Fulcrum Secret Technologies": {
    type: "corp",
    requirements: {
      companyRep: 400000,
      backdoor: "fulcrumassets"
    }
  },
  
  // Criminal Organizations
  "Slum Snakes": {
    type: "criminal",
    requirements: {
      combatStats: 30,
      money: 1e6,
      karma: -9
    },
    conflicts: []
  },
  "Tetrads": {
    type: "criminal",
    requirements: {
      cities: ["Chongqing", "New Tokyo", "Ishima"],
      combatStats: 75,
      karma: -18
    },
    conflicts: []
  },
  "Silhouette": {
    type: "criminal",
    requirements: {
      companyPosition: ["CTO", "CFO", "CEO"],
      money: 15e6,
      karma: -22
    },
    conflicts: []
  },
  "Speakers for the Dead": {
    type: "criminal",
    requirements: {
      hackingLevel: 100,
      combatStats: 300,
      peopleKilled: 30,
      karma: -45
    },
    conflicts: ["CIA", "NSA"]
  },
  "The Dark Army": {
    type: "criminal",
    requirements: {
      hackingLevel: 300,
      combatStats: 300,
      city: "Chongqing",
      peopleKilled: 5,
      karma: -45
    },
    conflicts: ["CIA", "NSA"]
  },
  "The Syndicate": {
    type: "criminal",
    requirements: {
      hackingLevel: 200,
      combatStats: 200,
      cities: ["Aevum", "Sector-12"],
      money: 10e6,
      karma: -90
    },
    conflicts: ["CIA", "NSA"]
  },
  
  // Lategame Factions
  "The Covenant": {
    type: "lategame",
    requirements: {
      augmentations: 20,
      money: 75e9,
      hackingLevel: 850,
      combatStats: 850
    }
  },
  "Illuminati": {
    type: "lategame",
    requirements: {
      augmentations: 30,
      money: 150e9,
      hackingLevel: 1500,
      combatStats: 1200
    }
  },
  "Daedalus": {
    type: "lategame",
    requirements: {
      augmentations: 30,
      money: 100e9,
      hackingLevel: 2500,
      combatStatsAlt: 1500 // Alternative: all combat stats 1500
    }
  },
  
  // Endgame Factions (handled separately)
  "Bladeburners": {
    type: "endgame",
    requirements: {
      bitnode: [6, 7],
      sourceFile: [6, 7],
      bladeburnerRank: 25
    }
  },
  "Church of the Machine God": {
    type: "endgame",
    requirements: {
      bitnode: 13,
      sourceFile: 13,
      noAugmentations: true
    }
  }
};

export function checkFactionRequirements(ns, factionName) {
  const req = FACTION_REQUIREMENTS[factionName];
  if (!req) return { met: false, reason: "Unknown faction" };
  
  const player = ns.getPlayer();
  const requirements = req.requirements;
  
  // Check conflicts
  if (req.conflicts) {
    for (const conflict of req.conflicts) {
      if (player.factions && player.factions.includes(conflict)) {
        return { met: false, reason: `Conflicts with ${conflict}` };
      }
    }
  }
  
  // Check money
  if (requirements.money && player.money < requirements.money) {
    // Use ns.format.number instead of ns.formatNumber (3.0.0 change)
    const formattedMoney = ns.format?.number ? ns.format.number(requirements.money) : `$${requirements.money.toLocaleString()}`;
    return { met: false, reason: `Need ${formattedMoney}` };
  }
  
  // Check hacking level
  if (requirements.hackingLevel && player.hacking < requirements.hackingLevel) {
    return { met: false, reason: `Need hacking level ${requirements.hackingLevel}` };
  }
  
  // Check city
  if (requirements.city && player.city !== requirements.city) {
    return { met: false, reason: `Need to be in ${requirements.city}` };
  }
  
  // Check cities (any of)
  if (requirements.cities && !requirements.cities.includes(player.city)) {
    return { met: false, reason: `Need to be in ${requirements.cities.join(", ")}` };
  }
  
  // Check combat stats
  if (requirements.combatStats) {
    const stats = [player.strength, player.defense, player.dexterity, player.agility];
    const minStat = Math.min(...stats);
    if (minStat < requirements.combatStats) {
      return { met: false, reason: `Need all combat stats >= ${requirements.combatStats}` };
    }
  }
  
  // Check combat stats (alternative)
  if (requirements.combatStatsAlt) {
    const stats = [player.strength, player.defense, player.dexterity, player.agility];
    const minStat = Math.min(...stats);
    if (minStat < requirements.combatStatsAlt) {
      return { met: false, reason: `Need all combat stats >= ${requirements.combatStatsAlt}` };
    }
  }
  
  // Check karma
  if (requirements.karma && player.karma > requirements.karma) {
    return { met: false, reason: `Need karma <= ${requirements.karma}` };
  }
  
  // Check backdoor
  if (requirements.backdoor) {
    const server = ns.getServer(requirements.backdoor);
    if (!server || !server.backdoorInstalled) {
      return { met: false, reason: `Need backdoor on ${requirements.backdoor}` };
    }
  }
  
  // Check company rep
  if (requirements.companyRep) {
    if (!player.companyName) {
      return { met: false, reason: `Need ${requirements.companyRep} company reputation` };
    }
    // Note: Would need to check actual company rep, but this is a basic check
  }
  
  // Check company position
  if (requirements.companyPosition) {
    if (!player.companyName) {
      return { met: false, reason: `Need to be ${requirements.companyPosition.join(" or ")}` };
    }
    // Note: Would need to check actual position
  }
  
  // Check augmentations
  if (requirements.augmentations) {
    const ownedAugs = ns.singularity ? ns.singularity.getOwnedAugmentations(true) : [];
    if (ownedAugs.length < requirements.augmentations) {
      return { met: false, reason: `Need ${requirements.augmentations} augmentations` };
    }
  }
  
  // Check hacknet (basic - would need hacknet API)
  if (requirements.hacknetLevels || requirements.hacknetRam || requirements.hacknetCores) {
    // Would need hacknet API access to check
    // For now, assume not met if requirements exist
    return { met: false, reason: "Hacknet requirements not checked" };
  }
  
  // Check people killed
  if (requirements.peopleKilled !== undefined) {
    if ((player.numPeopleKilled || 0) < requirements.peopleKilled) {
      return { met: false, reason: `Need ${requirements.peopleKilled} people killed` };
    }
  }
  
  // Check infiltration
  if (requirements.infiltration) {
    // Would need infiltration API
    return { met: false, reason: "Infiltration requirement not checked" };
  }
  
  return { met: true, reason: "All requirements met" };
}

export function getAvailableFactions(ns) {
  const available = [];
  const player = ns.getPlayer();
  
  for (const [factionName, req] of Object.entries(FACTION_REQUIREMENTS)) {
    const check = checkFactionRequirements(ns, factionName);
    if (check.met) {
      available.push({
        name: factionName,
        type: req.type,
        priority: getFactionPriority(req.type)
      });
    }
  }
  
  // Sort by priority (early > hacking > city > corp > criminal > lategame)
  available.sort((a, b) => a.priority - b.priority);
  
  return available;
}

function getFactionPriority(type) {
  const priorities = {
    "early": 1,
    "hacking": 2,
    "city": 3,
    "corp": 4,
    "criminal": 5,
    "lategame": 6,
    "endgame": 7
  };
  return priorities[type] || 99;
}

export function prioritizeFactionsForWork(ns, joinedFactions) {
  if (!joinedFactions || joinedFactions.length === 0) return [];
  
  const player = ns.getPlayer();
  const prioritized = [];
  
  for (const faction of joinedFactions) {
    const req = FACTION_REQUIREMENTS[faction];
    if (!req) {
      prioritized.push({ faction, priority: 999 });
      continue;
    }
    
    let priority = getFactionPriority(req.type);
    
    // Boost priority for factions with low rep
    if (ns.singularity && ns.singularity.getFactionRep) {
      try {
        const rep = ns.singularity.getFactionRep(faction);
        if (rep < 10000) priority -= 2; // Very low rep
        else if (rep < 100000) priority -= 1; // Low rep
      } catch {}
    }
    
    // Boost priority for early game factions
    if (req.type === "early" || req.type === "hacking") {
      priority -= 1;
    }
    
    prioritized.push({ faction, priority });
  }
  
  // Sort by priority (lower = higher priority)
  prioritized.sort((a, b) => a.priority - b.priority);
  
  return prioritized.map(p => p.faction);
}
