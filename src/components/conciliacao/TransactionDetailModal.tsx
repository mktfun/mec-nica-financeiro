import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Percent,
  Landmark,
  CalendarPlus,
  Link2,
  Unlink,
  FileEdit,
  Copy,
  Check,
  Building2,
  Hash,
  Tag,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

export interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  storeId: string;
  currentDate: string;
  onMoveToToday?: (tx: any) => Promise<void> | void;
  onLinkOs?: (tx: any) => void;
  onUnlinkOs?: (txId: string, osNum: string) => void;
  onEditCategory?: (tx: any) => void;
  isMoving?: boolean;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  transaction: tx,
  storeId,
  currentDate,
  onMoveToToday,
  onLinkOs,
  onUnlinkOs,
  onEditCategory,
  isMoving = false
}: TransactionDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const clean = dateStr.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return clean;
    } catch {
      return dateStr || '';
    }
  };

  if (!tx) return null;

  const isIn = tx.type === 'in';
  const amount = Math.abs(Number(tx.amount || 0));

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copiado para a área de transferência!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Nome limpo da contraparte sem repetição de prefixos brutos
  let primaryName = (tx.counterpart_name || tx.recipient_name || tx.title || tx.subtitle || '').trim();

  // Caso traço '-' ou vazio: busca no fitid ou nas contas vinculadas
  if (!primaryName || primaryName === '-' || primaryName === '—') {
    const raw = `${tx.fitid || ''} ${tx.subtitle || ''} ${tx.counterpart_name || ''}`.toLowerCase();
    if (raw.includes('juroslimitedaconta')) {
      primaryName = 'Juros Limite da Conta Itaú';
    } else if (raw.includes('iof')) {
      primaryName = 'IOF Bancário Itaú';
    } else if (raw.includes('tarifa') || raw.includes('tar_') || raw.includes('taxa')) {
      primaryName = 'Tarifa de Conta Itaú';
    } else if (raw.includes('sispag')) {
      primaryName = 'Pagamento Fornecedores (Sispag)';
    } else if (tx.expenseMatch?.matchedBill?.recipient_name) {
      primaryName = tx.expenseMatch.matchedBill.recipient_name;
    } else {
      primaryName = isIn ? 'Crédito em Conta' : 'Débito em Conta';
    }
  }

  // Remove prefixos bancários comuns
  primaryName = primaryName
    .replace(/^(BOLETO PAGO|PIX ENVIADO|PIX RECEBIDO|RECEBIMENTOS?|PAGAMENTOS?|ITAU|SISPAG SALARIOS|SISPAG FORNECEDORES)\s+/i, '')
    .replace(/\b(CART001008|7386166586)\b/g, '')
    .trim();

  // Remove CNPJ/CPF do final do nome se estiver grudado
  primaryName = primaryName.replace(/\s+\d{2,3}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, '').trim();
  primaryName = primaryName.replace(/\s+\d{3}\.\d{3}\.\d{3}-\d{2}$/, '').trim();

  // De-duplicação de palavras repetidas
  const words = primaryName.split(/\s+/);
  if (words.length >= 2) {
    if (words.length === 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
      primaryName = words[0];
    } else if (words.length >= 4) {
      for (let pLen = 3; pLen >= 1; pLen--) {
        if (words.length > pLen * 2) {
          const p1 = words.slice(0, pLen).join(' ').toLowerCase();
          const p2 = words.slice(pLen, pLen * 2).join(' ').toLowerCase();
          if (p2.startsWith(p1) || p1 === p2) {
            primaryName = words.slice(pLen).join(' ');
            break;
          }
        }
      }
    }
  }

  if (!primaryName || primaryName === '-' || primaryName === '—') {
    primaryName = isIn ? 'Crédito em Conta' : 'Débito em Conta';
  }

  // Identificação do tipo fiduciário e avatar Revolut ampliado
  let iconType: 'card' | 'bill' | 'pix_in' | 'pix_out' | 'cash' | 'tax' | 'bank' = isIn ? 'pix_in' : 'bill';
  let natureLabel = isIn ? 'Crédito Bancário' : 'Débito Bancário';
  const fullText = `${tx.title || ''} ${tx.subtitle || ''} ${tx.counterpart_name || ''} ${tx.manual_category || ''}`.toUpperCase();

  if (tx.isRede || /REDE|REDECARD|CIELO|CARTAO|CARTOES/.test(fullText)) {
    natureLabel = 'Crédito de Vendas Rede (Cartão)';
    iconType = 'card';
  } else if (tx.isMatchedExpense || /BOLETO|FEMATH|LELO|PRPK|AUTO PECAS|GESCONT|ESCAP/.test(fullText)) {
    natureLabel = 'Boleto / Pagamento Fornecedor';
    iconType = 'bill';
  } else if (/PIX ENVIADO/.test(fullText) || (tx.type === 'out' && /PIX/.test(fullText))) {
    natureLabel = 'Transferência PIX Enviada';
    iconType = 'pix_out';
  } else if (/RECEBIMENTO|PIX/.test(fullText) && isIn) {
    natureLabel = 'Transferência PIX Recebida';
    iconType = 'pix_in';
  } else if (/SAQUE|ATM|RETIRADA/.test(fullText)) {
    natureLabel = 'Saque ATM / Retirada em Dinheiro';
    iconType = 'cash';
  } else if (/JUROS|IOF|TAR|TARIFA/.test(fullText)) {
    natureLabel = 'Tarifa / Encargo Bancário';
    iconType = 'tax';
  }

  const renderLargeAvatar = () => {
    if (isIn) {
      if (iconType === 'card') {
        return (
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <CreditCard size={26} />
          </div>
        );
      }
      return (
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
          <ArrowDownLeft size={26} />
        </div>
      );
    }

    switch (iconType) {
      case 'bill':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <Receipt size={26} />
          </div>
        );
      case 'pix_out':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <ArrowUpRight size={26} />
          </div>
        );
      case 'cash':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <DollarSign size={26} />
          </div>
        );
      case 'tax':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <Percent size={24} />
          </div>
        );
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <Landmark size={26} />
          </div>
        );
    }
  };

  const isD1CarryOver = tx.isPastDate && (tx.target_date ? tx.target_date < currentDate : true);
  const matchedBill = tx.expenseMatch?.matchedBill;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes do Lançamento Bancário"
      size="lg"
    >
      <div className="space-y-6">
        {/* Hero Section Revolut Card Details */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          {renderLargeAvatar()}
          
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight break-words">
                {primaryName}
              </h3>
              {isD1CarryOver && (
                <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 bg-purple-500/10 border-purple-500/30 text-purple-300 font-medium">
                  D-1 (Lote Anterior)
                </Badge>
              )}
              {tx.osNum && (
                <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 bg-blue-500/10 border-blue-500/30 text-blue-300 font-medium font-mono">
                  OS #{tx.osNum}
                </Badge>
              )}
              {tx.isRede && (
                <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 bg-blue-500/10 border-blue-500/30 text-blue-300 font-medium">
                  Lote Rede
                </Badge>
              )}
            </div>

            <p className="text-xs text-zinc-400 mb-3 flex items-center justify-center sm:justify-start gap-1.5">
              <Clock size={12} className="text-zinc-500" />
              <span>{natureLabel}</span>
              <span className="text-zinc-600">•</span>
              <span>{tx.occurred_at ? new Date(tx.occurred_at).toLocaleString('pt-BR') : formatDateOnly(tx.target_date || currentDate)}</span>
            </p>

            {/* Valor em Grande Destaque Cromático */}
            <div className={`text-3xl font-mono font-extrabold tracking-tight ${isIn ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isIn ? '+ ' : '- '}{formatCurrency(amount)}
            </div>
          </div>
        </div>

        {/* Ficha Técnica & Auditoria Fiduciária (Grid de Metadados) */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            Auditoria & Ficha Fiduciária
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* FITID Oficial */}
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Identificador Bancário (FITID)
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-zinc-300 truncate" title={tx.fitid || '-'}>
                  {tx.fitid || 'Não registrado'}
                </span>
                {tx.fitid && (
                  <button
                    type="button"
                    onClick={() => handleCopy(tx.fitid, 'FITID')}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                    title="Copiar FITID"
                  >
                    {copiedField === 'FITID' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* Documento / CNPJ */}
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Documento / CNPJ
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-zinc-300">
                  {tx.cnpj_cpf || 'Não identificado'}
                </span>
                {tx.cnpj_cpf && (
                  <button
                    type="button"
                    onClick={() => handleCopy(tx.cnpj_cpf, 'CNPJ')}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                    title="Copiar CNPJ"
                  >
                    {copiedField === 'CNPJ' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* Conta de Despesa / Fornecedor Vinculado */}
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Fornecedor / Conta Vinculada
              </span>
              <span className="text-zinc-200 font-medium">
                {matchedBill?.recipient_name || matchedBill?.title || 'Sem vínculo direto de conta'}
              </span>
            </div>

            {/* Categoria Contábil */}
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Categoria Contábil
              </span>
              <span className="text-purple-300 font-medium">
                {tx.manual_category ? String(tx.manual_category).replace(/_/g, ' ') : 'Padrão Extrato Bancário'}
              </span>
            </div>

            {/* Justificativa do Lançamento */}
            {tx.manual_justification && (
              <div className="sm:col-span-2 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Justificativa Registrada
                </span>
                <p className="text-emerald-400 italic">
                  "{tx.manual_justification}"
                </p>
              </div>
            )}

            {/* Descrição Bruta no OFX */}
            <div className="sm:col-span-2 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                Histórico Bruto do Extrato (Memo / Subtitle)
              </span>
              <p className="font-mono text-[11px] text-zinc-400 break-words">
                {tx.subtitle || tx.title || tx.memo || 'Sem memo adicional'}
              </p>
            </div>
          </div>
        </div>

        {/* Painel de Ações Nobre e Espaçoso (Action Panel) */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Botão Mover para Hoje */}
            {isD1CarryOver && onMoveToToday && (
              <Button
                size="sm"
                variant="outline"
                disabled={isMoving}
                onClick={async () => {
                  await onMoveToToday(tx);
                  onClose();
                }}
                className="h-9 px-3.5 bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 gap-1.5 font-medium shadow-sm"
                title="Mover para a conciliação e faturamento de hoje"
              >
                {isMoving ? <LoadingSpinner size="sm" /> : <CalendarPlus size={14} className="text-purple-400" />}
                Mover para a Conciliação de Hoje
              </Button>
            )}

            {/* Botão Vincular OS */}
            {isIn && !tx.isRede && !tx.osNum && onLinkOs && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onLinkOs(tx);
                }}
                className="h-9 px-3.5 bg-zinc-900 border-zinc-700 text-blue-400 hover:bg-zinc-800 hover:text-blue-300 gap-1.5 font-medium shadow-sm"
                title="Vincular a uma Ordem de Serviço"
              >
                <Link2 size={14} />
                Vincular Ordem de Serviço
              </Button>
            )}

            {/* Botão Desvincular OS */}
            {tx.osNum && onUnlinkOs && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onUnlinkOs(tx.id, tx.osNum);
                  onClose();
                }}
                className="h-9 px-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1.5 font-medium"
                title="Desvincular OS"
              >
                <Unlink size={14} />
                Desvincular OS #{tx.osNum}
              </Button>
            )}

            {/* Botão Classificar / Justificar */}
            {!tx.osNum && onEditCategory && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onClose();
                  onEditCategory(tx);
                }}
                className="h-9 px-3 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 gap-1.5 font-medium border border-zinc-800"
                title="Editar categoria ou justificativa contábil"
              >
                <FileEdit size={14} />
                {tx.hasCategory ? 'Editar Categoria' : 'Justificar Lançamento'}
              </Button>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-9 px-4 text-zinc-400 hover:text-zinc-100 font-medium ml-auto"
          >
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
