const fs = require('fs');
const path = require('path');

const file = 'c:/Users/User/.gemini/antigravity/repos/teste/src/routes/financeiro.tsx';
let content = fs.readFileSync(file, 'utf8');

// We need to inject the fetch for the new view 'vw_custo_unitario_por_canal'
// And update the calculation of 'valorCustoFixo'

let newFetchHook = `
  const [custosPorCanal, setCustosPorCanal] = useState(null);

  useEffect(() => {
    if (currentStore?.id) {
      fetchCustosCanal();
    }
  }, [currentStore?.id]);

  async function fetchCustosCanal() {
    try {
      const { data, error } = await supabase
        .from('vw_custo_unitario_por_canal')
        .select('*')
        .eq('store_id', currentStore.id)
        .single();
      
      if (!error && data) {
        setCustosPorCanal(data);
      }
    } catch (e) {
      console.log('View de custos não encontrada (use o dashboard SQL para aplicá-la). Fallback para storeVars.');
    }
  }
`;

// Insert the new hook states
if (!content.includes('custosPorCanal')) {
  content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n' + newFetchHook);
}

// In ProductPricingRow, we need to pass custosPorCanal
content = content.replace(/function ProductPricingRow\(\{\s*p,\s*storeVars,/g, 'function ProductPricingRow({ p, storeVars, custosPorCanal,');
content = content.replace(/<ProductPricingRow\s*key=\{p\.id\}\s*p=\{p\}\s*storeVars=\{storeVars\}/g, '<ProductPricingRow key={p.id} p={p} storeVars={storeVars} custosPorCanal={custosPorCanal}');

// Change how 'valorCustoFixo' is calculated
// Previously: const valorCustoFixo = numPrice > 0 ? numPrice * rateioFixoPercent : 0;
// Now we use the dynamic cost unit if available, else fallback
let newCalculation = `
  // Multi-canal Custo Fixo calculation
  let valorCustoFixo = numPrice > 0 ? numPrice * rateioFixoPercent : 0;
  let valorCustoFixoDelivery = valorCustoFixo;

  if (custosPorCanal) {
    valorCustoFixo = custosPorCanal.cf_unitario_salao || 0;
    valorCustoFixoDelivery = custosPorCanal.cf_unitario_delivery || 0;
  }
`;

content = content.replace(/const valorCustoFixo = numPrice > 0 \? numPrice \* rateioFixoPercent : 0;/g, newCalculation);

// Change lucros
content = content.replace(/const despIfood = numIfood \* \(imposto \+ ifood \+ rateioFixoPercent\);/g, 'const despIfood = (numIfood * (imposto + ifood)) + valorCustoFixoDelivery;');
content = content.replace(/const desp99 = num99 \* \(imposto \+ taxa99 \+ rateioFixoPercent\);/g, 'const desp99 = (num99 * (imposto + taxa99)) + valorCustoFixoDelivery;');
content = content.replace(/const despKeeta = numKeeta \* \(imposto \+ keeta \+ rateioFixoPercent\);/g, 'const despKeeta = (numKeeta * (imposto + keeta)) + valorCustoFixoDelivery;');

// Mesa is tricky because its calculation wasn't explicitly using despMesa.
// Let's replace the formulaTooltip to show the new math if custosPorCanal exists
content = content.replace(/const formulaTooltip = \`Fórmula Base/g, 'const formulaTooltip = custosPorCanal ? `Fórmula Avançada: CMV+Emb + CF Unit. Salão (R$${custosPorCanal.cf_unitario_salao.toFixed(2)}) + (Imp+Maq+Lucro)%` : `Fórmula Base');

fs.writeFileSync(file, content);
console.log('Updated financeiro.tsx');
