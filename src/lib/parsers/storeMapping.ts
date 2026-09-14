export const REDE_STORE_MAPPING: Record<string, string> = {
  // Mapeamentos Canônicos de Estabelecimento REDE (Verificados via Extratos Itaú)
  "76347036": "Kennedy - MP",          // st-04 (Washington Luis / Kennedy)
  "71854878": "Rudge Ramos - CAP",      // st-07 (CAP MP)
  "104112840": "Jabaquara - JAB",       // st-02 (SBC / Jabaquara)
  "101423446": "Jorge Beretta - DHJV",  // st-03 (Mauá Dom Pedro / Jorge Beretta)
  "101422997": "Santo André - HD",      // st-08 (Vila Vivaldi / HD)
  "101423667": "Rei do Módulo - MP",    // st-09 (General Osório / Rei do Módulo)
  "63034336": "Maua - MHE",             // 3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f (Mauá Orion)
  "47712201": "Piraporinha - EMPORIO",  // st-05 (Piraporinha / Empório)
  "63304449": "Planalto - BRASICAR",    // st-06 (Brasicar / Planalto)
  "102553424": "Dom Pedro - DP",        // st-01 (Santo André / Dom Pedro)

  // Nomes dos estabelecimentos nos relatórios da Rede
  "mpsantoandre": "Santo André - HD",
  "mpjabaquara": "Jabaquara - JAB",
  "mpjorgeberetta": "Jorge Beretta - DHJV",
  "reidooleomaua": "Maua - MHE",
  "mpkennedy": "Kennedy - MP",
  "mppiraporinha": "Piraporinha - EMPORIO",
  "mpplanalto": "Planalto - BRASICAR",
  "brasicar": "Planalto - BRASICAR",
  "brasicar mp": "Planalto - BRASICAR",
  "planalto": "Planalto - BRASICAR",
  "reidomodulo": "Rei do Módulo - MP",
  "rei do modulo": "Rei do Módulo - MP",
  "rei do módulo": "Rei do Módulo - MP",
  "rei do modulo mp": "Rei do Módulo - MP",
  "rei do módulo mp": "Rei do Módulo - MP",
  "mprudge": "Rudge Ramos - CAP",
  "cap mp": "Rudge Ramos - CAP",
  "mpdompedro1": "Dom Pedro - DP",
  "dom pedro mp": "Dom Pedro - DP",
  "hd mp": "Santo André - HD",
  "jabaquara mp": "Jabaquara - JAB",
  "jorge beretta mp": "Jorge Beretta - DHJV",
  "kennedy mp": "Kennedy - MP",
  "maua orion": "Maua - MHE",
  "mauá orion": "Maua - MHE",
  "emporio do oleo": "Piraporinha - EMPORIO",
  "empório do óleo": "Piraporinha - EMPORIO"
};

export function normalizeRedeStoreName(rawName: string): string {
  if (!rawName) return rawName;
  const normalized = rawName.trim().toLowerCase();
  
  if (REDE_STORE_MAPPING[normalized]) {
    return REDE_STORE_MAPPING[normalized];
  }
  
  if (REDE_STORE_MAPPING[rawName.trim()]) {
    return REDE_STORE_MAPPING[rawName.trim()];
  }
  
  return rawName.trim();
}
