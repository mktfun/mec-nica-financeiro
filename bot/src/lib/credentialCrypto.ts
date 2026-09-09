/**
 * Utilitário de Criptografia Simétrica para Credenciais dos Bots (Node.js)
 * Algoritmo AES-GCM idêntico ao do frontend (src/lib/credentialCrypto.ts).
 */

const PREFIX = 'enc:v1:';

function getVaultSecret(): string {
  const key = process.env.BANK_VAULT_SECRET_KEY || process.env.BOT_SECRET_KEY || process.env.VITE_BANK_VAULT_PUBLIC_SALT;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[bot/credentialCrypto] BANK_VAULT_SECRET_KEY ausente no ambiente de produção. Operação abortada por segurança.');
    }
    console.warn('[bot/credentialCrypto] ⚠️ AVISO: Usando seed de fallback em desenvolvimento. Defina BANK_VAULT_SECRET_KEY no .env.');
    return 'conciliamec-bank-vault-secret-key-2026';
  }
  return key;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(getVaultSecret());
  const hash = await globalThis.crypto.subtle.digest('SHA-256', rawKey);

  return globalThis.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function decryptBankPassword(encryptedText: string): Promise<string> {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith(PREFIX)) {
    return encryptedText;
  }

  try {
    const rawBase64 = encryptedText.substring(PREFIX.length);
    const combined = Buffer.from(rawBase64, 'base64');

    if (combined.length <= 12) {
      throw new Error('Payload cifrado corrompido ou incompleto');
    }

    const iv = combined.subarray(0, 12);
    const cipherData = combined.subarray(12);
    const key = await getCryptoKey();

    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherData
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err: any) {
    console.error('[bot/credentialCrypto] Falha ao decifrar senha:', err.message || err);
    throw new Error('Não foi possível decifrar a senha da credencial bancária');
  }
}

export async function encryptBankPassword(plainText: string): Promise<string> {
  if (!plainText || plainText.startsWith(PREFIX)) return plainText;

  const key = await getCryptoKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const cipherBuffer = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const cipherArray = new Uint8Array(cipherBuffer);
  const combined = Buffer.concat([Buffer.from(iv), Buffer.from(cipherArray)]);

  return `${PREFIX}${combined.toString('base64')}`;
}
