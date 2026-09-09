import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Download } from '@playwright/test';

export interface PersistOfxOptions {
  download: Download;
  outputDir: string;
  store: string;
  agency?: string;
  account?: string;
  fromDate: string; // Formato YYYY-MM-DD
  toDate: string;   // Formato YYYY-MM-DD
}

export interface PersistOfxResult {
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  isSgml: boolean;
}

/**
 * Valida a integridade do arquivo OFX baixado do Itaú e salva no caminho de destino.
 * 
 * Previne:
 * 1. Arquivos vazios (0 bytes).
 * 2. Páginas HTML de erro de sessão expirada salvas erroneamente com extensão .ofx.
 * 3. Nomes fora do padrão reconhecido pelo pipeline contábil (`Extrato_{agencia}_{conta}_{from}_{to}.ofx`).
 */
export async function persistAndValidateOfx(options: PersistOfxOptions): Promise<PersistOfxResult> {
  const { download, outputDir, store, agency, account, fromDate, toDate } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Sanitiza dados para o nome do arquivo
  const cleanAccount = (account ?? 'conta').replace(/[^a-zA-Z0-9]/g, '');
  const cleanAgency = (agency ?? '').replace(/[^a-zA-Z0-9]/g, '');
  const cleanStore = store.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  const agencyPrefix = cleanAgency ? `${cleanAgency}_` : '';
  const fileName = `Extrato_${agencyPrefix}${cleanAccount}_${cleanStore}_${fromDate}_${toDate}.ofx`;
  const filePath = path.join(outputDir, fileName);

  // 1. Salva temporariamente
  const tempPath = path.join(outputDir, `.temp_${Date.now()}_${download.suggestedFilename()}`);
  await download.saveAs(tempPath);

  try {
    const stats = fs.statSync(tempPath);
    if (stats.size === 0) {
      throw new Error(`[OfxValidator] Arquivo baixado está vazio (0 bytes): ${download.suggestedFilename()}`);
    }

    // 2. Inspeciona o conteúdo inicial para assegurar formato OFX legítimo
    const sampleBuffer = Buffer.alloc(1024);
    const fd = fs.openSync(tempPath, 'r');
    const bytesRead = fs.readSync(fd, sampleBuffer, 0, 1024, 0);
    fs.closeSync(fd);

    const sampleHeader = sampleBuffer.subarray(0, bytesRead).toString('latin1');

    // Detecta se é página HTML mascarada (ex: página de sessão encerrada do Itaú)
    if (sampleHeader.includes('<html') || sampleHeader.includes('<!DOCTYPE html') || sampleHeader.includes('<head>')) {
      throw new Error(
        `[OfxValidator] Resposta do banco retornou uma página HTML de erro/sessão em vez de arquivo OFX válido.`
      );
    }

    const isSgml = sampleHeader.includes('OFXHEADER:') || sampleHeader.includes('ENCODING:');
    const isXml = sampleHeader.includes('<OFX>') || sampleHeader.includes('<?xml');

    if (!isSgml && !isXml && !sampleHeader.includes('<BANKTRANLIST>')) {
      throw new Error(
        `[OfxValidator] Arquivo não possui cabeçalho OFX reconhecido (SGML 1.0 ou XML 2.0). Amostra:\n${sampleHeader.slice(0, 150)}`
      );
    }

    // 3. Move o arquivo para o destino final definitivo
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    fs.renameSync(tempPath, filePath);

    // 4. Calcula o hash SHA-256 para trilha de auditoria
    const fileContent = fs.readFileSync(filePath);
    const sha256 = crypto.createHash('sha256').update(fileContent).digest('hex');

    console.log(`[OfxValidator] ✅ Extrato OFX validado com sucesso:`);
    console.log(`  - Arquivo: ${fileName}`);
    console.log(`  - Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  - SHA-256: ${sha256}`);

    return {
      filePath,
      fileName,
      fileSizeBytes: stats.size,
      sha256,
      isSgml,
    };
  } finally {
    // Garante remoção de arquivo temporário residual se algo quebrar
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
  }
}
