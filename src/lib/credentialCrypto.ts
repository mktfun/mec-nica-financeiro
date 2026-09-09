/**
 * Módulo de Criptografia e Utilitários para Credenciais Bancárias
 * Suporta execução isomórfica (Navegador e Node.js via globalThis.crypto).
 */

// Chave pública de cifragem para trânsito (Write-Only). O segredo real de decifragem reside exclusivamente no bot runner.
const PREFIX = 'enc:v1:';

function getVaultSalt(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (
      import.meta.env.VITE_BANK_VAULT_PUBLIC_SALT ||
      import.meta.env.VITE_SUPABASE_PROJECT_ID ||
      'conciliamec-vault'
    );
  }
  return (
    (typeof process !== 'undefined' && (process.env.VITE_BANK_VAULT_PUBLIC_SALT || process.env.VITE_SUPABASE_PROJECT_ID)) ||
    'conciliamec-vault'
  );
}

/**
 * Deriva uma CryptoKey AES-GCM para cifragem write-only
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(getVaultSalt());

  // Hash SHA-256 para obter 256 bits exatos
  const hash = await globalThis.crypto.subtle.digest('SHA-256', rawKey);

  return globalThis.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
}

/**
 * Converte Uint8Array para string Base64 de forma isomórfica
 */
function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Cifra a senha bancária usando AES-GCM com IV aleatório de 12 bytes.
 * Retorna string segura com prefixo 'enc:v1:<base64>'
 */
export async function encryptBankPassword(plainText: string): Promise<string> {
  if (!plainText || plainText.startsWith(PREFIX)) {
    return plainText;
  }

  const key = await getCryptoKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(plainText);

  const cipherBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const cipherArray = new Uint8Array(cipherBuffer);
  // Concatena IV (12 bytes) + Ciphertext
  const combined = new Uint8Array(iv.length + cipherArray.length);
  combined.set(iv, 0);
  combined.set(cipherArray, iv.length);

  return `${PREFIX}${toBase64(combined)}`;
}

/**
 * Decifragem desativada no cliente (OWASP A02:2021).
 * O navegador opera exclusivamente em modo Write-Only.
 */
export async function decryptBankPassword(_encryptedText: string): Promise<string> {
  throw new Error('[Security] Decifragem de senhas bancárias é restrita ao ambiente isolado do bot server.');
}

/**
 * Mascara CPF para exibição segura: 123.456.789-00 -> ***.***.789-00
 */
export function maskCpf(cpf: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    const part3 = digits.substring(6, 9);
    const d = digits.substring(9, 11);
    return `***.***.${part3}-${d}`;
  }
  // Fallback genérico se tiver tamanho diferente
  return cpf.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/, '***.***.$3-$4');
}

/**
 * Formata CPF em tempo real com pontuação: 000.000.000-00
 */
export function formatCpf(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Limpa qualquer caractere não numérico do CPF
 */
export function cleanCpf(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Formata Agência Bancária (apenas números, até 5 dígitos)
 */
export function formatAgency(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 5);
}

/**
 * Formata Conta Corrente mantendo o dígito verificador com traço
 */
export function formatAccount(value: string): string {
  if (!value) return '';
  // Remove caracteres especiais exceto hífen
  const cleaned = value.replace(/[^0-9kKxX-]/g, '').toUpperCase();
  return cleaned.slice(0, 15);
}
