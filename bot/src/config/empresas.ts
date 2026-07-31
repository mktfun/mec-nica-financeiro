import * as path from 'path';
import * as fs from 'fs';

export interface EmpresaConfig {
  empresa_slug: string;
  nome_display: string;
  id_empresa_oi: string;  // ID interno do Oficina para troca de empresa no dropdown
  aliases: string[];       // nomes alternativos para matching por texto
}

export type EmpresaMap = Record<string, EmpresaConfig>;

let _cache: EmpresaMap | null = null;

function loadEmpresaMap(): EmpresaMap {
  if (_cache) return _cache;
  const jsonPath = path.join(__dirname, 'empresas.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  _cache = JSON.parse(raw) as EmpresaMap;
  return _cache;
}

/**
 * Resolve a config de empresa a partir de:
 * - store_id exato (ex: "st-02")
 * - empresa_slug (ex: "jab_jabaquara")
 * - aliases (ex: "jabaquara", "jab")
 */
export function resolveEmpresa(input: string): EmpresaConfig | null {
  const map = loadEmpresaMap();
  const lowerInput = input.trim().toLowerCase();

  // 1. Busca por store_id exato
  if (map[input]) return map[input];

  // 2. Busca por empresa_slug exato
  for (const config of Object.values(map)) {
    if (config.empresa_slug === lowerInput) return config;
  }

  // 3. Busca por aliases (substring match)
  for (const config of Object.values(map)) {
    if (config.aliases.some(alias => 
      lowerInput.includes(alias) || alias.includes(lowerInput)
    )) {
      return config;
    }
  }

  return null;
}

/**
 * Lista todas as empresas configuradas.
 */
export function listEmpresas(): Array<{ storeId: string } & EmpresaConfig> {
  const map = loadEmpresaMap();
  return Object.entries(map).map(([storeId, config]) => ({ storeId, ...config }));
}
