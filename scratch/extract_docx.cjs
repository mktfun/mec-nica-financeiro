const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function readDocx(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    // Find zip entries in buffer or use node zip
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const docEntry = zipEntries.find(e => e.entryName === 'word/document.xml');
    if (docEntry) {
      const xml = docEntry.getData().toString('utf8');
      return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    }
  } catch (err) {
    return 'Error: ' + err.message;
  }
  return '';
}

console.log('Doc 1 text:', readDocx('C:\\Users\\admin\\Downloads\\LOCAL-AGENT-DOC-001_Arquitetura_Agente_Local.docx').substring(0, 2000));
console.log('---');
console.log('Doc 2 text:', readDocx('C:\\Users\\admin\\Downloads\\Resumo do Projeto automação.docx').substring(0, 2000));
