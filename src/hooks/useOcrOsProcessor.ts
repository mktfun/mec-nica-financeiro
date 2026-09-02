import { useState } from 'react';
import { StoreRow } from '@/lib/supabase';
import { normalizeRedeStoreName } from '@/lib/parsers/storeMapping';

export interface OcrPaymentInstallment {
  installment: number;
  due_date: string;
  method: string; // "Débito" | "Crédito" | "PIX" | "Dinheiro" | "Boleto"
  amount: number;
}

export interface ExtractedOcrOsItem {
  id: string;
  os_number: string;
  store_id: string;
  store_name: string;
  raw_store_name: string;
  client_name: string;
  client_cpf?: string;
  plate: string;
  vehicle?: string;
  total_value: number;
  paid_value: number;
  open_value: number;
  opened_at: string;
  closed_at: string | null;
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  raw_status: string;
  payment_method: string;
  payments: OcrPaymentInstallment[];
  pix_transfer_value: number;
  credit_value: number;
  debit_value: number;
  cash_value: number;
  is_verified: boolean;
  confidence?: number;
  source_image_name?: string;
}

export interface OcrBatchQueueItem {
  id: string;
  file?: File;
  base64: string;
  name: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  error?: string;
  extractedItem?: ExtractedOcrOsItem;
}

export interface OcrBatchProgress {
  processed: number;
  total: number;
  batch: number;
  totalBatches: number;
  percentage: number;
  currentStoreName?: string;
}

export function sanitizeOsNumber(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/(?:faturamento|faturada|fatura|fatur|fat|ordem|os|nº|num)[\s:]*/gi, '').trim();
  const matchDigits = cleaned.match(/\d+/);
  return matchDigits ? matchDigits[0] : cleaned.replace(/[^a-zA-Z0-9]/g, '');
}

function matchStoreId(rawName: string, stores: StoreRow[], fallbackStoreId?: string): { storeId: string; storeName: string } {
  if (!rawName && fallbackStoreId) {
    const s = stores.find(x => x.id === fallbackStoreId);
    return { storeId: fallbackStoreId, storeName: s?.name || fallbackStoreId };
  }

  const clean = (rawName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // 1. Check direct alias mapping
  const normalizedAlias = normalizeRedeStoreName(rawName);
  const aliasMatch = stores.find(s => s.name.toLowerCase().includes(normalizedAlias.toLowerCase()) || normalizedAlias.toLowerCase().includes(s.name.toLowerCase()));
  if (aliasMatch) {
    return { storeId: aliasMatch.id, storeName: aliasMatch.name };
  }

  // 2. Fuzzy / Substring match in stores list
  for (const store of stores) {
    const sClean = store.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sClean.includes(clean) || clean.includes(sClean)) {
      return { storeId: store.id, storeName: store.name };
    }
    // Specific keywords
    if (clean.includes('maua') && store.name.toLowerCase().includes('maua')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('kennedy') && store.name.toLowerCase().includes('kennedy')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('santoandre') && store.name.toLowerCase().includes('santo andré')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('planalto') && store.name.toLowerCase().includes('planalto')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('rudge') && store.name.toLowerCase().includes('rudge')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('piraporinha') && store.name.toLowerCase().includes('piraporinha')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('dompedro') && store.name.toLowerCase().includes('dom pedro')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('jabaquara') && store.name.toLowerCase().includes('jabaquara')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('beretta') && store.name.toLowerCase().includes('beretta')) return { storeId: store.id, storeName: store.name };
    if (clean.includes('modulo') && store.name.toLowerCase().includes('módulo')) return { storeId: store.id, storeName: store.name };
  }

  if (fallbackStoreId) {
    const s = stores.find(x => x.id === fallbackStoreId);
    return { storeId: fallbackStoreId, storeName: s?.name || fallbackStoreId };
  }

  const defaultStore = stores[0];
  return { storeId: defaultStore?.id || 'st-01', storeName: defaultStore?.name || 'Matriz' };
}

