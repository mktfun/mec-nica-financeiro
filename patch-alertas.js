const fs = require('fs');
const file = 'src/routes/alertas.tsx';
let content = fs.readFileSync(file, 'utf8');

// The line endings could be \r\n
content = content.replace(
  /<div className="mb-8">\s*<h1 className="font-display font-bold text-3xl mb-2">Central de Alertas<\/h1>\s*<p className="text-\[var\(--text-secondary\)\] text-sm">Divergências pendentes que requerem sua atenção\.<\/p>\s*<\/div>/,
  '<div className="mb-8 relative">\n          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--color-accent-danger)]/20 blur-[80px] rounded-full pointer-events-none" />\n          <h1 className="font-display font-bold text-4xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 relative z-10">Central de Alertas</h1>\n          <p className="text-[var(--text-secondary)] text-sm relative z-10">Divergências pendentes que requerem sua atenção para manter o cofre seguro.</p>\n        </div>'
);

content = content.replace(/className=\{filter === 'all' \? 'bg-\[var\(--bg-surface-elevated\)\]' : 'text-\[var\(--text-secondary\)\]'\}/g,
"className={`transition-all duration-300 ${filter === 'all' ? 'bg-white/10 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] text-white' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}");

content = content.replace(/className=\{filter === 'critical' \? 'bg-\[var\(--bg-surface-elevated\)\] text-\[var\(--color-accent-danger\)\]' : 'text-\[var\(--color-accent-danger\)\] opacity-70'\}/g,
"className={`transition-all duration-300 ${filter === 'critical' ? 'bg-[var(--color-accent-danger)]/20 backdrop-blur-md border border-[var(--color-accent-danger)]/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] text-[var(--color-accent-danger)]' : 'text-[var(--color-accent-danger)] opacity-70 hover:bg-[var(--color-accent-danger)]/10'}`}");

content = content.replace(/className=\{filter === 'warning' \? 'bg-\[var\(--bg-surface-elevated\)\] text-\[var\(--color-accent-warning\)\]' : 'text-\[var\(--color-accent-warning\)\] opacity-70'\}/g,
"className={`transition-all duration-300 ${filter === 'warning' ? 'bg-[var(--color-accent-warning)]/20 backdrop-blur-md border border-[var(--color-accent-warning)]/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-[var(--color-accent-warning)]' : 'text-[var(--color-accent-warning)] opacity-70 hover:bg-[var(--color-accent-warning)]/10'}`}");

content = content.replace(/className=\{filter === 'resolved' \? 'bg-\[var\(--bg-surface-elevated\)\] text-\[var\(--text-primary\)\]' : 'text-\[var\(--text-secondary\)\] opacity-70'\}/g,
"className={`transition-all duration-300 ${filter === 'resolved' ? 'bg-white/5 backdrop-blur-md border border-white/10 text-white' : 'text-[var(--text-secondary)] opacity-70 hover:bg-white/5'}`}");

content = content.replace(
  /className=\{`p-5 border-l-4 \$\{\s*alert.resolved \? 'border-l-\[var\(--border-strong\)\] opacity-60' :\s*alert.severity === 'critical' \? 'border-l-\[var\(--color-accent-danger\)\]' : \s*alert.severity === 'warning' \? 'border-l-\[var\(--color-accent-warning\)\]' : \s*'border-l-\[var\(--color-accent-teal\)\]'\s*\}`\}/,
  "className={`p-5 backdrop-blur-xl bg-white/5 border border-white/10 border-l-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:translate-y-[-2px] transition-all duration-300 ${\n                    alert.resolved ? 'border-l-[var(--border-strong)] opacity-60' :\n                    alert.severity === 'critical' ? 'border-l-[var(--color-accent-danger)] shadow-[0_0_20px_rgba(239,68,68,0.15)]' : \n                    alert.severity === 'warning' ? 'border-l-[var(--color-accent-warning)] shadow-[0_0_20px_rgba(245,158,11,0.15)]' : \n                    'border-l-[var(--color-accent-teal)] shadow-[0_0_20px_rgba(20,184,166,0.15)]'\n                  }`}"
);

fs.writeFileSync(file, content);
