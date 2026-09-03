export const REDE_STORE_MAPPING: Record<string, string> = {
  "mpsantoandre": "Santo André - HD",
  "mpjabaquara": "Jabaquara - JAB",
  "mpjorgeberetta": "Jorge Beretta - DHJV",
  "reidooleomaua": "Maua - MHE",
  "mpkennedy": "Kennedy - MP",
  "mppiraporinha": "Piraporinha - EMPORIO",
  "mpplanalto": "Planalto - BRASICAR",
  "brasicar": "Planalto - BRASICAR",
  "planalto": "Planalto - BRASICAR",
  "reidomodulo": "Rei do Módulo - MP",
  "rei do modulo": "Rei do Módulo - MP",
  "rei do módulo": "Rei do Módulo - MP",
  "mprudge": "Rudge Ramos - CAP",
  "mpdompedro1": "Dom Pedro - DP",
  "76347036": "Kennedy - MP",
  "71854878": "Dom Pedro - DP",
  "104112840": "Santo André - HD",
  "101423446": "Planalto - BRASICAR",
  "101422997": "Piraporinha - EMPORIO",
  "101423667": "Jorge Beretta - DHJV",
  "63034336": "Rudge Ramos - CAP",
  "47712201": "Rei do Módulo - MP",
  "63304449": "Jabaquara - JAB",
  "102553424": "Maua - MHE"
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
