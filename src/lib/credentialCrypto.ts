/**
 * Módulo de Criptografia e Utilitários para Credenciais Bancárias
 * Suporta execução isomórfica (Navegador e Node.js via globalThis.crypto).
 */

const SECRET_SEED = 'conciliamec-bank-vault-secret-key-2026';
const PREFIX = 'enc:v1:';

/**
 * Deriva uma CryptoKey AES-GCM a partir da seed do sistema
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(SECRET_SEED);

  // Hash SHA-256 para obter 256 bits exatos
  const hash = await globalThis.crypto.subtle.digest('SHA-256', rawKey);

  return globalThis.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
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
 * Converte Base64 para Uint8Array de forma isomórfica
 */
function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
 * Decifra a senha bancária cifrada em formato 'enc:v1:<base64>'.
 */
export async function decryptBankPassword(encryptedText: string): Promise<string> {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith(PREFIX)) {
    return encryptedText; // Já em texto claro ou legado
  }

  try {
    const rawBase64 = encryptedText.substring(PREFIX.length);
    const combined = fromBase64(rawBase64);

    if (combined.length <= 12) {
      throw new Error('Payload cifrado corrompido ou incompleto');
    }

    const iv = combined.slice(0, 12);
    const cipherData = combined.slice(12);
    const key = await getCryptoKey();

    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherData
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err: any) {
    console.error('[credentialCrypto] Falha na decifragem da senha:', err.message || err);
    throw new Error('Não foi possível decifrar a senha bancária');
  }
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
