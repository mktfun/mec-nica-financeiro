const fs = require('fs');
const path = require('path');

const roundDir = process.argv[2];
const memoryFile = process.argv[3] || '.council/shared_memory.json';

if (!roundDir) {
  console.error('Uso: node merge_memory.cjs <round_dir> [memory_file]');
  process.exit(1);
}

let memory = { topic: 'TBD', rounds: [] };
if (fs.existsSync(memoryFile)) {
  memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
}

const roundNumber = memory.rounds.length + 1;
const roundData = { round: roundNumber, messages: [] };

if (fs.existsSync(roundDir)) {
  const files = fs.readdirSync(roundDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const agentName = file.split('_')[0];
    const content = fs.readFileSync(path.join(roundDir, file), 'utf8');
    roundData.messages.push({
      agent: agentName,
      content: content
    });
  }
}

memory.rounds.push(roundData);
fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2), 'utf8');
console.log(`Memory merged successfully for Round ${roundNumber} from ${roundDir}`);
