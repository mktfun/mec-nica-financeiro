const fs = require('fs');

const file = 'c:/Users/User/.gemini/antigravity/repos/teste/src/routes/financeiro.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block to remove starts with 'const [custosPorCanal, setCustosPorCanal] = useState(null);'
// and ends after the 'fetchCustosCanal' function.
const startStr = 'const [custosPorCanal, setCustosPorCanal] = useState(null);';
const endStr = `} catch (e) {
      console.log('View de custos não encontrada (use o dashboard SQL para aplicá-la). Fallback para storeVars.');
    }
  }`;

let startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
  let endIndex = content.indexOf(endStr, startIndex);
  if (endIndex !== -1) {
    endIndex += endStr.length;
    content = content.substring(0, startIndex) + content.substring(endIndex);
  }
}

content = content.replace(/custosPorCanal=\{custosPorCanal\}/g, '');
content = content.replace(/, custosPorCanal/g, '');

fs.writeFileSync(file, content);
console.log('Cleaned up financeiro.tsx');
