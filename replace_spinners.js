import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The ugly SVG pattern to replace
const uglySpinnerRegex = /<svg className="animate-spin w-\d+ h-\d+ text-\[var\(--color-primary\)\]" viewBox="0 0 24 24" fill="none">\s*<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" \/>\s*<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" \/>\s*<\/svg>/g;

const replacement = '<LoadingSpinner size="sm" text="" />';

const srcDir = path.resolve(__dirname, 'src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = walk(srcDir);
let totalReplacements = 0;
const modifiedFiles = [];

for (const filePath of files) {
  const original = fs.readFileSync(filePath, 'utf-8');
  const replaced = original.replace(uglySpinnerRegex, replacement);
  
  if (replaced !== original) {
    // Check if import already exists
    let finalContent = replaced;
    if (!finalContent.includes("import { LoadingSpinner }") && !finalContent.includes("from \"@/components/ui/LoadingSpinner\"")) {
      // Add import after last import line
      const lines = finalContent.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIdx = i;
        }
      }
      if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, "import { LoadingSpinner } from '@/components/ui/LoadingSpinner';");
        finalContent = lines.join('\n');
      }
    }
    
    fs.writeFileSync(filePath, finalContent, 'utf-8');
    const count = (original.match(uglySpinnerRegex) || []).length;
    totalReplacements += count;
    modifiedFiles.push({ file: path.relative(srcDir, filePath), count });
  }
}

console.log(`Total replacements: ${totalReplacements}`);
console.log('Modified files:');
modifiedFiles.forEach(f => console.log(`  ${f.file} (${f.count} replacements)`));
