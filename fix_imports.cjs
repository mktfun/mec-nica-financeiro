const fs = require('fs');

const config = 'c:/Users/User/.gemini/antigravity/repos/teste/src/routes/configuracao-canais.tsx';
const prod = 'c:/Users/User/.gemini/antigravity/repos/teste/src/routes/producao-diaria.tsx';

let c1 = fs.readFileSync(config, 'utf8');
c1 = c1.replace('../integrations/supabase/client', '../lib/supabase')
       .replace('../components/useGlobalStore', '../store/useGlobalStore')
       .replace(/useGlobalStore\(state => state\.currentStore\)/g, 'useGlobalStore()')
       .replace(/currentStore\?\.id/g, 'activeStoreId')
       .replace(/currentStore\.id/g, 'activeStoreId')
       .replace(/currentStore/g, 'activeStoreId');
fs.writeFileSync(config, c1);

let c2 = fs.readFileSync(prod, 'utf8');
c2 = c2.replace('../integrations/supabase/client', '../lib/supabase')
       .replace('../components/useGlobalStore', '../store/useGlobalStore')
       .replace(/useGlobalStore\(state => state\.currentStore\)/g, 'useGlobalStore()')
       .replace(/currentStore\?\.id/g, 'activeStoreId')
       .replace(/currentStore\.id/g, 'activeStoreId')
       .replace(/currentStore/g, 'activeStoreId');
fs.writeFileSync(prod, c2);

console.log('Fixed imports in UI files');
