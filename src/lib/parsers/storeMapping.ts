export const REDE_STORE_MAPPING: Record<string, string> = {
  "mpsantoandre": "Santo André - HD",
  "mpjabaquara": "Jabaquara - JAB",
  "mpjorgeberetta": "Jorge Beretta - DHJV",
  "reidooleomaua": "Maua - MHE",
  "mpkennedy": "Kennedy - MP",
  "mppiraporinha": "Piraporinha - EMPORIO",
  "mpplanalto": "Planalto - BRASICAR",
  "reidomodulo": "Rei do Módulo - MP",
  "mprudge": "Rudge Ramos - CAP",
  "mpdompedro1": "Dom Pedro - DP"
};

export function normalizeRedeStoreName(rawName: string): string {
  if (!rawName) return rawName;
  const normalized = rawName.trim().toLowerCase();
  
  if (REDE_STORE_MAPPING[normalized]) {
    return REDE_STORE_MAPPING[normalized];
  }
  
  // Se nÁo encontrar, retorna o original limpo
  return rawName.trim();
}
