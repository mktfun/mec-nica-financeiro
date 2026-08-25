const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function buildPdf() {
  console.log('Compilando Documento Mestre em PDF...');
  const mdPath = path.join(__dirname, '..', 'docs', 'MANUAL_CONSOLIDADO_CONCILIACAO_E_RECEBIVEIS.md');
  const mdText = fs.readFileSync(mdPath, 'utf8');

  // Markdown parsing simples e robusto para HTML
  const lines = mdText.split('\n');
  let html = [];
  let inCodeBlock = false;
  let inTable = false;

  for (let line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push('</pre></div>');
        inCodeBlock = false;
      } else {
        const lang = line.replace('```', '').trim() || 'text';
        html.push(`<div class="code-box"><div class="code-header">${lang}</div><pre>`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    // Tabelas
    if (line.includes('|')) {
      if (line.includes('---')) continue;
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) {
        html.push('<table><thead><tr>');
        cells.forEach(c => html.push(`<th>${c}</th>`));
        html.push('</tr></thead><tbody>');
        inTable = true;
      } else {
        html.push('<tr>');
        cells.forEach(c => html.push(`<td>${c}</td>`));
        html.push('</tr>');
      }
      continue;
    } else if (inTable) {
      html.push('</tbody></table>');
      inTable = false;
    }

    if (line.startsWith('# ')) {
      html.push(`<h1>${line.replace('# ', '')}</h1>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${line.replace('## ', '')}</h2>`);
    } else if (line.startsWith('### ')) {
      html.push(`<h3>${line.replace('### ', '')}</h3>`);
    } else if (line.startsWith('#### ')) {
      html.push(`<h4>${line.replace('#### ', '')}</h4>`);
    } else if (line.startsWith('> ')) {
      html.push(`<blockquote>${line.replace('> ', '')}</blockquote>`);
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      html.push(`<li>${line.replace(/^[\*\-]\s+/, '')}</li>`);
    } else if (line.trim().length > 0) {
      let p = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      html.push(`<p>${p}</p>`);
    }
  }

  if (inTable) html.push('</tbody></table>');
  if (inCodeBlock) html.push('</pre></div>');

  const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual Mestre de Conciliação Contábil & Recebíveis</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    
    @page {
      size: A4;
      margin: 15mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 9pt;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-size: 18pt;
      color: #0284c7;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 12px;
      page-break-after: avoid;
    }

    h2 {
      font-size: 12pt;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 10.5pt;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    h4 {
      font-size: 9.5pt;
      color: #334155;
      margin-top: 10px;
      margin-bottom: 4px;
    }

    p {
      margin: 4px 0 8px 0;
    }

    blockquote {
      background: #f0fdf4;
      border-left: 4px solid #22c55e;
      margin: 8px 0;
      padding: 8px 12px;
      font-size: 8.5pt;
      color: #166534;
      border-radius: 0 4px 4px 0;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 8pt;
    }

    .code-box {
      background: #0f172a;
      border-radius: 6px;
      margin: 10px 0;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .code-header {
      background: #1e293b;
      color: #94a3b8;
      font-size: 7.5pt;
      font-family: 'JetBrains Mono', monospace;
      padding: 4px 10px;
      text-transform: uppercase;
    }

    pre {
      margin: 0;
      padding: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      color: #f8fafc;
      line-height: 1.4;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
    }

    th {
      background: #f8fafc;
      font-weight: 600;
      color: #1e293b;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    li {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>
  ${html.join('\n')}
</body>
</html>
  `;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle' });
  const pdfOut = path.join(__dirname, '..', 'docs', 'MANUAL_CONSOLIDADO_CONCILIACAO_E_RECEBIVEIS.pdf');
  await page.pdf({ 
    path: pdfOut, 
    format: 'A4', 
    margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' }, 
    printBackground: true 
  });
  await browser.close();
  console.log('PDF gerado com sucesso em:', pdfOut);
}

buildPdf().catch(err => {
  console.error('Erro na geração do PDF:', err);
});
