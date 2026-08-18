const fs = require('fs');
const file = 'c:/Users/User/.gemini/antigravity/repos/teste/src/routes/financeiro.tsx';
let content = fs.readFileSync(file, 'utf8');

// The line we want to replace is:
// const valorCustoFixo = numPrice > 0 ? (numPrice * rateioFixoPercent) : (numPrecoDefinido * rateioFixoPercent);

let newCalculation = `
  // NOVA REGRA DE RATEIO MULTI-CANAL (Spec 200)
  const pedidosDelivery = (storeVars.pedidos_ifood || 0) + (storeVars.pedidos_99 || 0) + (storeVars.pedidos_keeta || 0);
  const pedidosMesa = storeVars.pedidos_mesa || 0;
  const pedidosTotal = pedidosMesa + pedidosDelivery;

  let valorCustoFixoSalao = 0;
  let valorCustoFixoDelivery = 0;

  if (pedidosTotal > 0) {
    const pctSalao = pedidosMesa / pedidosTotal;
    const pctDelivery = pedidosDelivery / pedidosTotal;
    
    const cfGeral = storeVars.custo_fixo_mensal || 0;
    
    const cfTotalSalao = (cfGeral * pctSalao) + (storeVars.custo_fixo_salao || 0);
    const cfTotalDelivery = (cfGeral * pctDelivery) + (storeVars.custo_fixo_delivery || 0);

    valorCustoFixoSalao = pedidosMesa > 0 ? (cfTotalSalao / pedidosMesa) : 0;
    valorCustoFixoDelivery = pedidosDelivery > 0 ? (cfTotalDelivery / pedidosDelivery) : 0;
  } else {
    // Fallback: usar regra baseada em % caso não tenha preenchido
    valorCustoFixoSalao = numPrice > 0 ? (numPrice * rateioFixoPercent) : (numPrecoDefinido * rateioFixoPercent);
    valorCustoFixoDelivery = valorCustoFixoSalao;
  }

  const valorCustoFixo = valorCustoFixoSalao;
`;

// It might be repeated in two places (one for calculation, one for excel). Let's replace globally.
content = content.replace(/const valorCustoFixo = numPrice > 0 \? \(numPrice \* rateioFixoPercent\) : \(numPrecoDefinido \* rateioFixoPercent\);/g, newCalculation);

fs.writeFileSync(file, content);
console.log('Updated financeiro.tsx');
