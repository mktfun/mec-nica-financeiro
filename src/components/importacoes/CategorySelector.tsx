import { motion } from 'framer-motion';
import { FileText, CreditCard, Building2, Wallet, Percent, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'OFX', title: 'Extrato Bancário (OFX)', icon: FileText, desc: 'Importe extratos do banco para conciliação automática.', color: 'var(--color-accent-teal)' },
  { id: 'MAQUININHA', title: 'Maquininha (XLSX)', icon: CreditCard, desc: 'Fechamento de recebíveis das adquirentes.', color: 'var(--color-primary)' },
  { id: 'PATIO', title: 'Pátio / OS', icon: Building2, desc: 'Gestão de ordens de serviço e veículos.', color: '#EAB308' },
  { id: 'DESPESAS', title: 'Despesas / Contas', icon: Wallet, desc: 'Lançamentos de contas a pagar e despesas.', color: 'var(--color-accent-danger)' },
  { id: 'JUROS', title: 'Juros Rede', icon: Percent, desc: 'Planilha de juros descontados pela adquirente.', color: 'var(--color-success)' }
];

interface CategorySelectorProps {
  onSelect: (id: string) => void;
}

export function CategorySelector({ onSelect }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect(cat.id)}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-500 hover:border-white/30 hover:bg-white/10"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            <div 
              className="absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40" 
              style={{ backgroundColor: cat.color }} 
            />
            
            <div className="relative z-10 flex flex-col h-full">
              <div 
                className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${cat.color} 20%, transparent)` }}
              >
                <Icon size={32} style={{ color: cat.color }} />
              </div>
              
              <h3 className="mb-2 font-display text-2xl font-bold text-white tracking-tight">
                {cat.title}
              </h3>
              
              <p className="mb-6 flex-1 text-sm text-[var(--text-secondary)]">
                {cat.desc}
              </p>
              
              <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors group-hover:text-white">
                <span style={{ color: cat.color }}>Iniciar Importação</span>
                <ChevronRight size={16} style={{ color: cat.color }} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
