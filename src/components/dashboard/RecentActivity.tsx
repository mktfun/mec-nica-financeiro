import { motion } from "framer-motion";
import { usePatioOS } from "@/hooks/usePatio";
import { useStores } from "@/hooks/useStores";
import { Clock, TrendingUp, AlertCircle, DollarSign, Calendar } from "lucide-react";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Badge } from "../ui/Badge";
import { Link } from "@tanstack/react-router";
import { Card } from "../ui/Card";
import { useMemo } from "react";

export function RecentActivity({ monthStr }: { monthStr: string }) {
  // Passamos sem filtro de data pro banco pra garantir que pegamos as em_aberto velhas
  const { data: allOs = [], isLoading: loadingOs } = usePatioOS();
  const { data: stores = [] } = useStores();

  const { maiores, atrasadas } = useMemo(() => {
    const [year, month] = monthStr.split('-');
    
    // Filtrar as do mês selecionado (para maiores OSs)
    // Filtrar as do mês selecionado (para maiores OSs)
    const osDoMes = allOs.filter(os => {
      if (!os.opened_at) return false;
      const osDate = new Date(os.opened_at);
      return osDate.getFullYear() === parseInt(year) && (osDate.getMonth() + 1) === parseInt(month);
    });

    // Top 3 maiores do mês
    const topMaiores = [...osDoMes]
      .sort((a, b) => Number(b.total_value || 0) - Number(a.total_value || 0))
      .slice(0, 3);

    // Top 3 mais atrasadas (em_aberto ou pago_parcial) indepentente se foram criadas neste mês ou antes
    // O usuário quer "as que ta mais tempo parado sem pagar"
    const topAtrasadas = allOs
      .filter(os => os.status === 'em_aberto' || os.status === 'pago_parcial')
      .sort((a, b) => {
        // Ordenar pela data de abertura mais antiga (mais tempo parado) ou por days_open
        return (b.days_open || 0) - (a.days_open || 0);
      })
      .slice(0, 3);

    return { maiores: topMaiores, atrasadas: topAtrasadas };
  }, [allOs, monthStr]);

  if (loadingOs) {
    return <div className="mb-12 h-64 animate-pulse bg-[var(--bg-surface-hover)] rounded-[var(--radius-lg)]"></div>;
  }

  const renderOsItem = (os: any, idx: number, type: 'maior' | 'atrasada') => {
    const storeName = stores.find(s => s.id === os.store_id)?.name || os.store_id;
    const date = new Date(os.opened_at || new Date()).toLocaleDateString('pt-BR');
    const isMaior = type === 'maior';

    return (
      <motion.div
        key={os.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--bg-surface-hover)] transition-all cursor-default"
      >
        <div className="flex items-start gap-4">
          <div className={`mt-1 sm:mt-0 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isMaior ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]'
          }`}>
            {isMaior ? <TrendingUp size={18} /> : <AlertCircle size={18} />}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[var(--text-primary)] text-sm">
                OS #{os.os_number}
              </h4>
              <Badge variant={os.status === 'em_aberto' ? 'danger' : os.status === 'pago_parcial' ? 'warning' : 'success'} className="text-[9px]">
                {os.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--text-tertiary)] font-medium">
              <span className="text-[var(--text-secondary)]">{storeName?.replace('Loja ', '')}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Calendar size={10}/> {date}</span>
            </div>
            {!isMaior && (
              <div className="text-[10px] text-[var(--color-accent-danger)] mt-1 opacity-80">
                Parada há {os.days_open || 0} dias
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:items-end mt-3 sm:mt-0 ml-14 sm:ml-0">
          <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Valor Total</div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
            <AnimatedNumber value={Number(os.total_value || 0)} format="currency" />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className="mb-12 p-0 overflow-hidden bg-transparent border-0">
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="font-display font-semibold text-xl flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--color-primary)]" />
          Insights do Pátio
        </h2>
        <Link to="/patio" className="text-[var(--color-primary)] font-medium text-sm hover:underline flex items-center bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-full transition-colors hover:bg-[var(--color-primary)]/20">
          Ver pátio completo
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maiores OSs */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign size={14} className="text-[var(--color-success)]" />
            Top 3 Maiores OSs
          </h3>
          <div className="flex flex-col gap-2">
            {maiores.length === 0 ? (
              <div className="text-center p-6 text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-xl text-sm">
                Nenhuma OS no mês
              </div>
            ) : maiores.map((os, i) => renderOsItem(os, i, 'maior'))}
          </div>
        </div>

        {/* OSs Atrasadas */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} className="text-[var(--color-accent-danger)]" />
            Top 3 Mais Atrasadas
          </h3>
          <div className="flex flex-col gap-2">
            {atrasadas.length === 0 ? (
              <div className="text-center p-6 text-[var(--color-success)] border border-dashed border-[var(--color-success)]/30 bg-[var(--color-success)]/5 rounded-xl text-sm">
                Nenhuma OS em atraso! 🎉
              </div>
            ) : atrasadas.map((os, i) => renderOsItem(os, i, 'atrasada'))}
          </div>
        </div>
      </div>
    </Card>
  );
}
