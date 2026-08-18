const fs = require('fs');

const file = 'c:/Users/User/.gemini/antigravity/repos/teste/src/routes/configuracoes.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert new inputs into the grid. We can put them right before the /* Rateio Fixo */
let newInputs = `
                {/* Custo Fixo Salão */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">C. Fixo Salão (R$)</label>
                  <input type="number" value={storeVars.custo_fixo_salao || 0} onBlur={e => handleUpdateField('custo_fixo_salao', parseFloat(e.target.value)||0)} onChange={e => handleStoreVarChange('custo_fixo_salao', parseFloat(e.target.value)||0)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                {/* Custo Fixo Delivery */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">C. Fixo Delivery (R$)</label>
                  <input type="number" value={storeVars.custo_fixo_delivery || 0} onBlur={e => handleUpdateField('custo_fixo_delivery', parseFloat(e.target.value)||0)} onChange={e => handleStoreVarChange('custo_fixo_delivery', parseFloat(e.target.value)||0)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                {/* Pedidos Mesa */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Pedidos Mês: Mesa</label>
                  <input type="number" value={storeVars.pedidos_mesa || 0} onBlur={e => handleUpdateField('pedidos_mesa', parseInt(e.target.value)||0)} onChange={e => handleStoreVarChange('pedidos_mesa', parseInt(e.target.value)||0)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                {/* Pedidos iFood */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Pedidos Mês: iFood</label>
                  <input type="number" value={storeVars.pedidos_ifood || 0} onBlur={e => handleUpdateField('pedidos_ifood', parseInt(e.target.value)||0)} onChange={e => handleStoreVarChange('pedidos_ifood', parseInt(e.target.value)||0)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                {/* Pedidos 99 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Pedidos Mês: App 99</label>
                  <input type="number" value={storeVars.pedidos_99 || 0} onBlur={e => handleUpdateField('pedidos_99', parseInt(e.target.value)||0)} onChange={e => handleStoreVarChange('pedidos_99', parseInt(e.target.value)||0)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                {/* Pedidos Keeta */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Pedidos Mês: Keeta</label>
                  <input type="number" value={storeVars.pedidos_keeta || 0} onBlur={e => handleUpdateField('pedidos_keeta', parseInt(e.target.value)||0)} onChange={e => handleStoreVarChange('pedidos_keeta', parseInt(e.target.value)||0)} className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
`;

content = content.replace('{/* Rateio Fixo */}', newInputs + '\n                {/* Rateio Fixo */}');

// Change label of 'Custo Fixo Mensal' to 'Custo Fixo Geral (R$)'
content = content.replace(/Custo Fixo Mensal \(R\$\)/g, 'Custo Fixo Geral (R$)');

fs.writeFileSync(file, content);
console.log('Updated configuracoes.tsx');
