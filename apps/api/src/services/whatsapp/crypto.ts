import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer {
  const value = process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY;
  if (!value) throw new Error('Criptografia das credenciais do WhatsApp não configurada');
  const key = /^[0-9a-f]{64}$/i.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('WHATSAPP_CREDENTIALS_ENCRYPTION_KEY deve representar exatamente 32 bytes');
  }
  return key;
}

export function assertWhatsAppEncryptionConfigured() {
  encryptionKey();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function decryptSecret(value: string): string {
  const [version, iv, tag, ciphertext, ...extra] = value.split(':');
  if (version !== 'v1' || !iv || !tag || !ciphertext || extra.length) {
    throw new Error('Formato de credencial criptografada inválido');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
