const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/User/.gemini/antigravity/repos/teste/src/routes';

const configuracaoCanaisContent = `import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useGlobalStore } from '../components/useGlobalStore';
import { Save, Plus } from 'lucide-react';

export const Route = createFileRoute('/configuracao-canais')({
  component: ConfiguracaoCanais
});

function ConfiguracaoCanais() {
  const currentStore = useGlobalStore(state => state.currentStore);
  const [canais, setCanais] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentStore?.id) {
      loadData();
    }
  }, [currentStore?.id]);

  async function loadData() {
    setLoading(true);
    // Fetch canais
    const { data: canaisData } = await supabase.from('canais').select('*');
    if (canaisData) setCanais(canaisData);

    // Fetch configs for this store
    const { data: configsData } = await supabase
      .from('config_canal_restaurante')
      .select('*')
      .eq('store_id', currentStore.id)
      .is('vigente_ate', null);
    
    if (configsData) setConfigs(configsData);
    setLoading(false);
  }

  const handleChange = (canalId, field, value) => {
    setConfigs(prev => {
      const existing = prev.find(c => c.canal_id === canalId);
      if (existing) {
        return prev.map(c => c.canal_id === canalId ? { ...c, [field]: value } : c);
      } else {
        return [...prev, { canal_id: canalId, store_id: currentStore.id, [field]: value }];
      }
    });
  };

  const handleSave = async () => {
    for (const config of configs) {
      await supabase
        .from('config_canal_restaurante')
        .upsert({
          store_id: currentStore.id,
          canal_id: config.canal_id,
          comissao_percentual: config.comissao_percentual || 0,
          taxa_pagamento_online_percentual: config.taxa_pagamento_online_percentual || 0,
          mensalidade_fixa: config.mensalidade_fixa || 0,
          vigente_desde: new Date().toISOString().split('T')[0]
        }, { onConflict: 'store_id,canal_id,vigente_desde' });
    }
    alert('Configurações salvas!');
  };

  if (loading) return <div className="p-6 text-white">Carregando...</div>;

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-emerald-400">Configuração de Canais</h1>
        <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded flex items-center gap-2">
          <Save size={18} /> Salvar Configurações
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="p-3">Canal</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Comissão App (%)</th>
              <th className="p-3">Taxa Pag. Online (%)</th>
              <th className="p-3">Mensalidade Fixa (R$)</th>
            </tr>
          </thead>
          <tbody>
            {canais.map(canal => {
              const config = configs.find(c => c.canal_id === canal.id) || {};
              return (
                <tr key={canal.id} className="border-t border-zinc-800/50">
                  <td className="p-3 font-semibold">{canal.nome}</td>
                  <td className="p-3 text-zinc-500 capitalize">{canal.tipo}</td>
                  <td className="p-3">
                    <input 
                      type="number" step="0.1"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-24 text-white"
                      value={config.comissao_percentual || ''}
                      onChange={e => handleChange(canal.id, 'comissao_percentual', e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="number" step="0.1"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-24 text-white"
                      value={config.taxa_pagamento_online_percentual || ''}
                      onChange={e => handleChange(canal.id, 'taxa_pagamento_online_percentual', e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="number" step="1"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-32 text-white"
                      value={config.mensalidade_fixa || ''}
                      onChange={e => handleChange(canal.id, 'mensalidade_fixa', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

const producaoDiariaContent = `import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useGlobalStore } from '../components/useGlobalStore';
import { Save } from 'lucide-react';

export const Route = createFileRoute('/producao-diaria')({
  component: ProducaoDiaria
});

function ProducaoDiaria() {
  const currentStore = useGlobalStore(state => state.currentStore);
  const [dataAtual, setDataAtual] = useState(new Date().toISOString().split('T')[0]);
  const [canais, setCanais] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentStore?.id) {
      loadCanaisEDados();
    }
  }, [currentStore?.id, dataAtual]);

  async function loadCanaisEDados() {
    setLoading(true);
    const { data: canaisData } = await supabase.from('canais').select('*');
    if (canaisData) setCanais(canaisData);

    const { data: faturamentoData } = await supabase
      .from('faturamento_diario')
      .select('*')
      .eq('store_id', currentStore.id)
      .eq('data', dataAtual);
    
    if (faturamentoData) setLancamentos(faturamentoData);
    setLoading(false);
  }

  const handleChange = (canalId, field, value) => {
    setLancamentos(prev => {
      const existing = prev.find(l => l.canal_id === canalId);
      if (existing) {
        return prev.map(l => l.canal_id === canalId ? { ...l, [field]: value } : l);
      } else {
        return [...prev, { canal_id: canalId, store_id: currentStore.id, data: dataAtual, [field]: value }];
      }
    });
  };

  const handleSave = async () => {
    for (const lanc of lancamentos) {
      if (!lanc.faturamento_bruto && !lanc.quantidade_pedidos) continue;
      await supabase
        .from('faturamento_diario')
        .upsert({
          store_id: currentStore.id,
          canal_id: lanc.canal_id,
          data: dataAtual,
          faturamento_bruto: lanc.faturamento_bruto || 0,
          quantidade_pedidos: lanc.quantidade_pedidos || 0
        }, { onConflict: 'store_id,canal_id,data' });
    }
    alert('Produção salva com sucesso!');
  };

  if (loading) return <div className="p-6 text-white">Carregando...</div>;

  return (
    <div className="p-6 text-white max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Lançamento de Produção Diária</h1>
          <p className="text-zinc-400 text-sm mt-1">Informe as vendas brutas e o número de pedidos por aplicativo/canal.</p>
        </div>
        <div className="flex gap-4 items-center">
          <input 
            type="date" 
            className="bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded"
            value={dataAtual}
            onChange={e => setDataAtual(e.target.value)}
          />
          <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded flex items-center gap-2">
            <Save size={18} /> Salvar Dia
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="p-3">Canal</th>
              <th className="p-3">Faturamento Bruto (R$)</th>
              <th className="p-3">Qtd. Pedidos</th>
              <th className="p-3 text-right">Ticket Médio</th>
            </tr>
          </thead>
          <tbody>
            {canais.map(canal => {
              const lanc = lancamentos.find(l => l.canal_id === canal.id) || {};
              const ticketMedio = (lanc.quantidade_pedidos > 0) ? (lanc.faturamento_bruto / lanc.quantidade_pedidos) : 0;
              return (
                <tr key={canal.id} className="border-t border-zinc-800/50">
                  <td className="p-3 font-semibold">{canal.nome} <span className="text-xs text-zinc-500 ml-2">({canal.tipo})</span></td>
                  <td className="p-3">
                    <input 
                      type="number" step="0.01"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-32 text-white"
                      value={lanc.faturamento_bruto || ''}
                      onChange={e => handleChange(canal.id, 'faturamento_bruto', e.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="number" step="1"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 w-24 text-white"
                      value={lanc.quantidade_pedidos || ''}
                      onChange={e => handleChange(canal.id, 'quantidade_pedidos', e.target.value)}
                    />
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400">
                    R$ {ticketMedio.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(baseDir, 'configuracao-canais.tsx'), configuracaoCanaisContent);
fs.writeFileSync(path.join(baseDir, 'producao-diaria.tsx'), producaoDiariaContent);
console.log('Routes created successfully.');