export function useOcrOsProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrBatchProgress>({
    processed: 0,
    total: 0,
    batch: 0,
    totalBatches: 0,
    percentage: 0
  });

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processSingleImage = async (
    imageBase64: string,
    stores: StoreRow[],
    fallbackStoreId?: string,
    retryCount = 0
  ): Promise<ExtractedOcrOsItem | null> => {
    try {
      const dataUri = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2409',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all fields from this Ordem de Servico screen (especially headers and Pagamentos tab if visible):
- empresa_loja: string (store name from top left dropdown)
- os_number: string (codigo)
- client_name: string
- client_cpf: string
- plate: string
- vehicle: string
- total_value: number (Total da OS in BRL)
- paid_value: number (Valor Pago in BRL)
- open_value: number (Restante in BRL, default 0 if fully paid)
- opened_at: string (YYYY-MM-DD)
- closed_at: string (YYYY-MM-DD or null)
- status: string ("finalizada" if open_value == 0 or paid_value >= total_value, else "em_aberto" or "pago_parcial")
- raw_status: string
- payments: array of { installment: number, due_date: string (YYYY-MM-DD), method: string ("Debito" | "Credito" | "Pix" | "Dinheiro" | "Boleto"), amount: number }
- debit_value: number (sum of Debito)
- credit_value: number (sum of Credito)
- pix_transfer_value: number (sum of Pix)
- cash_value: number (sum of Dinheiro)

Return JSON object: { "service_order": { ... } }`
                },
                {
                  type: 'image_url',
                  image_url: dataUri
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        if (response.status === 429 && retryCount < 3) {
          console.warn(`[useOcrOsProcessor] Rate limit (429) hit. Retrying in ${(retryCount + 1) * 2000}ms...`);
          await sleep((retryCount + 1) * 2000);
          return processSingleImage(imageBase64, stores, fallbackStoreId, retryCount + 1);
        }
        throw new Error(`Mistral API HTTP ${response.status}: ${await response.text()}`);
      }

      const resJson = await response.json();
      const rawContent = resJson.choices?.[0]?.message?.content;
      if (!rawContent) return null;

      const parsed = JSON.parse(rawContent);
      const data = parsed.service_order || parsed;

      const { storeId, storeName } = matchStoreId(data.empresa_loja || '', stores, fallbackStoreId);

      const totalVal = Number(data.total_value) || 0;
      const paidVal = Number(data.paid_value) || 0;
      const openVal = data.open_value !== undefined ? Number(data.open_value) : Math.max(0, totalVal - paidVal);

      const payments: OcrPaymentInstallment[] = Array.isArray(data.payments)
        ? data.payments.map((p: any, idx: number) => ({
            installment: Number(p.installment) || idx + 1,
            due_date: p.due_date || data.opened_at || new Date().toISOString().split('T')[0],
            method: p.method || 'Débito',
            amount: Number(p.amount) || 0
          }))
        : [];

      let debitVal = Number(data.debit_value) || 0;
      let creditVal = Number(data.credit_value) || 0;
      let pixVal = Number(data.pix_transfer_value) || 0;
      let cashVal = Number(data.cash_value) || 0;

      // If breakdown not aggregated, sum from payments array
      if (debitVal === 0 && creditVal === 0 && pixVal === 0 && cashVal === 0 && payments.length > 0) {
        payments.forEach(p => {
          const m = (p.method || '').toLowerCase();
          if (m.includes('deb') || m.includes('díbito')) debitVal += p.amount;
          else if (m.includes('cred') || m.includes('crédito')) creditVal += p.amount;
          else if (m.includes('pix') || m.includes('transf')) pixVal += p.amount;
          else if (m.includes('dinh') || m.includes('especie') || m.includes('espécie')) cashVal += p.amount;
        });
      }

      let canonicalStatus: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada' = 'em_aberto';
      if (openVal <= 0.05 && totalVal > 0) {
        canonicalStatus = 'finalizada';
      } else if (paidVal > 0 && openVal > 0.05) {
        canonicalStatus = 'pago_parcial';
      }

      const cleanOsNumber = sanitizeOsNumber(String(data.os_number || ''));

      return {
        id: `ocr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        os_number: cleanOsNumber,
        store_id: storeId,
        store_name: storeName,
        raw_store_name: data.empresa_loja || '',
        client_name: data.client_name || 'Cliente',
        client_cpf: data.client_cpf || '',
        plate: (data.plate || 'N/I').toUpperCase().replace(/[^A-Z0-9]/g, ''),
        vehicle: data.vehicle || '',
        total_value: totalVal,
        paid_value: paidVal,
        open_value: openVal,
        opened_at: data.opened_at || new Date().toISOString().split('T')[0],
        closed_at: data.closed_at || (canonicalStatus === 'finalizada' ? (data.opened_at || new Date().toISOString().split('T')[0]) : null),
        status: canonicalStatus,
        raw_status: data.raw_status || (canonicalStatus === 'finalizada' ? 'Finalizada' : 'Em Aberto'),
        payment_method: payments.length > 0 ? payments.map(p => p.method).join(', ') : (debitVal > 0 ? 'Débito' : creditVal > 0 ? 'Crédito' : pixVal > 0 ? 'PIX' : cashVal > 0 ? 'Dinheiro' : 'A Combinar'),
        payments,
        debit_value: debitVal,
        credit_value: creditVal,
        pix_transfer_value: pixVal,
        cash_value: cashVal,
        is_verified: true,
        confidence: 0.95
      };
    } catch (err) {
      console.error('[useOcrOsProcessor] Error parsing image:', err);
      return null;
    }
  };

  const processBatchQueue = async (
    items: Array<{ id: string; base64: string; name: string; storeId?: string }>,
    stores: StoreRow[],
    options?: { batchSize?: number; delayMs?: number }
  ): Promise<ExtractedOcrOsItem[]> => {
    setIsProcessing(true);
    const batchSize = options?.batchSize || 2;
    const delayMs = options?.delayMs || 1500;
    const total = items.length;
    const totalBatches = Math.ceil(total / batchSize);
    const results: ExtractedOcrOsItem[] = [];

    setProgress({
      processed: 0,
      total,
      batch: 0,
      totalBatches,
      percentage: 0
    });

    for (let b = 0; b < totalBatches; b++) {
      const start = b * batchSize;
      const chunk = items.slice(start, start + batchSize);

      setProgress(prev => ({
        ...prev,
        batch: b + 1,
        percentage: Math.round((results.length / total) * 100),
        currentStoreName: chunk[0]?.storeId ? stores.find(s => s.id === chunk[0].storeId)?.name : undefined
      }));

      // Process chunk items concurrently
      const chunkPromises = chunk.map(item =>
        processSingleImage(item.base64, stores, item.storeId).then(extracted => {
          if (extracted) {
            extracted.source_image_name = item.name;
          }
          return extracted;
        })
      );

      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.forEach(res => {
        if (res && res.os_number) {
          const key = `${res.store_id}::${res.os_number}`;
          if (!results.some(r => `${r.store_id}::${r.os_number}` === key)) {
            results.push(res);
          }
        }
      });

      setProgress(prev => ({
        ...prev,
        processed: results.length,
        percentage: Math.round((results.length / total) * 100)
      }));

      // Delay between batches to prevent rate limits
      if (b < totalBatches - 1) {
        await sleep(delayMs);
      }
    }

    setIsProcessing(false);
    setProgress(prev => ({ ...prev, percentage: 100 }));
    return results;
  };

  return {
    isProcessing,
    progress,
    processBatchQueue,
    processSingleImage
  };
}
